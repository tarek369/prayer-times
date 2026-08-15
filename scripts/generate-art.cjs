/**
 * Artwork generator for Prayer Estonia.
 *
 * Rasterizes the brand mark — a crescent moon with a four-point sparkle star —
 * with 2× supersampling, anti-aliasing, and a soft glow. No image dependencies:
 * PNGs are encoded by hand (zlib only).
 *
 * Outputs (assets/images/):
 *   splash-icon.png            1024 transparent — crescent + star for the dark splash
 *   icon.png                   1024 opaque — iOS app icon (gradient bg + glow)
 *   android-icon-foreground.png 1024 transparent — adaptive icon foreground (safe zone)
 *   android-icon-monochrome.png 1024 transparent — white mark for themed icons
 *   android-icon-background.png 1024 opaque — subtle vertical gradient
 *   favicon.png                48 opaque — small dark tile + mark
 *
 * Run: node scripts/generate-art.cjs
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

/* ------------------------- tiny PNG encoder ------------------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function writePng(file, w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

/* ------------------------- raster helpers ------------------------- */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (d, aa) => clamp01(0.5 - d / aa); // coverage from signed distance

/** Crescent signed distance: inside big circle AND outside the cutting circle. */
function crescentSdf(x, y, cx1, cy1, r1, cx2, cy2, r2) {
  const d1 = Math.hypot(x - cx1, y - cy1) - r1;
  const d2 = Math.hypot(x - cx2, y - cy2) - r2;
  return Math.max(d1, -d2);
}

/** Four-point sparkle star with a solid core: r(θ) = R·(core + (1−core)·|cos 2θ|^k). */
function starSdf(x, y, cx, cy, R, k = 0.9) {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  const theta = Math.atan2(dy, dx);
  const spike = Math.pow(Math.max(Math.abs(Math.cos(2 * theta)), 0), k);
  const r = R * (0.3 + 0.7 * spike);
  return dist - r;
}

/** Linear gradient between two rgb triples. */
function lerpRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/* ------------------------- brand mark painter ------------------------- */

const WHITE = [234, 240, 246]; // soft white crescent
const GOLD = [251, 191, 36]; // star
const BG_TOP = [10, 14, 19]; // #0A0E13
const BG_BOT = [22, 32, 43]; // #16202B

/**
 * Paint the mark into an RGBA canvas (size×size), geometry scaled by `scale`
 * around the center. Returns Buffer.
 * Options: { star: [r,g,b] | null, moon: [r,g,b] | null, glow: bool }
 */
function paintMark(size, scale, opts) {
  const S = 2; // supersample factor
  const W = size * S;
  const out = Buffer.alloc(size * size * 4);
  const tmp = new Float32Array(size * size * 4);

  const c = size / 2;
  // Base geometry in 1024-space (then scaled + recentred).
  const g = (v) => c + (v - 512) * scale;
  const cx1 = g(430), cy1 = c, r1 = 320 * scale;
  const cx2 = g(575), cy2 = c, r2 = 280 * scale;
  const star1 = { x: g(700), y: g(330), R: 95 * scale };
  const star2 = { x: g(760), y: g(560), R: 42 * scale };
  const aa = 1.4 * S;

  const acc = new Float32Array(size * size * 4);
  for (let sy = 0; sy < W; sy++) {
    const oy = Math.floor(sy / S);
    for (let sx = 0; sx < W; sx++) {
      const ox = Math.floor(sx / S);
      const x = sx / S;
      const y = sy / S;
      let cr = 0, cg = 0, cb = 0, ca = 0;

      if (opts.glow) {
        const gd = Math.hypot(x - g(500), y - c) / (330 * scale);
        const glowA = clamp01(1 - gd) * 0.10;
        if (glowA > 0) { cr = WHITE[0] * glowA; cg = WHITE[1] * glowA; cb = WHITE[2] * glowA; ca = glowA; }
      }
      if (opts.moon) {
        const cov = smooth(crescentSdf(x, y, cx1, cy1, r1, cx2, cy2, r2), aa);
        if (cov > 0) {
          cr = opts.moon[0] * cov + cr * (1 - cov);
          cg = opts.moon[1] * cov + cg * (1 - cov);
          cb = opts.moon[2] * cov + cb * (1 - cov);
          ca = cov + ca * (1 - cov);
        }
      }
      if (opts.star) {
        for (const st of [star1, star2]) {
          const cov = smooth(starSdf(x, y, st.x, st.y, st.R), aa);
          if (cov > 0) {
            cr = opts.star[0] * cov + cr * (1 - cov);
            cg = opts.star[1] * cov + cg * (1 - cov);
            cb = opts.star[2] * cov + cb * (1 - cov);
            ca = cov + ca * (1 - cov);
          }
        }
      }
      const o = (oy * size + ox) * 4;
      acc[o] += cr; acc[o + 1] += cg; acc[o + 2] += cb; acc[o + 3] += ca;
    }
  }
  const SS = S * S;
  for (let i = 0; i < size * size; i++) {
    // acc holds PREMULTIPLIED color (0..255 × coverage) and coverage (0..1) in alpha.
    const a = acc[i * 4 + 3] / SS; // straight coverage 0..1
    out[i * 4 + 3] = Math.round(a * 255);
    if (a > 0.0001) {
      out[i * 4] = Math.round(clamp01(acc[i * 4] / SS / a / 255) * 255);
      out[i * 4 + 1] = Math.round(clamp01(acc[i * 4 + 1] / SS / a / 255) * 255);
      out[i * 4 + 2] = Math.round(clamp01(acc[i * 4 + 2] / SS / a / 255) * 255);
    } else {
      out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = 0;
    }
  }
  return out;
}

/** Opaque background canvas (vertical gradient + optional radial lift), mark on top. */
function composeIcon(size, scale, withGlow) {
  const out = Buffer.alloc(size * size * 4);
  const mark = paintMark(size, scale, { moon: WHITE, star: GOLD, glow: withGlow });
  for (let y = 0; y < size; y++) {
    const [br, bg2, bb] = lerpRgb(BG_TOP, BG_BOT, y / (size - 1));
    for (let x = 0; x < size; x++) {
      // subtle radial lift toward the mark
      const d = Math.hypot(x - size * 0.46, y - size * 0.5) / (size * 0.55);
      const lift = clamp01(1 - d) * 0.06;
      const o = (y * size + x) * 4;
      let r = br + (255 - br) * lift;
      let g = bg2 + (255 - bg2) * lift;
      let b = bb + (255 - bb) * lift;
      const ma = mark[o + 3] / 255;
      r = mark[o] * ma + r * (1 - ma);
      g = mark[o + 1] * ma + g * (1 - ma);
      b = mark[o + 2] * ma + b * (1 - ma);
      out[o] = Math.round(clamp01(r / 255) * 255);
      out[o + 1] = Math.round(clamp01(g / 255) * 255);
      out[o + 2] = Math.round(clamp01(b / 255) * 255);
      out[o + 3] = 255;
    }
  }
  return out;
}

/** Plain gradient background tile (adaptive icon background layer). */
function gradientTile(size) {
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const [r, g, b] = lerpRgb(BG_TOP, BG_BOT, y / (size - 1));
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
    }
  }
  return out;
}

/** Downsample an RGBA canvas by an integer factor (box filter). */
function downsample(src, size, factor) {
  const outSize = size / factor;
  const out = Buffer.alloc(outSize * outSize * 4);
  for (let y = 0; y < outSize; y++) {
    for (let x = 0; x < outSize; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const o = ((y * factor + dy) * size + x * factor + dx) * 4;
          r += src[o]; g += src[o + 1]; b += src[o + 2]; a += src[o + 3];
        }
      }
      const n = factor * factor;
      const o = (y * outSize + x) * 4;
      out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n); out[o + 3] = Math.round(a / n);
    }
  }
  return { data: out, size: outSize };
}

/* ------------------------- produce all assets ------------------------- */

const dir = path.join(__dirname, "..", "assets", "images");
fs.mkdirSync(dir, { recursive: true });

// Splash: transparent mark, generous size (no glow bg — splash bg is the flat color).
writePng(path.join(dir, "splash-icon.png"), 1024, 1024, paintMark(1024, 1.15, { moon: WHITE, star: GOLD, glow: true }));

// iOS app icon: full-bleed dark gradient + mark.
writePng(path.join(dir, "icon.png"), 1024, 1024, composeIcon(1024, 0.78, true));

// Adaptive foreground: mark only, scaled into the ~60% safe zone.
writePng(path.join(dir, "android-icon-foreground.png"), 1024, 1024, paintMark(1024, 0.58, { moon: WHITE, star: GOLD, glow: false }));

// Monochrome: white mark (themed icons tint it).
writePng(path.join(dir, "android-icon-monochrome.png"), 1024, 1024, paintMark(1024, 0.58, { moon: [255, 255, 255], star: [255, 255, 255], glow: false }));

// Adaptive background: gradient tile.
writePng(path.join(dir, "android-icon-background.png"), 1024, 1024, gradientTile(1024));

// Favicon: 48px icon tile.
const big = composeIcon(384, 0.8, false);
const fav = downsample(big, 384, 8);
writePng(path.join(dir, "favicon.png"), fav.size, fav.size, fav.data);

console.log("✓ artwork generated in", dir);
for (const f of fs.readdirSync(dir)) {
  console.log("  ", f, (fs.statSync(path.join(dir, f)).size / 1024).toFixed(1) + " KB");
}

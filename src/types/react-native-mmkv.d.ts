/**
 * Ambient type declaration for react-native-mmkv, which is an OPTIONAL dependency
 * (used only to share the iOS widget snapshot via App Group storage). It is imported
 * dynamically so the app runs fine without it; this stub lets tsc pass when the package
 * is absent. Install it (`npx expo install react-native-mmkv`) to enable the iOS widget.
 */

declare module "react-native-mmkv" {
  export interface MMKVOptions {
    id?: string;
    encryptionKey?: string | undefined;
  }
  export class MMKV {
    constructor(options?: MMKVOptions);
    set(value: string, key: string): void;
    getString(key: string): string | undefined;
    delete(key: string): void;
    contains(key: string): boolean;
    getAllKeys(): string[];
  }
}

package org.eestiislam.prayerestonia

import android.content.Context
import android.app.NotificationManager
import android.media.AudioManager
import com.facebook.react.bridge.*

/**
 * Native module that controls the device ringer mode, used by the "auto-silence at
 * adhan" feature on Android. Requires Do-Not-Disturb / Notification Policy access
 * (android.permission.ACCESS_NOTIFICATION_POLICY), which must be granted by the user
 * via system settings — see SilenceController.requestDndAccess().
 *
 * Exposed to JS as NativeModules.RingerSilencer with methods:
 *   - silent(mode: "vibrate" | "silent"): Promise<void>
 *   - restore(): Promise<void>            // restores the previous ringer mode
 *   - hasDndAccess(): Promise<boolean>
 *
 * NOTE: iOS has no equivalent; the ringer cannot be changed by apps. iOS uses a
 * user-enabled Do-Not-Disturb Focus instead (documented in Settings screen).
 */
class RingerSilencerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var savedRingerMode = AudioManager.RINGER_MODE_NORMAL

    override fun getName(): String = "RingerSilencer"

    private fun audioManager(): AudioManager =
        reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    @ReactMethod
    fun silent(mode: String, promise: Promise) {
        try {
            val am = audioManager()
            // Remember current mode so restore() can put it back.
            savedRingerMode = am.ringerMode
            val target = if (mode == "silent") AudioManager.RINGER_MODE_SILENT
                         else AudioManager.RINGER_MODE_VIBRATE
            am.ringerMode = target
            promise.resolve(true)
        } catch (e: SecurityException) {
            // Notification Policy access not granted.
            promise.reject("NO_DND_ACCESS", "Do-Not-Disturb access required to change ringer mode", e)
        } catch (e: Exception) {
            promise.reject("SILENCE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun restore(promise: Promise) {
        try {
            val am = audioManager()
            am.ringerMode = savedRingerMode
            promise.resolve(true)
        } catch (e: SecurityException) {
            promise.reject("NO_DND_ACCESS", "Do-Not-Disturb access required to restore ringer mode", e)
        } catch (e: Exception) {
            promise.reject("RESTORE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun hasDndAccess(promise: Promise) {
        try {
            val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            // isNotificationPolicyAccessGranted requires API 23+ (M).
            val granted = nm.isNotificationPolicyAccessGranted
            promise.resolve(granted)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}

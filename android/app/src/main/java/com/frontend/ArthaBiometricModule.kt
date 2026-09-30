package com.frontend

import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.atomic.AtomicBoolean

class ArthaBiometricModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ArthaBiometricPrompt"

    @ReactMethod
    fun getAvailableBiometrics(promise: Promise) {
        try {
            val bm = BiometricManager.from(reactApplicationContext)
            val strongOrWeak =
                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                    BiometricManager.Authenticators.BIOMETRIC_WEAK
            val canBiometric =
                bm.canAuthenticate(strongOrWeak) == BiometricManager.BIOMETRIC_SUCCESS

            val km =
                reactApplicationContext.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            val hasDeviceCredential = km?.isDeviceSecure == true

            val result = Arguments.createMap().apply {
                putBoolean("biometricAvailable", canBiometric)
                putBoolean("deviceCredentialAvailable", hasDeviceCredential)
                putString(
                    "label",
                    if (canBiometric) "Fingerprint / Face Unlock" else "Device PIN"
                )
            }
            promise.resolve(result)
        } catch (e: Throwable) {
            promise.reject("E_BIOMETRIC_CHECK", e.message, e)
        }
    }

    @ReactMethod
    fun authenticate(
        title: String,
        subtitle: String,
        description: String,
        promise: Promise
    ) {
        val activity = reactApplicationContext.currentActivity as? FragmentActivity
        if (activity == null) {
            val map = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("errorMessage", "Activity is not ready for biometric prompt.")
            }
            promise.resolve(map)
            return
        }

        val resolved = AtomicBoolean(false)
        val mainHandler = Handler(Looper.getMainLooper())

        mainHandler.post {
            try {
                val executor = ContextCompat.getMainExecutor(activity)
                val callback = object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(
                        result: BiometricPrompt.AuthenticationResult
                    ) {
                        if (resolved.compareAndSet(false, true)) {
                            val map = Arguments.createMap().apply {
                                putBoolean("success", true)
                            }
                            promise.resolve(map)
                        }
                    }

                    override fun onAuthenticationError(
                        errorCode: Int,
                        errString: CharSequence
                    ) {
                        if (resolved.compareAndSet(false, true)) {
                            val cancelled =
                                errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                                    errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                                    errorCode == BiometricPrompt.ERROR_CANCELED
                            val lockedOut =
                                errorCode == BiometricPrompt.ERROR_LOCKOUT ||
                                    errorCode == BiometricPrompt.ERROR_LOCKOUT_PERMANENT
                            val map = Arguments.createMap().apply {
                                putBoolean("success", false)
                                putBoolean("cancelled", cancelled)
                                putBoolean("lockedOut", lockedOut)
                                putString("errorMessage", errString.toString())
                            }
                            promise.resolve(map)
                        }
                    }
                }

                val biometricPrompt = BiometricPrompt(activity, executor, callback)

                val promptBuilder = BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title.ifBlank { "Unlock Artha" })
                    .setSubtitle(subtitle.ifBlank { "Verify with Fingerprint, Face, or PIN" })
                    .setDescription(
                        description.ifBlank {
                            "Use your fingerprint, face unlock, or screen lock PIN"
                        }
                    )
                    .setConfirmationRequired(false)

                val bm = BiometricManager.from(reactApplicationContext)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    // Android 11+ (API 30+): Allow BIOMETRIC_STRONG (Fingerprint / 3D Face) +
                    // BIOMETRIC_WEAK (2D Camera Face Unlock) + DEVICE_CREDENTIAL (PIN/Pattern/Password)
                    val combined =
                        BiometricManager.Authenticators.BIOMETRIC_STRONG or
                            BiometricManager.Authenticators.BIOMETRIC_WEAK or
                            BiometricManager.Authenticators.DEVICE_CREDENTIAL

                    if (bm.canAuthenticate(combined) == BiometricManager.BIOMETRIC_SUCCESS) {
                        promptBuilder.setAllowedAuthenticators(combined)
                    } else {
                        val weakAndCredential =
                            BiometricManager.Authenticators.BIOMETRIC_WEAK or
                                BiometricManager.Authenticators.DEVICE_CREDENTIAL
                        promptBuilder.setAllowedAuthenticators(weakAndCredential)
                    }
                } else {
                    // Android 10 and below: allow BIOMETRIC_WEAK (includes Strong + Weak Face/Fingerprint)
                    // plus Device Credential fallback
                    @Suppress("DEPRECATION")
                    promptBuilder.setDeviceCredentialAllowed(true)
                }

                biometricPrompt.authenticate(promptBuilder.build())
            } catch (e: Throwable) {
                if (resolved.compareAndSet(false, true)) {
                    val map = Arguments.createMap().apply {
                        putBoolean("success", false)
                        putString(
                            "errorMessage",
                            e.message ?: "Biometric authentication failed."
                        )
                    }
                    promise.resolve(map)
                }
            }
        }
    }
}

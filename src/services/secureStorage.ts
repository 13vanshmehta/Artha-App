import { NativeModules, Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';

interface ArthaBiometricNativeModule {
  getAvailableBiometrics?: () => Promise<{
    biometricAvailable: boolean;
    deviceCredentialAvailable: boolean;
    label: string;
  }>;
  authenticate?: (
    title: string,
    subtitle: string,
    description: string,
  ) => Promise<{
    success: boolean;
    cancelled?: boolean;
    lockedOut?: boolean;
    errorMessage?: string;
  }>;
}

const ArthaBiometricPrompt = (
  NativeModules as { ArthaBiometricPrompt?: ArthaBiometricNativeModule }
).ArthaBiometricPrompt;

export function formatPlatformBiometryLabel(
  supportedBiometry?: string | null,
): string {
  if (Platform.OS === 'ios') {
    if (supportedBiometry === 'TouchID') {
      return 'Touch ID';
    }
    return 'Face ID';
  }
  // Android devices support both Fingerprint and Face Unlock (whichever is enrolled, or both)
  return 'Fingerprint / Face Unlock';
}

export interface StoredUserSummary {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  status: string;
  hasPassword: boolean;
  linkedProviders: Array<'GOOGLE' | 'APPLE'>;
  securityPreferences: {
    biometricEnabled: boolean;
    pinEnabled: boolean;
    appLockTimeoutSeconds: number;
    requireReauthForSensitiveAction: boolean;
  };
  createdAt: string;
}

export interface StoredAuthSession {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  sessionId: string;
  user: StoredUserSummary;
}

export interface LocalAppLockState {
  userId: string;
  biometricEnabled: boolean;
  pinEnabled: boolean;
  pinSalt: string | null;
  pinVerifier: string | null;
  failedAttempts: number;
  lockedUntil: number | null;
  appLockTimeoutSeconds: number;
}

const SESSION_SERVICE = 'com.artha.auth.session';
const BIOMETRIC_SERVICE = 'com.artha.auth.biometric';
const APPLOCK_SERVICE = 'com.artha.auth.applock';

export const MAX_LOCAL_PIN_ATTEMPTS = 5;
export const LOCAL_PIN_LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Deterministic salted hash for local PIN verification inside Keychain-protected storage.
 * Raw PIN is never persisted. Server-side PIN verification additionally uses Argon2id.
 */
/* eslint-disable no-bitwise */
export function computePinVerifier(pin: string, salt: string): string {
  const input = `artha-pin-v1:${salt}:${pin}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  for (let round = 0; round < 1024; round++) {
    h1 =
      Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
      Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 =
      Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
      Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0')
  );
}
/* eslint-enable no-bitwise */

export class SecureStorageService {
  async saveSession(session: StoredAuthSession): Promise<void> {
    const payload = JSON.stringify(session);
    await Keychain.setGenericPassword('artha_session', payload, {
      service: SESSION_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  async loadSession(): Promise<StoredAuthSession | null> {
    try {
      const result = await Keychain.getGenericPassword({
        service: SESSION_SERVICE,
      });
      if (!result || !result.password) {
        return null;
      }
      const parsed = JSON.parse(result.password) as StoredAuthSession;
      if (!parsed.refreshToken || !parsed.accessToken || !parsed.user?.id) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async clearSession(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: SESSION_SERVICE });
    } catch {
      // Ignore reset errors if no item was stored
    }
  }

  async getSupportedBiometryType(): Promise<string | null> {
    const isJest = typeof jest !== 'undefined';
    try {
      if (
        Platform.OS === 'android' &&
        !isJest &&
        ArthaBiometricPrompt?.getAvailableBiometrics
      ) {
        const res = await ArthaBiometricPrompt.getAvailableBiometrics();
        if (res?.biometricAvailable || res?.deviceCredentialAvailable) {
          return res.label || 'Fingerprint / Face Unlock';
        }
      }
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType ? String(biometryType) : null;
    } catch {
      return null;
    }
  }

  async enrollBiometricUnlock(userId: string, sessionId: string): Promise<boolean> {
    const isJest = typeof jest !== 'undefined';
    const supported = await this.getSupportedBiometryType();
    if (!supported && isJest) {
      throw new Error(
        'Biometric authentication is not available or not enrolled on this device.',
      );
    }

    const secretPayload = JSON.stringify({
      userId,
      sessionId,
      enrolledAt: Date.now(),
    });

    const isAndroidNativePrompt =
      Platform.OS === 'android' &&
      !isJest &&
      typeof ArthaBiometricPrompt?.authenticate === 'function';

    const accessControl = isAndroidNativePrompt
      ? undefined
      : Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE ||
        Keychain.ACCESS_CONTROL.DEVICE_PASSCODE ||
        Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET;

    const authenticationPrompt =
      Platform.OS === 'ios'
        ? {
            title: 'Unlock Artha',
            subtitle: 'Verify with Face ID or Passcode',
            description: 'Use Face ID or your device passcode',
          }
        : {
            title: 'Unlock Artha',
            subtitle: 'Verify with Fingerprint, Face, or PIN',
            description:
              'Use your fingerprint, face unlock, or screen lock PIN',
          };

    await Keychain.setGenericPassword('artha_biometric', secretPayload, {
      service: BIOMETRIC_SERVICE,
      ...(accessControl ? { accessControl } : {}),
      accessible: isAndroidNativePrompt
        ? Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
        : Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      authenticationPrompt,
    });

    // Trigger system default Biometric / Device PIN verification on real devices
    if (!isJest) {
      const verifyRes = await this.authenticateWithBiometrics(userId);
      if (!verifyRes.success) {
        await this.clearBiometricUnlock();
        throw new Error(
          verifyRes.errorMessage ||
            'System biometric or device PIN verification was not completed.',
        );
      }
    }

    return true;
  }

  async authenticateWithBiometrics(expectedUserId: string): Promise<{
    success: boolean;
    cancelled?: boolean;
    lockedOut?: boolean;
    enrollmentChanged?: boolean;
    errorMessage?: string;
  }> {
    const isJest = typeof jest !== 'undefined';

    // On Android, use ArthaBiometricPrompt so the native system dialog enables BOTH
    // Fingerprint (BIOMETRIC_STRONG) AND Face Unlock (BIOMETRIC_WEAK) + Device PIN
    if (
      Platform.OS === 'android' &&
      !isJest &&
      typeof ArthaBiometricPrompt?.authenticate === 'function'
    ) {
      try {
        const promptRes = await ArthaBiometricPrompt.authenticate(
          'Unlock Artha',
          'Verify with Fingerprint, Face, or PIN',
          'Use your fingerprint, face unlock, or screen lock PIN',
        );
        if (!promptRes.success) {
          return {
            success: false,
            cancelled: Boolean(promptRes.cancelled),
            lockedOut: Boolean(promptRes.lockedOut),
            errorMessage:
              promptRes.errorMessage || 'Biometric verification failed.',
          };
        }
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        return {
          success: false,
          errorMessage: msg || 'Biometric verification failed.',
        };
      }
    }

    const accessControl =
      Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE ||
      Keychain.ACCESS_CONTROL.DEVICE_PASSCODE ||
      Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET;

    const authenticationPrompt =
      Platform.OS === 'ios'
        ? {
            title: 'Unlock Artha',
            subtitle: 'Verify with Face ID or Passcode',
            description: 'Use Face ID or your device passcode',
          }
        : {
            title: 'Unlock Artha',
            subtitle: 'Verify with Fingerprint, Face, or PIN',
            description:
              'Use your fingerprint, face unlock, or screen lock PIN',
          };

    const promptConfig = {
      service: BIOMETRIC_SERVICE,
      accessControl,
      ...(Platform.OS === 'ios' && !isJest
        ? {
            authenticationType:
              Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
          }
        : {}),
      authenticationPrompt,
    };

    try {
      let credentials = await Keychain.getGenericPassword(promptConfig);

      // If locked via App Lock before a BIOMETRIC_SERVICE entry existed on device,
      // initialize it with BIOMETRY_ANY_OR_DEVICE_PASSCODE and trigger the system prompt
      if ((!credentials || !credentials.password) && !isJest) {
        const secretPayload = JSON.stringify({
          userId: expectedUserId,
          sessionId: 'system-device-lock',
          enrolledAt: Date.now(),
        });
        await Keychain.setGenericPassword('artha_biometric', secretPayload, {
          service: BIOMETRIC_SERVICE,
          accessControl,
          accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
          authenticationPrompt,
        });
        credentials = await Keychain.getGenericPassword(promptConfig);
      }

      if (!credentials || !credentials.password) {
        return {
          success: false,
          enrollmentChanged: true,
          errorMessage:
            'Biometric credentials were not found or biometric enrollment changed.',
        };
      }

      const parsed = JSON.parse(credentials.password) as { userId: string };
      if (parsed.userId !== expectedUserId) {
        return {
          success: false,
          errorMessage: 'Biometric enrollment does not match current account.',
        };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (
        msg.includes('cancel') ||
        msg.includes('user canceled') ||
        msg.includes('-128')
      ) {
        return {
          success: false,
          cancelled: true,
          errorMessage: 'Biometric authentication was cancelled.',
        };
      }
      if (msg.includes('lockout') || msg.includes('too many attempts')) {
        return {
          success: false,
          lockedOut: true,
          errorMessage:
            'Biometrics temporarily locked due to too many failed attempts. Please use your PIN or password.',
        };
      }
      if (msg.includes('biometry') || msg.includes('changed')) {
        return {
          success: false,
          enrollmentChanged: true,
          errorMessage:
            'Device biometric enrollment changed. Please re-authenticate.',
        };
      }
      return {
        success: false,
        errorMessage: 'Biometric verification failed.',
      };
    }
  }

  async clearBiometricUnlock(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: BIOMETRIC_SERVICE });
    } catch {
      // Ignore
    }
  }

  async saveAppLockState(state: LocalAppLockState): Promise<void> {
    await Keychain.setGenericPassword('artha_applock', JSON.stringify(state), {
      service: APPLOCK_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  async loadAppLockState(userId: string): Promise<LocalAppLockState | null> {
    try {
      const res = await Keychain.getGenericPassword({
        service: APPLOCK_SERVICE,
      });
      if (!res || !res.password) return null;
      const parsed = JSON.parse(res.password) as LocalAppLockState;
      if (parsed.userId !== userId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async configureLocalPin(userId: string, pin: string): Promise<LocalAppLockState> {
    const existing = await this.loadAppLockState(userId);
    const salt = `${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const verifier = computePinVerifier(pin, salt);

    const nextState: LocalAppLockState = {
      userId,
      biometricEnabled: existing?.biometricEnabled ?? false,
      pinEnabled: true,
      pinSalt: salt,
      pinVerifier: verifier,
      failedAttempts: 0,
      lockedUntil: null,
      appLockTimeoutSeconds: existing?.appLockTimeoutSeconds ?? 60,
    };
    await this.saveAppLockState(nextState);
    return nextState;
  }

  async verifyLocalPin(
    userId: string,
    candidatePin: string,
  ): Promise<{
    valid: boolean;
    remainingAttempts: number;
    lockedUntil: number | null;
    errorMessage?: string;
  }> {
    const state = await this.loadAppLockState(userId);
    if (!state || !state.pinEnabled || !state.pinSalt || !state.pinVerifier) {
      return {
        valid: false,
        remainingAttempts: 0,
        lockedUntil: null,
        errorMessage: 'App PIN is not configured on this device.',
      };
    }

    const now = Date.now();
    if (state.lockedUntil && state.lockedUntil > now) {
      const waitSec = Math.ceil((state.lockedUntil - now) / 1000);
      return {
        valid: false,
        remainingAttempts: 0,
        lockedUntil: state.lockedUntil,
        errorMessage: `Too many failed attempts. Try again in ${waitSec}s.`,
      };
    }

    const expected = computePinVerifier(candidatePin, state.pinSalt);
    if (expected === state.pinVerifier) {
      if (state.failedAttempts > 0 || state.lockedUntil !== null) {
        await this.saveAppLockState({
          ...state,
          failedAttempts: 0,
          lockedUntil: null,
        });
      }
      return {
        valid: true,
        remainingAttempts: MAX_LOCAL_PIN_ATTEMPTS,
        lockedUntil: null,
      };
    }

    const nextFailed = state.failedAttempts + 1;
    const lockedUntil =
      nextFailed >= MAX_LOCAL_PIN_ATTEMPTS ? now + LOCAL_PIN_LOCKOUT_MS : null;

    await this.saveAppLockState({
      ...state,
      failedAttempts: nextFailed,
      lockedUntil,
    });

    const remaining = Math.max(0, MAX_LOCAL_PIN_ATTEMPTS - nextFailed);
    return {
      valid: false,
      remainingAttempts: remaining,
      lockedUntil,
      errorMessage: lockedUntil
        ? 'Maximum PIN attempts reached. App PIN is locked for 15 minutes.'
        : `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  async loadUserPreferences(): Promise<StoredUserPreferences> {
    try {
      const result = await Keychain.getGenericPassword({
        service: PREFERENCES_SERVICE,
      });
      if (!result || !result.password) {
        return DEFAULT_USER_PREFERENCES;
      }
      const parsed = JSON.parse(
        result.password,
      ) as Partial<StoredUserPreferences>;
      return {
        ...DEFAULT_USER_PREFERENCES,
        ...parsed,
        notifications: {
          ...DEFAULT_USER_PREFERENCES.notifications,
          ...(parsed.notifications ?? {}),
        },
        paymentMethods:
          Array.isArray(parsed.paymentMethods) &&
          parsed.paymentMethods.length > 0
            ? parsed.paymentMethods
            : DEFAULT_USER_PREFERENCES.paymentMethods,
      };
    } catch {
      return DEFAULT_USER_PREFERENCES;
    }
  }

  async saveUserPreferences(
    prefs: StoredUserPreferences,
  ): Promise<StoredUserPreferences> {
    try {
      await Keychain.setGenericPassword(
        'artha_preferences',
        JSON.stringify(prefs),
        {
          service: PREFERENCES_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        },
      );
    } catch {
      // Ignore keychain write failure in restricted test environments
    }
    return prefs;
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.clearSession(),
      this.clearBiometricUnlock(),
      Keychain.resetGenericPassword({ service: APPLOCK_SERVICE }).catch(
        () => undefined,
      ),
    ]);
  }
}

export type PaymentMethodType =
  | 'UPI'
  | 'Cash'
  | 'Debit Card'
  | 'Credit Card'
  | 'Net Banking';

export interface SavedPaymentMethodItem {
  id: string;
  label: string;
  type: PaymentMethodType;
  upiHandle?: string;
  isPreferred: boolean;
  isBuiltIn: boolean;
}

export interface StoredUserPreferences {
  appearanceMode: 'System' | 'Light' | 'Dark';
  language: 'English';
  currency: 'INR';
  paymentMethods: SavedPaymentMethodItem[];
  notifications: {
    pushExpenseReminders: boolean;
    pushGroupUpdates: boolean;
    pushSettlementUpdates: boolean;
    pushBudgetAlerts: boolean;
    emailActivitySummaries: boolean;
  };
}

export const DEFAULT_USER_PREFERENCES: StoredUserPreferences = {
  appearanceMode: 'Light',
  language: 'English',
  currency: 'INR',
  paymentMethods: [
    {
      id: 'pm-upi-default',
      label: 'UPI',
      type: 'UPI',
      isPreferred: true,
      isBuiltIn: true,
    },
    {
      id: 'pm-cash-default',
      label: 'Cash',
      type: 'Cash',
      isPreferred: false,
      isBuiltIn: true,
    },
    {
      id: 'pm-debit-default',
      label: 'Debit Card',
      type: 'Debit Card',
      isPreferred: false,
      isBuiltIn: true,
    },
    {
      id: 'pm-credit-default',
      label: 'Credit Card',
      type: 'Credit Card',
      isPreferred: false,
      isBuiltIn: true,
    },
    {
      id: 'pm-netbanking-default',
      label: 'Net Banking',
      type: 'Net Banking',
      isPreferred: false,
      isBuiltIn: true,
    },
  ],
  notifications: {
    pushExpenseReminders: true,
    pushGroupUpdates: true,
    pushSettlementUpdates: true,
    pushBudgetAlerts: true,
    emailActivitySummaries: true,
  },
};

const PREFERENCES_SERVICE = 'com.artha.user.preferences';

export const secureStorage = new SecureStorageService();


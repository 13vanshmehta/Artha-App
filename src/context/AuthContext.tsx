import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  apiClient,
  ApiError,
  AuthSessionApiPayload,
} from '../services/apiClient';
import {
  secureStorage,
  StoredAuthSession,
  StoredUserSummary,
} from '../services/secureStorage';
import {
  requestAppleIdentityToken,
  requestGoogleIdToken,
  signOutGoogleSilently,
} from '../services/socialAuth';
import { toast } from './ToastContext';

export type AuthLifecycleStatus =
  | 'initializing'
  | 'unauthenticated'
  | 'pending_verification'
  | 'onboarding_biometrics'
  | 'locked'
  | 'authenticated';

export interface ActiveSessionItem {
  id: string;
  deviceName: string;
  platform: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop' | 'web';
  operatingSystem?: string;
  approximateLocation?: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface SecurityPreferencesDetails {
  biometricEnabled: boolean;
  pinEnabled: boolean;
  appLockTimeoutSeconds: number;
  requireReauthForSensitiveAction: boolean;
  hasPassword: boolean;
  linkedIdentities: Array<{
    provider: 'GOOGLE' | 'APPLE';
    providerEmail: string | null;
    linkedAt: string;
    lastUsedAt: string;
  }>;
}

export interface AuthContextValue {
  status: AuthLifecycleStatus;
  user: StoredUserSummary | null;
  currentSessionId: string | null;
  pendingVerificationEmail: string | null;
  otpResendCooldownSeconds: number;
  supportedBiometry: string | null;
  isOfflineBannerVisible: boolean;
  openPendingVerification: (email: string, cooldownSeconds?: number) => void;
  exitPendingVerification: () => void;
  register: (params: {
    displayName: string;
    email: string;
    password: string;
  }) => Promise<{ email: string; resendCooldownSeconds: number }>;
  resendVerificationOtp: (
    email: string,
  ) => Promise<{ resendCooldownSeconds: number; message: string }>;
  confirmEmailOtp: (params: {
    email: string;
    code: string;
    password: string;
  }) => Promise<void>;
  login: (params: { email: string; password: string }) => Promise<void>;
  signInWithGoogle: () => Promise<{ cancelled: boolean }>;
  signInWithApple: () => Promise<{ cancelled: boolean }>;
  requestPasswordReset: (email: string) => Promise<{ message: string }>;
  confirmPasswordReset: (params: {
    email: string;
    resetToken: string;
    newPassword: string;
  }) => Promise<{ message: string }>;
  changePassword: (params: {
    currentPassword?: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
  }) => Promise<{ message: string }>;
  unlockWithBiometrics: () => Promise<{
    success: boolean;
    cancelled?: boolean;
    errorMessage?: string;
  }>;
  unlockWithPin: (pin: string) => Promise<{
    success: boolean;
    errorMessage?: string;
    remainingAttempts?: number;
  }>;
  lockNow: () => void;
  fetchSecurityPreferences: () => Promise<SecurityPreferencesDetails>;
  toggleBiometrics: (enable: boolean) => Promise<void>;
  completeBiometricOnboarding: (enable: boolean) => Promise<void>;
  skipBiometricOnboarding: () => Promise<void>;
  configurePin: (params: {
    enable: boolean;
    newPin?: string;
    currentPin?: string;
  }) => Promise<void>;
  linkSocialProvider: (
    provider: 'GOOGLE' | 'APPLE',
  ) => Promise<{ cancelled: boolean; message?: string }>;
  unlinkSocialProvider: (provider: 'GOOGLE' | 'APPLE') => Promise<void>;
  fetchSessions: () => Promise<ActiveSessionItem[]>;
  revokeSession: (sessionId: string) => Promise<void>;
  reportSuspiciousSession: (
    sessionId: string,
  ) => Promise<{ message: string; recommendedAction?: string }>;
  revokeOtherSessions: () => Promise<{ message: string; revokedCount: number }>;
  updateProfile: (
    params: { displayName?: string; phoneNumber?: string } | string,
  ) => Promise<StoredUserSummary>;
  requestEmailChange: (
    newEmail: string,
    currentPassword?: string,
  ) => Promise<{ message: string; resendCooldownSeconds: number }>;
  confirmEmailChange: (code: string) => Promise<StoredUserSummary>;
  updateAppLockTimeout: (timeoutSeconds: number) => Promise<void>;
  deleteAccount: (params?: {
    confirmationText?: string;
    password?: string;
    pin?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const DEVICE_NAME = Platform.select({
  ios: 'Artha iOS Mobile',
  android: 'Artha Android Mobile',
  default: 'Artha Mobile Client',
})!;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<AuthLifecycleStatus>('initializing');
  const [user, setUser] = useState<StoredUserSummary | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null);
  const [otpResendCooldownSeconds, setOtpResendCooldownSeconds] =
    useState<number>(60);
  const [supportedBiometry, setSupportedBiometry] = useState<string | null>(
    null,
  );
  const [isOfflineBannerVisible, setIsOfflineBannerVisible] =
    useState<boolean>(false);

  const backgroundTimestampRef = useRef<number | null>(null);
  const isBiometricInFlightRef = useRef<boolean>(false);

  const handleSessionInvalidated = useCallback((reason?: string) => {
    setUser(null);
    setCurrentSessionId(null);
    setPendingVerificationEmail(null);
    setStatus('unauthenticated');
    if (
      reason &&
      reason !== 'USER_LOGOUT' &&
      reason !== 'USER_LOGOUT_ALL' &&
      reason !== 'ACCOUNT_DELETED' &&
      reason !== 'RESTORE_FAILED'
    ) {
      toast.warning(
        'Your session has expired. Please sign in again.',
        'Session Expired',
      );
    }
  }, []);

  const handleSessionUpdated = useCallback((session: StoredAuthSession) => {
    setUser(session.user);
    setCurrentSessionId(session.sessionId);
  }, []);

  useEffect(() => {
    apiClient.setSessionListeners({
      onInvalidated: handleSessionInvalidated,
      onUpdated: handleSessionUpdated,
    });
  }, [handleSessionInvalidated, handleSessionUpdated]);

  // Restore session on startup
  useEffect(() => {
    let mounted = true;

    async function restore() {
      const biometry = await secureStorage.getSupportedBiometryType();
      if (mounted) {
        setSupportedBiometry(biometry);
      }

      const stored = await secureStorage.loadSession();
      if (!stored) {
        if (mounted) {
          setStatus('unauthenticated');
        }
        return;
      }

      apiClient.setInMemorySession(stored);

      // Immediately activate cached session so the app transitions out of 'initializing'
      // in milliseconds, preventing any hang on the splash screen in offline mode
      if (mounted) {
        setUser(stored.user);
        setCurrentSessionId(stored.sessionId);
      }

      const initialLockState = await secureStorage.loadAppLockState(
        stored.user.id,
      );
      const initialHasBio = Boolean(
        stored.user.securityPreferences?.biometricEnabled ||
          initialLockState?.biometricEnabled,
      );
      const initialHasPin = Boolean(
        stored.user.securityPreferences?.pinEnabled ||
          initialLockState?.pinEnabled,
      );
      const initialShouldLock = initialHasBio || initialHasPin;

      if (mounted) {
        setStatus(initialShouldLock ? 'locked' : 'authenticated');
      }

      // Background session refresh & verification with a fast 3s timeout
      let activeSession = stored;
      if (stored.accessTokenExpiresAt <= Date.now() + 30_000) {
        const refreshed = await apiClient.coordinateTokenRefresh();
        if (refreshed) {
          activeSession = refreshed;
        }
      }

      // Verify session with backend
      try {
        const meRes = await apiClient.request<{
          user: StoredUserSummary;
          currentSessionId: string;
        }>('/auth/me', { method: 'GET', timeoutMs: 3000 });

        const updatedStored: StoredAuthSession = {
          ...activeSession,
          user: meRes.user,
          sessionId: meRes.currentSessionId || activeSession.sessionId,
        };
        await secureStorage.saveSession(updatedStored);
        apiClient.setInMemorySession(updatedStored);

        if (!mounted) return;
        setUser(meRes.user);
        setCurrentSessionId(updatedStored.sessionId);
        setIsOfflineBannerVisible(false);

        const localLock = await secureStorage.loadAppLockState(meRes.user.id);
        const hasBio = Boolean(
          meRes.user.securityPreferences?.biometricEnabled ||
            localLock?.biometricEnabled,
        );
        const hasPin = Boolean(
          meRes.user.securityPreferences?.pinEnabled ||
            localLock?.pinEnabled,
        );
        const shouldLock = hasBio || hasPin;

        setStatus(shouldLock ? 'locked' : 'authenticated');
      } catch {
        if (!mounted) return;
        // apiClient clears credentials itself on a definitive rejection (terminal
        // 401 codes or a rejected refresh) and notifies handleSessionInvalidated.
        // Anything else — offline, timeout, 429, 5xx — must not sign the user out,
        // so keep the cached session and show the offline/degraded banner.
        if (apiClient.hasActiveSession()) {
          const cached = apiClient.getInMemorySession() ?? activeSession;
          setUser(cached.user);
          setCurrentSessionId(cached.sessionId);
          setIsOfflineBannerVisible(true);
          const localLock = await secureStorage.loadAppLockState(
            cached.user.id,
          );
          const hasBio = Boolean(
            cached.user.securityPreferences?.biometricEnabled ||
              localLock?.biometricEnabled,
          );
          const hasPin = Boolean(
            cached.user.securityPreferences?.pinEnabled ||
              localLock?.pinEnabled,
          );
          const shouldLock = hasBio || hasPin;
          setStatus(shouldLock ? 'locked' : 'authenticated');
        } else {
          setStatus('unauthenticated');
        }
      }
    }

    restore();

    return () => {
      mounted = false;
    };
  }, []);

  // Lock app on background -> foreground transition after 60s (1 min) grace period
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'background') {
          backgroundTimestampRef.current = Date.now();
        } else if (nextState === 'active') {
          const bgAt = backgroundTimestampRef.current;
          backgroundTimestampRef.current = null;
          if (
            status === 'authenticated' &&
            user &&
            bgAt &&
            !isBiometricInFlightRef.current
          ) {
            const hasBio = Boolean(user.securityPreferences?.biometricEnabled);
            const hasPin = Boolean(user.securityPreferences?.pinEnabled);
            if (hasBio || hasPin) {
              const elapsedSeconds = (Date.now() - bgAt) / 1000;
              // 60-second grace period: if app was backgrounded for < 60s, no need to re-verify.
              // If away for >= 60s (1 minute), re-verify with biometrics/PIN.
              const timeoutSec =
                user.securityPreferences?.appLockTimeoutSeconds ?? 60;
              if (elapsedSeconds >= timeoutSec) {
                setStatus('locked');
              }
            }
          }
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [status, user]);

  const applySessionPayload = useCallback(
    async (
      payload: AuthSessionApiPayload,
      options?: { checkOnboarding?: boolean },
    ) => {
      const stored = await apiClient.persistSessionFromApi(payload);
      setUser(stored.user);
      setCurrentSessionId(stored.sessionId);
      setPendingVerificationEmail(null);
      setIsOfflineBannerVisible(false);

      if (options?.checkOnboarding) {
        const biometry = await secureStorage.getSupportedBiometryType();
        const onboardingStatus =
          await secureStorage.getBiometricOnboardingStatus(stored.user.id);

        if (biometry && onboardingStatus === 'not_asked') {
          setStatus('onboarding_biometrics');
          return;
        }

        if (!biometry && onboardingStatus === 'not_asked') {
          await secureStorage.setBiometricOnboardingStatus(
            stored.user.id,
            'unavailable',
          );
        }
      }

      setStatus('authenticated');
    },
    [],
  );

  const openPendingVerification = useCallback(
    (email: string, cooldownSeconds = 60) => {
      setPendingVerificationEmail(email.trim());
      setOtpResendCooldownSeconds(cooldownSeconds);
      setStatus('pending_verification');
    },
    [],
  );

  const exitPendingVerification = useCallback(() => {
    setPendingVerificationEmail(null);
    setStatus('unauthenticated');
  }, []);

  const register = useCallback(
    async (params: {
      displayName: string;
      email: string;
      password: string;
    }) => {
      const res = await apiClient.request<{
        email: string;
        resendCooldownSeconds: number;
      }>('/auth/register', {
        method: 'POST',
        authenticated: false,
        body: {
          displayName: params.displayName.trim(),
          email: params.email.trim(),
          password: params.password,
          deviceName: DEVICE_NAME,
          platform: Platform.OS,
        },
      });

      setPendingVerificationEmail(res.email);
      setOtpResendCooldownSeconds(res.resendCooldownSeconds ?? 60);
      setStatus('pending_verification');
      return {
        email: res.email,
        resendCooldownSeconds: res.resendCooldownSeconds ?? 60,
      };
    },
    [],
  );

  const resendVerificationOtp = useCallback(async (email: string) => {
    const res = await apiClient.request<{
      message: string;
      resendCooldownSeconds: number;
    }>('/auth/email/verification/send', {
      method: 'POST',
      authenticated: false,
      body: { email: email.trim() },
    });
    setOtpResendCooldownSeconds(res.resendCooldownSeconds ?? 60);
    return {
      message: res.message,
      resendCooldownSeconds: res.resendCooldownSeconds ?? 60,
    };
  }, []);

  const confirmEmailOtp = useCallback(
    async (params: { email: string; code: string; password: string }) => {
      const payload = await apiClient.request<AuthSessionApiPayload>(
        '/auth/email/verification/confirm',
        {
          method: 'POST',
          authenticated: false,
          body: {
            email: params.email.trim(),
            code: params.code.trim(),
            // Required by the backend: for a new account this sets the password,
            // so only the inbox owner decides it (account pre-hijack protection).
            password: params.password,
            deviceName: DEVICE_NAME,
            platform: Platform.OS,
          },
        },
      );
      await applySessionPayload(payload, { checkOnboarding: true });
    },
    [applySessionPayload],
  );

  const login = useCallback(
    async (params: { email: string; password: string }) => {
      try {
        const payload = await apiClient.request<AuthSessionApiPayload>(
          '/auth/login',
          {
            method: 'POST',
            authenticated: false,
            body: {
              email: params.email.trim(),
              password: params.password,
              deviceName: DEVICE_NAME,
              platform: Platform.OS,
            },
          },
        );
        await applySessionPayload(payload);
      } catch (err) {
        if (err instanceof ApiError && err.errorCode === 'EMAIL_NOT_VERIFIED') {
          const emailToVerify =
            (err.details?.email as string) || params.email.trim();
          setPendingVerificationEmail(emailToVerify);
          setStatus('pending_verification');
        }
        throw err;
      }
    },
    [applySessionPayload],
  );

  const signInWithGoogle = useCallback(async () => {
    const socialRes = await requestGoogleIdToken();
    if (socialRes.cancelled) {
      return { cancelled: true };
    }
    if (!socialRes.token) {
      throw new Error(
        socialRes.errorMessage || 'Google Sign-In could not be completed.',
      );
    }

    const payload = await apiClient.request<AuthSessionApiPayload>(
      '/auth/oauth/google',
      {
        method: 'POST',
        authenticated: false,
        body: {
          idToken: socialRes.token,
          deviceName: DEVICE_NAME,
          platform: Platform.OS,
        },
      },
    );
    if (socialRes.fullName && !payload.user.displayName) {
      payload.user.displayName = socialRes.fullName;
    }
    if (socialRes.email && !payload.user.email) {
      payload.user.email = socialRes.email;
    }
    if (socialRes.photoUrl && !payload.user.avatarUrl) {
      payload.user.avatarUrl = socialRes.photoUrl;
    }
    const isNewAccount =
      Date.now() - new Date(payload.user.createdAt).getTime() < 120_000;
    await applySessionPayload(payload, { checkOnboarding: isNewAccount });
    return { cancelled: false };
  }, [applySessionPayload]);

  const signInWithApple = useCallback(async () => {
    const socialRes = await requestAppleIdentityToken();
    if (socialRes.cancelled) {
      return { cancelled: true };
    }
    if (!socialRes.token) {
      throw new Error(
        socialRes.errorMessage || 'Sign in with Apple could not be completed.',
      );
    }

    const payload = await apiClient.request<AuthSessionApiPayload>(
      '/auth/oauth/apple',
      {
        method: 'POST',
        authenticated: false,
        body: {
          identityToken: socialRes.token,
          fullName: socialRes.fullName,
          deviceName: DEVICE_NAME,
          platform: Platform.OS,
        },
      },
    );
    const isNewAccount =
      Date.now() - new Date(payload.user.createdAt).getTime() < 120_000;
    await applySessionPayload(payload, { checkOnboarding: isNewAccount });
    return { cancelled: false };
  }, [applySessionPayload]);

  const requestPasswordReset = useCallback(async (email: string) => {
    return apiClient.request<{ message: string }>('/auth/password/forgot', {
      method: 'POST',
      authenticated: false,
      body: { email: email.trim() },
    });
  }, []);

  const confirmPasswordReset = useCallback(
    async (params: {
      email: string;
      resetToken: string;
      newPassword: string;
    }) => {
      return apiClient.request<{ message: string }>('/auth/password/reset', {
        method: 'POST',
        authenticated: false,
        body: {
          email: params.email.trim(),
          resetToken: params.resetToken.trim(),
          newPassword: params.newPassword,
        },
      });
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    const meRes = await apiClient.request<{
      user: StoredUserSummary;
      currentSessionId: string;
    }>('/auth/me', { method: 'GET' });

    const current = apiClient.getInMemorySession();
    if (current) {
      const updated: StoredAuthSession = {
        ...current,
        user: meRes.user,
      };
      await secureStorage.saveSession(updated);
      apiClient.setInMemorySession(updated);
    }
    setUser(meRes.user);
    setCurrentSessionId(meRes.currentSessionId);
  }, []);

  const changePassword = useCallback(
    async (params: {
      currentPassword?: string;
      newPassword: string;
      revokeOtherSessions?: boolean;
    }) => {
      const res = await apiClient.request<{ message: string }>(
        '/auth/password/change',
        {
          method: 'POST',
          body: params,
        },
      );
      await refreshProfile();
      return res;
    },
    [refreshProfile],
  );

  const unlockWithBiometrics = useCallback(async () => {
    if (!user) {
      return {
        success: false,
        errorMessage: 'No active account found. Please sign in again.',
      };
    }

    isBiometricInFlightRef.current = true;
    try {
      const bioResult = await secureStorage.authenticateWithBiometrics(user.id);
      if (!bioResult.success) {
        if (bioResult.enrollmentChanged) {
          await secureStorage.clearBiometricUnlock();
        }
        return bioResult;
      }

      // Always verify valid backend session after local unlock
      try {
        await refreshProfile();
        setStatus('authenticated');
        return { success: true };
      } catch {
        // The device owner just passed the OS biometric check. Unless apiClient
        // has definitively rejected the session (and already cleared it), a
        // failed profile sync — offline, 429, 5xx — must not sign them out.
        if (apiClient.hasActiveSession()) {
          setStatus('authenticated');
          return { success: true };
        }
        return {
          success: false,
          errorMessage: 'Your session has expired. Please sign in again.',
        };
      }
    } finally {
      setTimeout(() => {
        isBiometricInFlightRef.current = false;
      }, 500);
    }
  }, [refreshProfile, user]);

  const unlockWithPin = useCallback(
    async (pin: string) => {
      if (!user) {
        return {
          success: false,
          errorMessage: 'No active account found. Please sign in again.',
        };
      }

      // First verify against backend re-authenticate endpoint if online, with fallback to local Keychain PIN verifier
      try {
        await apiClient.request('/auth/re-authenticate', {
          method: 'POST',
          body: { pin },
        });
      } catch (err) {
        // Server unreachable or failing (offline, timeout, 5xx): fall back to the
        // on-device verifier rather than rejecting a possibly-correct PIN.
        const serverUnavailable =
          err instanceof ApiError &&
          (err.errorCode === 'NETWORK_ERROR' || err.statusCode >= 500);
        if (serverUnavailable) {
          const localCheck = await secureStorage.verifyLocalPin(user.id, pin);
          if (localCheck.valid) {
            setStatus('authenticated');
            return { success: true };
          }
          return {
            success: false,
            errorMessage: localCheck.errorMessage,
            remainingAttempts: localCheck.remainingAttempts,
          };
        }

        if (err instanceof ApiError) {
          return {
            success: false,
            errorMessage: err.message,
            remainingAttempts: err.details?.remainingAttempts as
              | number
              | undefined,
          };
        }

        return {
          success: false,
          errorMessage: 'PIN verification failed.',
        };
      }

      // PIN accepted by the server. A failed profile sync afterwards is not a
      // reason to reject the unlock unless the session itself was revoked.
      try {
        await refreshProfile();
      } catch {
        if (!apiClient.hasActiveSession()) {
          return {
            success: false,
            errorMessage: 'Your session has expired. Please sign in again.',
          };
        }
      }
      setStatus('authenticated');
      return { success: true };
    },
    [refreshProfile, user],
  );

  const lockNow = useCallback(() => {
    if (status === 'authenticated') {
      setStatus('locked');
    }
  }, [status]);

  const fetchSecurityPreferences =
    useCallback(async (): Promise<SecurityPreferencesDetails> => {
      return apiClient.request<SecurityPreferencesDetails>(
        '/users/me/security',
        { method: 'GET' },
      );
    }, []);

  const toggleBiometrics = useCallback(
    async (enable: boolean) => {
      if (!user || !currentSessionId) {
        throw new Error('Not authenticated.');
      }

      if (enable) {
        await secureStorage.enrollBiometricUnlock(user.id, currentSessionId);
      } else {
        await secureStorage.clearBiometricUnlock();
      }

      await apiClient.request('/users/me/security', {
        method: 'PATCH',
        body: {
          biometricEnabled: enable,
        },
      });

      const existingLock = await secureStorage.loadAppLockState(user.id);
      await secureStorage.saveAppLockState({
        userId: user.id,
        biometricEnabled: enable,
        pinEnabled:
          existingLock?.pinEnabled ??
          user.securityPreferences.pinEnabled ??
          false,
        pinSalt: existingLock?.pinSalt ?? null,
        pinVerifier: existingLock?.pinVerifier ?? null,
        failedAttempts: 0,
        lockedUntil: null,
        appLockTimeoutSeconds:
          existingLock?.appLockTimeoutSeconds ??
          user.securityPreferences.appLockTimeoutSeconds ??
          60,
      });

      await secureStorage.setBiometricOnboardingStatus(
        user.id,
        enable ? 'enabled' : 'skipped',
      );

      await refreshProfile();
    },
    [currentSessionId, refreshProfile, user],
  );

  const completeBiometricOnboarding = useCallback(
    async (enable: boolean) => {
      if (!user || !currentSessionId) {
        setStatus('authenticated');
        return;
      }
      if (enable) {
        await toggleBiometrics(true);
        await secureStorage.setBiometricOnboardingStatus(user.id, 'enabled');
      } else {
        await secureStorage.setBiometricOnboardingStatus(user.id, 'skipped');
      }
      setStatus('authenticated');
    },
    [currentSessionId, toggleBiometrics, user],
  );

  const skipBiometricOnboarding = useCallback(async () => {
    if (user) {
      await secureStorage.setBiometricOnboardingStatus(user.id, 'skipped');
    }
    setStatus('authenticated');
  }, [user]);

  const configurePin = useCallback(
    async (params: {
      enable: boolean;
      newPin?: string;
      currentPin?: string;
    }) => {
      if (!user) {
        throw new Error('Not authenticated.');
      }

      await apiClient.request('/users/me/security', {
        method: 'PATCH',
        body: {
          pinEnabled: params.enable,
          ...(params.newPin ? { pin: params.newPin } : {}),
          ...(params.currentPin ? { currentPin: params.currentPin } : {}),
        },
      });

      if (params.enable && params.newPin) {
        await secureStorage.configureLocalPin(user.id, params.newPin);
      } else if (!params.enable) {
        const existing = await secureStorage.loadAppLockState(user.id);
        if (existing) {
          await secureStorage.saveAppLockState({
            ...existing,
            pinEnabled: false,
            pinSalt: null,
            pinVerifier: null,
            failedAttempts: 0,
            lockedUntil: null,
          });
        }
      }

      await refreshProfile();
    },
    [refreshProfile, user],
  );

  const linkSocialProvider = useCallback(
    async (provider: 'GOOGLE' | 'APPLE') => {
      if (provider === 'GOOGLE') {
        const res = await requestGoogleIdToken();
        if (res.cancelled) return { cancelled: true };
        if (!res.token) {
          throw new Error(res.errorMessage || 'Google Sign-In failed.');
        }
        const apiRes = await apiClient.request<{ message: string }>(
          '/auth/oauth/link/google',
          {
            method: 'POST',
            body: { idToken: res.token },
          },
        );
        await refreshProfile();
        return { cancelled: false, message: apiRes.message };
      } else {
        const res = await requestAppleIdentityToken();
        if (res.cancelled) return { cancelled: true };
        if (!res.token) {
          throw new Error(res.errorMessage || 'Apple Sign-In failed.');
        }
        const apiRes = await apiClient.request<{ message: string }>(
          '/auth/oauth/link/apple',
          {
            method: 'POST',
            body: {
              identityToken: res.token,
              fullName: res.fullName,
            },
          },
        );
        await refreshProfile();
        return { cancelled: false, message: apiRes.message };
      }
    },
    [refreshProfile],
  );

  const unlinkSocialProvider = useCallback(
    async (provider: 'GOOGLE' | 'APPLE') => {
      await apiClient.request(`/auth/oauth/${provider.toLowerCase()}`, {
        method: 'DELETE',
      });
      await refreshProfile();
    },
    [refreshProfile],
  );

  const fetchSessions = useCallback(async (): Promise<ActiveSessionItem[]> => {
    const res = await apiClient.request<{ sessions: ActiveSessionItem[] }>(
      '/auth/sessions',
      { method: 'GET' },
    );
    return res.sessions;
  }, []);

  const revokeSession = useCallback(
    async (sessionId: string) => {
      await apiClient.request(`/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (sessionId === currentSessionId) {
        await apiClient.invalidateLocalSession('CURRENT_SESSION_REVOKED');
      }
    },
    [currentSessionId],
  );

  const reportSuspiciousSession = useCallback(
    async (sessionId: string) => {
      const res = await apiClient.request<{
        message: string;
        revokedSessionId: string;
        recommendedAction?: string;
      }>(`/auth/sessions/${sessionId}/report-suspicious`, {
        method: 'POST',
      });
      if (sessionId === currentSessionId) {
        await apiClient.invalidateLocalSession('CURRENT_SESSION_REVOKED');
      }
      return res;
    },
    [currentSessionId],
  );

  const revokeOtherSessions = useCallback(async () => {
    const res = await apiClient.request<{
      message: string;
      revokedCount: number;
    }>('/auth/sessions/revoke-others', {
      method: 'POST',
    });
    return res;
  }, []);

  const updateProfile = useCallback(
    async (
      params: { displayName?: string; phoneNumber?: string } | string,
    ): Promise<StoredUserSummary> => {
      const payloadBody =
        typeof params === 'string'
          ? { displayName: params.trim() }
          : {
              ...(params.displayName ? { displayName: params.displayName.trim() } : {}),
              ...(params.phoneNumber !== undefined ? { phoneNumber: params.phoneNumber.trim() } : {}),
            };

      const res = await apiClient.request<{
        message?: string;
        user: StoredUserSummary;
      }>('/auth/me', {
        method: 'PATCH',
        body: payloadBody,
      });

      const current = apiClient.getInMemorySession();
      if (current) {
        const nextStored: StoredAuthSession = {
          ...current,
          user: { ...res.user, ...payloadBody },
        };
        apiClient.setInMemorySession(nextStored);
        await secureStorage.saveSession(nextStored);
      }
      setUser((prev) => (prev ? { ...prev, ...res.user, ...payloadBody } : res.user));
      return res.user;
    },
    [],
  );

  const requestEmailChange = useCallback(
    async (newEmail: string, currentPassword?: string) => {
      return apiClient.request<{
        message: string;
        otpExpiresInSeconds: number;
        resendCooldownSeconds: number;
      }>('/auth/email/change/request', {
        method: 'POST',
        body: {
          newEmail: newEmail.trim(),
          ...(currentPassword ? { currentPassword } : {}),
        },
      });
    },
    [],
  );

  const confirmEmailChange = useCallback(
    async (code: string): Promise<StoredUserSummary> => {
      const res = await apiClient.request<{
        message: string;
        user: StoredUserSummary;
      }>('/auth/email/change/confirm', {
        method: 'POST',
        body: { code: code.trim() },
      });

      const current = apiClient.getInMemorySession();
      if (current) {
        const nextStored: StoredAuthSession = {
          ...current,
          user: res.user,
        };
        apiClient.setInMemorySession(nextStored);
        await secureStorage.saveSession(nextStored);
      }
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const updateAppLockTimeout = useCallback(
    async (timeoutSeconds: number) => {
      if (!user) {
        throw new Error('Not authenticated.');
      }

      await apiClient.request('/users/me/security', {
        method: 'PATCH',
        body: {
          appLockTimeoutSeconds: timeoutSeconds,
        },
      });

      const existingLock = await secureStorage.loadAppLockState(user.id);
      if (existingLock) {
        await secureStorage.saveAppLockState({
          ...existingLock,
          appLockTimeoutSeconds: timeoutSeconds,
        });
      }

      await refreshProfile();
    },
    [refreshProfile, user],
  );

  const deleteAccount = useCallback(
    async (params?: {
      confirmationText?: string;
      password?: string;
      pin?: string;
    }) => {
      await apiClient.request<{ message: string; deletedAt: string }>(
        '/auth/account/delete',
        {
          method: 'POST',
          body: {
            confirmationText: params?.confirmationText || 'DELETE',
            ...(params?.password ? { password: params.password } : {}),
            ...(params?.pin ? { pin: params.pin } : {}),
          },
        },
      );

      // Only clear local session once the backend has confirmed deletion
      await signOutGoogleSilently();
      await secureStorage.clearAll();
      await apiClient.invalidateLocalSession('ACCOUNT_DELETED');
    },
    [],
  );

  const logout = useCallback(async () => {
    const current = apiClient.getInMemorySession();
    try {
      await apiClient.request('/auth/logout', {
        method: 'POST',
        body: { refreshToken: current?.refreshToken },
      });
    } catch {
      // Always clear local credentials even if network request fails
    } finally {
      await signOutGoogleSilently();
      await secureStorage.clearAll();
      await apiClient.invalidateLocalSession('USER_LOGOUT');
    }
  }, []);

  const logoutAllDevices = useCallback(async () => {
    try {
      await apiClient.request('/auth/logout-all', {
        method: 'POST',
      });
    } finally {
      await signOutGoogleSilently();
      await secureStorage.clearAll();
      await apiClient.invalidateLocalSession('USER_LOGOUT_ALL');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      currentSessionId,
      pendingVerificationEmail,
      otpResendCooldownSeconds,
      supportedBiometry,
      isOfflineBannerVisible,
      openPendingVerification,
      exitPendingVerification,
      register,
      resendVerificationOtp,
      confirmEmailOtp,
      login,
      signInWithGoogle,
      signInWithApple,
      requestPasswordReset,
      confirmPasswordReset,
      changePassword,
      unlockWithBiometrics,
      unlockWithPin,
      lockNow,
      fetchSecurityPreferences,
      toggleBiometrics,
      completeBiometricOnboarding,
      skipBiometricOnboarding,
      configurePin,
      linkSocialProvider,
      unlinkSocialProvider,
      fetchSessions,
      revokeSession,
      reportSuspiciousSession,
      revokeOtherSessions,
      updateProfile,
      requestEmailChange,
      confirmEmailChange,
      updateAppLockTimeout,
      deleteAccount,
      logout,
      logoutAllDevices,
      refreshProfile,
    }),
    [
      status,
      user,
      currentSessionId,
      pendingVerificationEmail,
      otpResendCooldownSeconds,
      supportedBiometry,
      isOfflineBannerVisible,
      openPendingVerification,
      exitPendingVerification,
      register,
      resendVerificationOtp,
      confirmEmailOtp,
      login,
      signInWithGoogle,
      signInWithApple,
      requestPasswordReset,
      confirmPasswordReset,
      changePassword,
      unlockWithBiometrics,
      unlockWithPin,
      lockNow,
      fetchSecurityPreferences,
      toggleBiometrics,
      completeBiometricOnboarding,
      skipBiometricOnboarding,
      configurePin,
      linkSocialProvider,
      unlinkSocialProvider,
      fetchSessions,
      revokeSession,
      reportSuspiciousSession,
      revokeOtherSessions,
      updateProfile,
      requestEmailChange,
      confirmEmailChange,
      updateAppLockTimeout,
      deleteAccount,
      logout,
      logoutAllDevices,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

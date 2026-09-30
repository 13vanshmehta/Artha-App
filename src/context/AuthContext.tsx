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
  confirmEmailOtp: (params: { email: string; code: string }) => Promise<void>;
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
  revokeOtherSessions: () => Promise<{ message: string; revokedCount: number }>;
  updateProfile: (displayName: string) => Promise<StoredUserSummary>;
  updateAppLockTimeout: (timeoutSeconds: number) => Promise<void>;
  deleteAccount: (params: {
    confirmationText: string;
    password?: string;
    pin?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

      // Refresh if access token is expired or expiring within 30s
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
        }>('/auth/me', { method: 'GET' });

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
        const shouldLock =
          Boolean(
            meRes.user.securityPreferences?.biometricEnabled ||
              meRes.user.securityPreferences?.pinEnabled ||
              localLock?.biometricEnabled ||
              localLock?.pinEnabled,
          );

        setStatus(shouldLock ? 'locked' : 'authenticated');
      } catch (err) {
        if (!mounted) return;
        if (err instanceof ApiError && err.errorCode === 'NETWORK_ERROR') {
          // Offline session restoration with cached Keychain session
          setUser(activeSession.user);
          setCurrentSessionId(activeSession.sessionId);
          setIsOfflineBannerVisible(true);
          const localLock = await secureStorage.loadAppLockState(
            activeSession.user.id,
          );
          const shouldLock = Boolean(
            activeSession.user.securityPreferences?.biometricEnabled ||
              activeSession.user.securityPreferences?.pinEnabled ||
              localLock?.biometricEnabled ||
              localLock?.pinEnabled,
          );
          setStatus(shouldLock ? 'locked' : 'authenticated');
        } else {
          await apiClient.invalidateLocalSession('RESTORE_FAILED');
          setStatus('unauthenticated');
        }
      }
    }

    restore();

    return () => {
      mounted = false;
    };
  }, []);

  // Lock app on background -> foreground transition when Biometrics or PIN is enabled
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'background' || nextState === 'inactive') {
          backgroundTimestampRef.current = Date.now();
        } else if (nextState === 'active') {
          const bgAt = backgroundTimestampRef.current;
          backgroundTimestampRef.current = null;
          if (status === 'authenticated' && user && bgAt) {
            const timeoutSec =
              user.securityPreferences?.appLockTimeoutSeconds ?? 60;
            const elapsedSeconds = (Date.now() - bgAt) / 1000;
            const lockEnabled =
              user.securityPreferences?.biometricEnabled ||
              user.securityPreferences?.pinEnabled;
            if (lockEnabled && elapsedSeconds >= timeoutSec) {
              setStatus('locked');
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
    async (params: { email: string; code: string }) => {
      const payload = await apiClient.request<AuthSessionApiPayload>(
        '/auth/email/verification/confirm',
        {
          method: 'POST',
          authenticated: false,
          body: {
            email: params.email.trim(),
            code: params.code.trim(),
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
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === 'NETWORK_ERROR') {
        setStatus('authenticated');
        return { success: true };
      }
      await apiClient.invalidateLocalSession('SESSION_INVALID_ON_UNLOCK');
      return {
        success: false,
        errorMessage: 'Your session has expired. Please sign in again.',
      };
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
        await refreshProfile();
        setStatus('authenticated');
        return { success: true };
      } catch (err) {
        if (err instanceof ApiError && err.errorCode === 'NETWORK_ERROR') {
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
    async (displayName: string): Promise<StoredUserSummary> => {
      const res = await apiClient.request<{
        message: string;
        user: StoredUserSummary;
      }>('/auth/me', {
        method: 'PATCH',
        body: { displayName: displayName.trim() },
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
    async (params: {
      confirmationText: string;
      password?: string;
      pin?: string;
    }) => {
      await apiClient.request<{ message: string; deletedAt: string }>(
        '/auth/account/delete',
        {
          method: 'POST',
          body: {
            confirmationText: params.confirmationText,
            ...(params.password ? { password: params.password } : {}),
            ...(params.pin ? { pin: params.pin } : {}),
          },
        },
      );

      // Clear local session only after the backend confirms permanent deletion
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
      revokeOtherSessions,
      updateProfile,
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
      revokeOtherSessions,
      updateProfile,
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

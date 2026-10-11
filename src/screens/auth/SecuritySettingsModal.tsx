import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AccountPageSheetModal } from '../../components/common/AccountPageSheetModal';
import { Icon } from '../../components/common/Icon';
import {
  ActiveSessionItem,
  SecurityPreferencesDetails,
  useAuth,
} from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { formatPlatformBiometryLabel } from '../../services/secureStorage';
import { colors } from '../../theme/colors';
import { borderRadius, shadows, spacing } from '../../theme/spacing';
import { evaluatePasswordPolicy } from './AuthFlowNavigator';

export type SecuritySheetMode = 'credentials' | 'applock' | 'sessions';

interface SecuritySettingsModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: SecuritySheetMode;
}

const RELOCK_OPTIONS: Array<{ label: string; seconds: number }> = [
  { label: 'Immediately', seconds: 0 },
  { label: '30 seconds', seconds: 30 },
  { label: '1 minute', seconds: 60 },
  { label: '5 minutes', seconds: 300 },
];

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  visible,
  onClose,
  mode = 'credentials',
}) => {
  const {
    user,
    supportedBiometry,
    toggleBiometrics,
    updateAppLockTimeout,
    changePassword,
    requestPasswordReset,
    linkSocialProvider,
    unlinkSocialProvider,
    fetchSessions,
    fetchSecurityPreferences,
    revokeSession,
    revokeOtherSessions,
    lockNow,
    logout,
  } = useAuth();

  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [securityDetails, setSecurityDetails] =
    useState<SecurityPreferencesDetails | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password editor state (Screen 3: Security & Sign-In)
  const [showPasswordEditor, setShowPasswordEditor] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordFieldError, setPasswordFieldError] = useState<string | null>(
    null,
  );

  // Current session sign-out confirmation state (Screen 5: Active Sessions)
  const [confirmingCurrentRevoke, setConfirmingCurrentRevoke] = useState(false);

  const loadScreenData = useCallback(async () => {
    setLoadingData(true);
    try {
      if (mode === 'sessions') {
        const list = await fetchSessions();
        setSessions(list);
      } else if (mode === 'credentials') {
        const details = await fetchSecurityPreferences();
        setSecurityDetails(details);
      }
    } catch {
      // Keep cached user state if offline
    } finally {
      setLoadingData(false);
    }
  }, [fetchSecurityPreferences, fetchSessions, mode]);

  useEffect(() => {
    if (visible) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setPasswordFieldError(null);
      setShowPasswordEditor(false);
      setConfirmingCurrentRevoke(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      loadScreenData();
    }
  }, [loadScreenData, mode, visible]);

  const isGoogleLinked = Boolean(user?.linkedProviders?.includes('GOOGLE'));
  const hasPassword = Boolean(user?.hasPassword);
  const pinEnabled = Boolean(user?.securityPreferences?.pinEnabled);
  const biometricEnabled = Boolean(user?.securityPreferences?.biometricEnabled);
  const lockTimeoutSeconds =
    user?.securityPreferences?.appLockTimeoutSeconds ?? 60;

  // Prevent unlinking Google if it is the user's sole authentication method
  const isGoogleOnlyAuthMethod = isGoogleLinked && !hasPassword;

  const googleIdentityRecord = securityDetails?.linkedIdentities?.find(
    (item) => item.provider === 'GOOGLE',
  );

  // =========================================================================
  // HANDLERS — SCREEN 4: APP LOCK & BIOMETRICS
  // =========================================================================
  const handleToggleBiometrics = async (nextVal: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction('biometric');
    try {
      await toggleBiometrics(nextVal);
      const msg = nextVal
        ? 'Biometric app unlock enabled on this device.'
        : 'Biometric app unlock disabled.';
      setSuccessMsg(msg);
      toast.success(msg);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not update biometric setting.';
      setErrorMsg(msg);
      toast.error(msg, 'Biometric Setup Failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSelectLockTimeout = async (seconds: number) => {
    if (seconds === lockTimeoutSeconds) return;
    setErrorMsg(null);
    setBusyAction('timeout');
    try {
      await updateAppLockTimeout(seconds);
      toast.success('Auto-lock interval updated.', 'Lock Behavior');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not update auto-lock interval.';
      toast.error(msg);
    } finally {
      setBusyAction(null);
    }
  };

  // =========================================================================
  // HANDLERS — SCREEN 3: SECURITY & SIGN-IN
  // =========================================================================
  const handleUpdatePassword = async () => {
    setPasswordFieldError(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (hasPassword && !currentPassword) {
      setPasswordFieldError('Enter your current password.');
      return;
    }

    const policy = evaluatePasswordPolicy(newPassword);
    if (!policy.isValid) {
      setPasswordFieldError(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordFieldError('Password confirmation does not match.');
      return;
    }

    setBusyAction('password');
    try {
      const res = await changePassword({
        currentPassword: hasPassword ? currentPassword : undefined,
        newPassword,
        revokeOtherSessions: true,
      });
      setSuccessMsg(res.message);
      toast.success(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordEditor(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Password update failed.';
      setPasswordFieldError(msg);
      toast.error(msg, 'Password Update Failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleForgotPasswordRequest = async () => {
    if (!user?.email) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction('forgot-password');
    try {
      const res = await requestPasswordReset(user.email);
      setSuccessMsg(res.message);
      toast.info(res.message, 'Recovery Instructions Sent');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not send password recovery instructions.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusyAction(null);
    }
  };

  const handleGoogleToggle = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isGoogleLinked && isGoogleOnlyAuthMethod) {
      const msg =
        'Set an account password before unlinking Google so you do not lose access to your account.';
      setErrorMsg(msg);
      toast.warning(msg, 'Cannot Unlink Only Sign-In Method');
      return;
    }

    setBusyAction('oauth-GOOGLE');
    try {
      if (isGoogleLinked) {
        await unlinkSocialProvider('GOOGLE');
        const msg = 'Google account disconnected.';
        setSuccessMsg(msg);
        toast.info(msg);
      } else {
        const res = await linkSocialProvider('GOOGLE');
        if (!res.cancelled) {
          const msg = res.message || 'Google account connected.';
          setSuccessMsg(msg);
          toast.success(msg);
        }
      }
      await loadScreenData();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to update Google connection.';
      setErrorMsg(msg);
      toast.error(msg, 'Google Account');
    } finally {
      setBusyAction(null);
    }
  };

  const handleAppleComingSoon = () => {
    toast.warning(
      'Apple Sign-In is not yet enabled for this environment.',
      'Coming Soon',
    );
  };

  // =========================================================================
  // HANDLERS — SCREEN 5: ACTIVE SESSIONS
  // =========================================================================
  const handleRevokeSession = async (sessionId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction(`session-${sessionId}`);
    try {
      await revokeSession(sessionId);
      setSuccessMsg('Device session revoked.');
      toast.info('Device session revoked.');
      await loadScreenData();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to revoke session.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction('revoke-others');
    try {
      const res = await revokeOtherSessions();
      setSuccessMsg(res.message);
      toast.success(res.message, 'Sessions Updated');
      await loadScreenData();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to revoke other sessions.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusyAction(null);
    }
  };

  // =========================================================================
  // HEADER CONFIGURATION BY SCREEN MODE
  // =========================================================================
  const headerMeta =
    mode === 'applock'
      ? {
          topLabel: 'App Lock & Biometrics',
          title: 'Local Device Protection',
          subtitle:
            'Protect Artha on this device using built-in biometrics or a local App PIN.',
        }
      : mode === 'sessions'
        ? {
            topLabel: 'Active Sessions',
            title: 'Signed-In Devices',
            subtitle:
              'Review devices currently signed in to your Artha account and revoke unfamiliar sessions.',
          }
        : {
            topLabel: 'Security & Sign-In',
            title: 'Credentials & Identity',
            subtitle:
              'Manage your account password, connected sign-in providers, and verification status.',
          };

  const otherActiveSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <AccountPageSheetModal
      visible={visible}
      onClose={onClose}
      topLabel={headerMeta.topLabel}
      title={headerMeta.title}
      subtitle={headerMeta.subtitle}
      closeButtonTestID="security-modal-close-btn"
      testID="security-settings-modal"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}
        {successMsg ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* ================================================================ */}
        {/* SCREEN 3: SECURITY & SIGN-IN (Server Credentials & Identities)   */}
        {/* ================================================================ */}
        {mode === 'credentials' && (
          <>
            {/* Section A — Account Credentials */}
            <Text style={styles.sectionLabel}>Account Credentials</Text>
            <View style={styles.sectionGroup}>
              <View style={styles.settingRow}>
                <View style={styles.iconBox}>
                  <Icon name="mail" size={18} color={colors.navyPrimary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Registered Email</Text>
                  <Text style={styles.settingSub} numberOfLines={1}>
                    {user?.email || 'Not available'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    user?.emailVerified
                      ? styles.statusBadgeVerified
                      : styles.statusBadgeWarning,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      user?.emailVerified
                        ? styles.statusBadgeTextVerified
                        : styles.statusBadgeTextWarning,
                    ]}
                  >
                    {user?.emailVerified ? 'Verified' : 'Unverified'}
                  </Text>
                </View>
              </View>

              <View style={styles.settingRow}>
                <View style={styles.iconBox}>
                  <Icon name="lock" size={18} color={colors.navyPrimary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Account Password</Text>
                  <Text style={styles.settingSub}>
                    {hasPassword
                      ? 'Password authentication is enabled'
                      : 'Google-only account • Set a password for direct email login'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.smallActionBtn}
                  onPress={() => {
                    setPasswordFieldError(null);
                    setShowPasswordEditor((prev) => !prev);
                  }}
                  testID="change-password-toggle-btn"
                >
                  <Text style={styles.smallActionBtnText}>
                    {hasPassword ? 'Change Password' : 'Set Password'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showPasswordEditor && (
                <View style={styles.inlineEditor}>
                  {hasPassword && (
                    <>
                      <Text style={styles.inputLabel}>Current Password</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter current password"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry
                        autoCapitalize="none"
                        value={currentPassword}
                        onChangeText={(v) => {
                          setCurrentPassword(v);
                          setPasswordFieldError(null);
                        }}
                        testID="change-current-password-input"
                      />
                    </>
                  )}

                  <Text style={styles.inputLabel}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Min 8 chars, upper, lower, number, symbol"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    value={newPassword}
                    onChangeText={(v) => {
                      setNewPassword(v);
                      setPasswordFieldError(null);
                    }}
                    testID="change-new-password-input"
                  />

                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    value={confirmNewPassword}
                    onChangeText={(v) => {
                      setConfirmNewPassword(v);
                      setPasswordFieldError(null);
                    }}
                    testID="change-confirm-password-input"
                  />

                  {passwordFieldError ? (
                    <Text style={styles.fieldErrorText}>
                      {passwordFieldError}
                    </Text>
                  ) : null}

                  <View style={styles.inlineActionsRow}>
                    <TouchableOpacity
                      style={styles.secondaryInlineBtn}
                      onPress={() => {
                        setShowPasswordEditor(false);
                        setPasswordFieldError(null);
                      }}
                    >
                      <Text style={styles.secondaryInlineBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.primaryInlineBtn}
                      onPress={handleUpdatePassword}
                      disabled={busyAction === 'password'}
                      testID="save-new-password-btn"
                    >
                      <Text style={styles.primaryInlineBtnText}>
                        {busyAction === 'password'
                          ? 'Saving...'
                          : hasPassword
                            ? 'Update Password'
                            : 'Save Password'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {hasPassword && (
                    <TouchableOpacity
                      style={styles.forgotLinkBtn}
                      onPress={handleForgotPasswordRequest}
                      disabled={busyAction === 'forgot-password'}
                    >
                      <Text style={styles.forgotLinkText}>
                        Forgot your current password? Send recovery code
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Section B — Connected Identity Providers */}
            <Text style={styles.sectionLabel}>
              Connected Identity Providers
            </Text>
            <View style={styles.sectionGroup}>
              <View style={styles.settingRow}>
                <View style={styles.iconBox}>
                  <Icon name="mail" size={18} color={colors.navyPrimary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Email & Password</Text>
                  <Text style={styles.settingSub}>
                    {hasPassword
                      ? `Enabled for ${user?.email}`
                      : 'Not configured • Using social sign-in'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    hasPassword
                      ? styles.statusBadgeVerified
                      : styles.statusBadgeNeutral,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      hasPassword
                        ? styles.statusBadgeTextVerified
                        : styles.statusBadgeTextNeutral,
                    ]}
                  >
                    {hasPassword ? 'Enabled' : 'Not Set'}
                  </Text>
                </View>
              </View>

              <View style={styles.settingRow}>
                <View style={styles.iconBox}>
                  <Icon name="globe" size={18} color={colors.navyPrimary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Google</Text>
                  <Text style={styles.settingSub}>
                    {isGoogleLinked
                      ? googleIdentityRecord?.providerEmail
                        ? `Connected (${googleIdentityRecord.providerEmail})`
                        : 'Connected'
                      : 'Not Connected'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.smallActionBtn,
                    isGoogleLinked && !isGoogleOnlyAuthMethod && styles.unlinkBtn,
                  ]}
                  onPress={handleGoogleToggle}
                  disabled={busyAction === 'oauth-GOOGLE'}
                  testID="link-google-toggle-btn"
                >
                  <Text
                    style={[
                      styles.smallActionBtnText,
                      isGoogleLinked &&
                        !isGoogleOnlyAuthMethod &&
                        styles.unlinkBtnText,
                    ]}
                  >
                    {busyAction === 'oauth-GOOGLE'
                      ? 'Working...'
                      : isGoogleLinked
                        ? 'Unlink'
                        : 'Connect'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isGoogleOnlyAuthMethod && (
                <Text style={styles.helperCaption}>
                  Google is currently your only sign-in method. Set an account
                  password above if you wish to unlink Google.
                </Text>
              )}

              <View style={styles.settingRow}>
                <View style={styles.iconBox}>
                  <Icon
                    name="smartphone"
                    size={18}
                    color={colors.navyPrimary}
                  />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Apple</Text>
                  <Text style={styles.settingSub}>
                    Unavailable • Coming soon
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.comingSoonPill}
                  onPress={handleAppleComingSoon}
                  testID="link-apple-toggle-btn"
                >
                  <Text style={styles.comingSoonPillText}>Coming Soon</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section C — Security Information */}
            <Text style={styles.sectionLabel}>Security Information</Text>
            <View style={styles.infoSummaryCard}>
              <View style={styles.infoSummaryRow}>
                <Text style={styles.infoSummaryLabel}>Email Verification</Text>
                <Text style={styles.infoSummaryValue}>
                  {user?.emailVerified
                    ? user.emailVerifiedAt
                      ? `Verified (${new Date(user.emailVerifiedAt).toLocaleDateString()})`
                      : 'Verified'
                    : 'Pending Verification'}
                </Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoSummaryRow}>
                <Text style={styles.infoSummaryLabel}>Current Session</Text>
                <Text style={styles.infoSummaryValue}>Active & Verified</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoSummaryRow}>
                <Text style={styles.infoSummaryLabel}>Sign-In Methods</Text>
                <Text style={styles.infoSummaryValue}>
                  {[
                    hasPassword ? 'Password' : null,
                    isGoogleLinked ? 'Google' : null,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Authenticated Session'}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* ================================================================ */}
        {/* SCREEN 4: APP LOCK & BIOMETRICS (Local Device Protection Only)   */}
        {/* ================================================================ */}
        {mode === 'applock' && (
          <>
            {/* Active Protection Status Banner */}
            <View style={styles.statusSummaryCard}>
              <View style={styles.iconBox}>
                <Icon name="shield" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Active Protection Mode</Text>
                <Text style={styles.settingSub}>
                  {!supportedBiometry
                    ? 'Unavailable on this device (No hardware or enrollment)'
                    : biometricEnabled || pinEnabled
                      ? `${formatPlatformBiometryLabel(supportedBiometry)} & ${
                          Platform.OS === 'ios'
                            ? 'Device Passcode'
                            : 'Device PIN'
                        } (System Default)`
                      : 'Off (No local lock enabled)'}
                </Text>
              </View>
            </View>

            {/* Section A — System Biometric & Device PIN Unlock */}
            <Text style={styles.sectionLabel}>
              {supportedBiometry
                ? Platform.OS === 'ios'
                  ? `System ${formatPlatformBiometryLabel(supportedBiometry)} & Passcode`
                  : 'System Fingerprint / Face & Device PIN'
                : 'Biometric Unlock'}
            </Text>
            <View style={styles.sectionGroup}>
              <View style={styles.settingRow}>
                <View style={styles.iconBox}>
                  <Icon
                    name={supportedBiometry ? 'shield' : 'info'}
                    size={19}
                    color={colors.navyPrimary}
                  />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>
                    {supportedBiometry
                      ? Platform.OS === 'ios'
                        ? `System ${formatPlatformBiometryLabel(supportedBiometry)} & Passcode`
                        : 'System Fingerprint / Face & Device PIN'
                      : 'Biometric Authentication'}
                  </Text>
                  <Text style={styles.settingSub}>
                    {supportedBiometry
                      ? Platform.OS === 'ios'
                        ? 'Uses your iPhone’s built-in Face ID (or Touch ID) and native device passcode'
                        : 'Uses your Android device’s built-in Fingerprint, Face Unlock, or screen lock PIN'
                      : 'Biometric hardware is not available or not enrolled on this device.'}
                  </Text>
                </View>
                {supportedBiometry ? (
                  <Switch
                    value={biometricEnabled || pinEnabled}
                    onValueChange={handleToggleBiometrics}
                    disabled={busyAction === 'biometric'}
                    trackColor={{
                      false: '#CBD5E1',
                      true: colors.bluePrimary,
                    }}
                    thumbColor={colors.white}
                    testID="toggle-biometrics-switch"
                  />
                ) : (
                  <View style={[styles.statusBadge, styles.statusBadgeNeutral]}>
                    <Text
                      style={[
                        styles.statusBadgeText,
                        styles.statusBadgeTextNeutral,
                      ]}
                    >
                      Unavailable
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.settingRow}>
                <View style={styles.iconBox}>
                  <Icon name="lock" size={18} color={colors.navyPrimary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>
                    System PIN / Passcode Fallback
                  </Text>
                  <Text style={styles.settingSub}>
                    Automatically handled by your device’s native lock screen
                    when biometrics are unavailable
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    biometricEnabled || pinEnabled
                      ? styles.statusBadgeVerified
                      : styles.statusBadgeNeutral,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      biometricEnabled || pinEnabled
                        ? styles.statusBadgeTextVerified
                        : styles.statusBadgeTextNeutral,
                    ]}
                  >
                    {biometricEnabled || pinEnabled ? 'System Default' : 'Off'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Section C — Lock Behavior */}
            <Text style={styles.sectionLabel}>Lock Behavior</Text>
            <View style={styles.sectionGroup}>
              <Text style={styles.helperCaption}>
                When App Lock is enabled, Artha locks automatically after being
                in the background for the selected interval:
              </Text>
              <View style={styles.timeoutPillsWrap}>
                {RELOCK_OPTIONS.map((opt) => {
                  const selected = lockTimeoutSeconds === opt.seconds;
                  return (
                    <TouchableOpacity
                      key={opt.seconds}
                      style={[
                        styles.timeoutChip,
                        selected && styles.timeoutChipActive,
                      ]}
                      disabled={busyAction === 'timeout'}
                      onPress={() => handleSelectLockTimeout(opt.seconds)}
                    >
                      <Text
                        style={[
                          styles.timeoutChipText,
                          selected && styles.timeoutChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.lockNowBtn}
                onPress={() => {
                  onClose();
                  lockNow();
                }}
                testID="lock-app-now-btn"
              >
                <Icon name="lock" size={16} color={colors.navyPrimary} />
                <Text style={styles.lockNowText}>Lock Artha Now</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ================================================================ */}
        {/* SCREEN 5: ACTIVE SESSIONS (Dedicated Session Management)         */}
        {/* ================================================================ */}
        {mode === 'sessions' && (
          <>
            <Text style={styles.sectionLabel}>Active Device Sessions</Text>
            <View style={styles.sectionGroup}>
              {loadingData ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={colors.navyPrimary} />
                </View>
              ) : sessions.length === 0 ? (
                <View style={styles.settingRow}>
                  <View style={styles.iconBox}>
                    <Icon
                      name="smartphone"
                      size={18}
                      color={colors.navyPrimary}
                    />
                  </View>
                  <View style={styles.settingInfo}>
                    <View style={styles.sessionTitleRow}>
                      <Text style={styles.settingTitle}>Current Device</Text>
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>THIS DEVICE</Text>
                      </View>
                    </View>
                    <Text style={styles.settingSub}>
                      Authenticated session active
                    </Text>
                  </View>
                </View>
              ) : (
                sessions.map((sess) => (
                  <View key={sess.id} style={styles.settingRow}>
                    <View style={styles.iconBox}>
                      <Icon
                        name="smartphone"
                        size={18}
                        color={colors.navyPrimary}
                      />
                    </View>
                    <View style={styles.settingInfo}>
                      <View style={styles.sessionTitleRow}>
                        <Text style={styles.settingTitle}>
                          {sess.deviceName}
                        </Text>
                        {sess.isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>
                              THIS DEVICE
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.settingSub}>
                        {sess.platform.toUpperCase()} • Last active{' '}
                        {new Date(sess.lastUsedAt).toLocaleString()}
                      </Text>
                    </View>
                    {!sess.isCurrent ? (
                      <TouchableOpacity
                        style={[styles.smallActionBtn, styles.unlinkBtn]}
                        onPress={() => handleRevokeSession(sess.id)}
                        disabled={busyAction === `session-${sess.id}`}
                        testID={`revoke-session-${sess.id}`}
                      >
                        <Text
                          style={[
                            styles.smallActionBtnText,
                            styles.unlinkBtnText,
                          ]}
                        >
                          {busyAction === `session-${sess.id}`
                            ? 'Revoking...'
                            : 'Revoke'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              )}
            </View>

            {/* Session Actions */}
            <View style={styles.logoutActionsWrap}>
              {otherActiveSessionsCount > 0 && (
                <TouchableOpacity
                  style={styles.logoutAllBtn}
                  onPress={handleRevokeAllOtherSessions}
                  disabled={busyAction === 'revoke-others'}
                  testID="revoke-other-sessions-btn"
                >
                  <Icon name="shield" size={16} color={colors.negative} />
                  <Text style={styles.logoutAllText}>
                    {busyAction === 'revoke-others'
                      ? 'Revoking Other Sessions...'
                      : `Revoke All Other Sessions (${otherActiveSessionsCount})`}
                  </Text>
                </TouchableOpacity>
              )}

              {!confirmingCurrentRevoke ? (
                <TouchableOpacity
                  style={styles.logoutCurrentBtn}
                  onPress={() => setConfirmingCurrentRevoke(true)}
                  testID="logout-current-device-btn"
                >
                  <Icon name="logOut" size={17} color={colors.navyPrimary} />
                  <Text style={styles.logoutCurrentText}>
                    Revoke Current Session (Log Out)
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.inlineEditor}>
                  <Text style={styles.settingTitle}>
                    Log out of this device?
                  </Text>
                  <Text style={styles.settingSub}>
                    Revoking the current session will sign you out and return to
                    the welcome screen.
                  </Text>
                  <View style={styles.inlineActionsRow}>
                    <TouchableOpacity
                      style={styles.secondaryInlineBtn}
                      onPress={() => setConfirmingCurrentRevoke(false)}
                    >
                      <Text style={styles.secondaryInlineBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dangerInlineBtn}
                      onPress={() => {
                        onClose();
                        logout();
                      }}
                      testID="confirm-revoke-current-session-btn"
                    >
                      <Text style={styles.dangerInlineBtnText}>Log Out</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </AccountPageSheetModal>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 60,
  },
  loadingWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: colors.negativeBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.negative,
    fontSize: 12.5,
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: colors.positiveBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: {
    color: colors.positive,
    fontSize: 12.5,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.heroGradientStart,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  sectionGroup: {
    gap: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 66,
    paddingVertical: 10,
    gap: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(111, 181, 238, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navyDeep,
  },
  settingSub: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
  },
  statusBadgeVerified: {
    backgroundColor: colors.positiveBg,
  },
  statusBadgeWarning: {
    backgroundColor: colors.warningBg,
  },
  statusBadgeNeutral: {
    backgroundColor: 'rgba(10, 40, 85, 0.08)',
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  statusBadgeTextVerified: {
    color: colors.positive,
  },
  statusBadgeTextWarning: {
    color: colors.warning,
  },
  statusBadgeTextNeutral: {
    color: colors.textSecondary,
  },
  comingSoonPill: {
    backgroundColor: 'rgba(10, 40, 85, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.12)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
  },
  comingSoonPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textMuted,
  },
  smallActionBtn: {
    backgroundColor: colors.white,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.16)',
  },
  smallActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.navyPrimary,
  },
  unlinkBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderColor: 'rgba(220, 38, 38, 0.22)',
  },
  unlinkBtnText: {
    color: colors.negative,
  },
  helperCaption: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
    marginBottom: 6,
  },
  inlineEditor: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.12)',
    ...shadows.subtle,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.navyDeep,
    marginBottom: 6,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: '#FAFCFF',
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.14)',
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: '500',
    color: colors.navyDeep,
  },
  fieldErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.negative,
    marginTop: 8,
  },
  inlineActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryInlineBtn: {
    flex: 1,
    backgroundColor: colors.navyPrimary,
    paddingVertical: 12,
    borderRadius: borderRadius.round,
    alignItems: 'center',
  },
  primaryInlineBtnText: {
    color: colors.white,
    fontSize: 13.5,
    fontWeight: '700',
  },
  secondaryInlineBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.16)',
    paddingVertical: 12,
    borderRadius: borderRadius.round,
    alignItems: 'center',
  },
  secondaryInlineBtnText: {
    color: colors.navyDeep,
    fontSize: 13.5,
    fontWeight: '700',
  },
  dangerInlineBtn: {
    flex: 1,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    paddingVertical: 12,
    borderRadius: borderRadius.round,
    alignItems: 'center',
  },
  dangerInlineBtnText: {
    color: colors.negative,
    fontSize: 13.5,
    fontWeight: '700',
  },
  forgotLinkBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: 4,
  },
  forgotLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.heroGradientStart,
  },
  infoSummaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  infoSummaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoSummaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navyDeep,
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(10, 40, 85, 0.07)',
  },
  statusSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderBlue,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  pinQuickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -2,
    marginBottom: 4,
  },
  removePinOutlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  removePinOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.negative,
  },
  timeoutPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  timeoutChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.round,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.14)',
  },
  timeoutChipActive: {
    backgroundColor: colors.navyPrimary,
    borderColor: colors.navyPrimary,
  },
  timeoutChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.navyDeep,
  },
  timeoutChipTextActive: {
    color: colors.white,
  },
  lockNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(111, 181, 238, 0.16)',
    paddingVertical: 13,
    borderRadius: borderRadius.round,
    marginTop: spacing.sm,
  },
  lockNowText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.navyPrimary,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  currentBadge: {
    backgroundColor: colors.positiveBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  currentBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.positive,
  },
  logoutActionsWrap: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  logoutCurrentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.16)',
    paddingVertical: 14,
    borderRadius: borderRadius.round,
  },
  logoutCurrentText: {
    color: colors.navyDeep,
    fontSize: 14.5,
    fontWeight: '700',
  },
  logoutAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    paddingVertical: 14,
    borderRadius: borderRadius.round,
  },
  logoutAllText: {
    color: colors.negative,
    fontSize: 14,
    fontWeight: '700',
  },
});

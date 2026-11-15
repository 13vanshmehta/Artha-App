import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Switch,
  Modal,
  Share,
  ActivityIndicator,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { Icon, IconName } from '../components/common/Icon';
import { AppIcon, AppIconName } from '../components/icons/AppIcon';
import { AccountPageSheetModal } from '../components/common/AccountPageSheetModal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from '../context/ToastContext';
import {
  SessionItem,
  fetchActiveSessions,
  revokeSession as apiRevokeSession,
  reportSuspiciousSession as apiReportSuspiciousSession,
  revokeAllOtherSessions as apiRevokeAllOtherSessions,
  formatLastActive,
  platformIcon,
} from '../services/sessionsApi';

interface AccountScreenProps {
  onScrollingChange?: (isScrolling: boolean) => void;
}

interface OverviewRowItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: IconName;
  trailingValue?: string;
  onPress: () => void;
  testID?: string;
}

type DetailSheetKey =
  | null
  | 'manage_profile'
  | 'account_settings'
  | 'account_security'
  | 'appearance'
  | 'notifications'
  | 'applock'
  | 'sessions'
  | 'help_center'
  | 'blocked_users';

const PIN_KEYPAD_ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'DEL'],
];

// SessionItem is imported from sessionsApi -- no local mock data

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
];

const TIMEZONES = [
  { id: 'Asia/Kolkata', label: 'Asia/Kolkata (GMT+5:30)' },
  { id: 'UTC', label: 'UTC (GMT+0:00)' },
  { id: 'America/New_York', label: 'New York (GMT-5:00)' },
  { id: 'Europe/London', label: 'London (GMT+0:00)' },
  { id: 'Asia/Dubai', label: 'Dubai (GMT+4:00)' },
];

const LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Hindi', label: 'हिन्दी' },
  { code: 'Spanish', label: 'Español' },
  { code: 'French', label: 'Français' },
];

const FAQ_ITEMS = [
  {
    q: 'How does Artha track expenses?',
    a: 'Artha securely tracks your transactions, categorizes your spending automatically, and syncs across all your authorized devices.',
  },
  {
    q: 'How does Group bill splitting work?',
    a: 'Create a group, add members, log shared bills, and Artha calculates simplified settlements with UPI support.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted in transit and at rest. Device security protects your app with Biometrics and PIN.',
  },
];

export const AccountScreen: React.FC<AccountScreenProps> = ({
  onScrollingChange,
}) => {
  const {
    user,
    logout,
    refreshProfile,
    updateProfile,
    requestEmailChange,
    confirmEmailChange,
    deleteAccount,
    changePassword,
    requestPasswordReset,
    confirmPasswordReset,
    supportedBiometry,
    toggleBiometrics,
    configurePin,
  } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [activeSheet, setActiveSheet] = useState<DetailSheetKey>(null);

  // Global Theme Hook
  const { theme, isDark, toggleTheme, setTheme, colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors, isDark), [themeColors, isDark]);

  // Account Settings state
  const [currency, setCurrency] = useState('INR');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [language, setLanguage] = useState('English');
  const [openDropdown, setOpenDropdown] = useState<'currency' | 'timezone' | 'language' | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [newBlockedUserEmail, setNewBlockedUserEmail] = useState('');

  const toggleDropdown = useCallback(
    (key: 'currency' | 'timezone' | 'language') => {
      setOpenDropdown((prev) => (prev === key ? null : key));
    },
    [],
  );

  // Notification toggles
  const [notifExpense, setNotifExpense] = useState(true);
  const [notifGroup, setNotifGroup] = useState(true);
  const [notifBudget, setNotifBudget] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(true);

  // Manage Profile state
  const [profileNameInput, setProfileNameInput] = useState(user?.displayName ?? '');
  const [profileEmailInput, setProfileEmailInput] = useState(user?.email ?? '');
  const [profilePhoneInput, setProfilePhoneInput] = useState(user?.phoneNumber ?? '+91 98765 43210');
  const [savingProfile, setSavingProfile] = useState(false);
  const [nameFieldError, setNameFieldError] = useState<string | null>(null);

  // Email verification modal during email change
  const [showEmailPasswordStep, setShowEmailPasswordStep] = useState(false);
  const [showEmailVerifyStep, setShowEmailVerifyStep] = useState(false);
  const [pendingNewEmail, setPendingNewEmail] = useState('');
  const [emailChangePassword, setEmailChangePassword] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [requestingEmailOtp, setRequestingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);

  // Account Security state
  const [currPasswordInput, setCurrPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Forgot password OTP inside Security
  const [securityForgotStep, setSecurityForgotStep] = useState<'idle' | 'otp_sent'>('idle');
  const [securityForgotOtp, setSecurityForgotOtp] = useState('');
  const [securityForgotNewPass, setSecurityForgotNewPass] = useState('');
  const [sendingSecurityForgotOtp, setSendingSecurityForgotOtp] = useState(false);

  // App Lock & Biometric state
  const [biometricLoginEnabled, setBiometricLoginEnabled] = useState(
    user?.securityPreferences?.biometricEnabled ?? false,
  );
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(
    user?.securityPreferences?.pinEnabled ?? false,
  );
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [pinDraft, setPinDraft] = useState('');
  const [pinCurrent, setPinCurrent] = useState('');
  const [pinErrorMsg, setPinErrorMsg] = useState<string | null>(null);
  const [savingPin, setSavingPin] = useState(false);
  const [showPinDisableModal, setShowPinDisableModal] = useState(false);
  const [pinDisableCurrent, setPinDisableCurrent] = useState('');
  const [pinDisableError, setPinDisableError] = useState<string | null>(null);
  const [disablingPin, setDisablingPin] = useState(false);
  const isBiometricSupported = Boolean(supportedBiometry);

  // Active Sessions state — real data fetched from backend
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokeAllConfirmVisible, setRevokeAllConfirmVisible] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);
  const [currentDeviceLogoutConfirmVisible, setCurrentDeviceLogoutConfirmVisible] = useState(false);
  const [passwordChoiceModalVisible, setPasswordChoiceModalVisible] = useState(false);
  const [sessionActionBusy, setSessionActionBusy] = useState<string | null>(null);

  // Confirmation Modals
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Sync state when user profile updates
  useEffect(() => {
    if (user?.displayName) setProfileNameInput(user.displayName);
    if (user?.email) setProfileEmailInput(user.email);
    if (user?.phoneNumber) setProfilePhoneInput(user.phoneNumber);
  }, [user]);

  // Keep the biometric switch in sync with the actual enrolled state on this
  // device (updated via refreshProfile() after a successful enroll/clear)
  useEffect(() => {
    setBiometricLoginEnabled(user?.securityPreferences?.biometricEnabled ?? false);
  }, [user?.securityPreferences?.biometricEnabled]);

  // Keep the PIN switch in sync with the actual server/device state (updated
  // via refreshProfile() after a successful enable/disable)
  useEffect(() => {
    setPinEnabled(user?.securityPreferences?.pinEnabled ?? false);
  }, [user?.securityPreferences?.pinEnabled]);

  // Determine if user authenticated via Social Provider (Google / Apple)
  const isSocialUser = Boolean(
    user?.provider === 'google' ||
    user?.provider === 'apple' ||
    user?.linkedProviders?.includes('GOOGLE') ||
    user?.linkedProviders?.includes('APPLE') ||
    (user && !user.hasPassword),
  );

  const socialProviderName =
    user?.provider === 'google' || user?.linkedProviders?.includes('GOOGLE')
      ? 'Google'
      : user?.provider === 'apple' || user?.linkedProviders?.includes('APPLE')
        ? 'Apple'
        : 'Google';

  // Smooth scroll tracker
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Micro-animations for PIN Setup & PIN Disable modals
  const pinDotAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  const pinShakeAnim = useRef(new Animated.Value(0)).current;

  const animatePinDot = (index: number) => {
    if (index < 0 || index >= 4) return;
    pinDotAnims[index].setValue(0.7);
    Animated.spring(pinDotAnims[index], {
      toValue: 1,
      friction: 4,
      tension: 160,
      useNativeDriver: true,
    }).start();
  };

  const triggerPinShake = () => {
    pinShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(pinShakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(pinShakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(pinShakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(pinShakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(pinShakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
    ]).start();
  };
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScrollingChange?.(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        onScrollingChange?.(false);
      }, 150);
    },
    [onScrollingChange],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } catch {
      // Ignore
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile]);

  // Initials generator
  const getInitials = (name?: string | null): string => {
    if (!name) return 'VM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Appearance: 2 options only in-app (Light and Dark). Default remains system theme on initial load.
  const handleSelectTheme = (newMode: 'light' | 'dark') => {
    if (theme === newMode) {
      return;
    }
    setTheme(newMode);
    toast.info(`Theme set to ${newMode === 'dark' ? 'Dark' : 'Light'}.`, 'Appearance');
  };

  // 1. Profile Updation
  const handleSaveProfile = async () => {
    if (!profileNameInput.trim()) {
      setNameFieldError('Name is required.');
      return;
    }
    setNameFieldError(null);

    // If email is changed by non-social user, require password confirmation
    // before requesting a verification code for the new address.
    const emailChanged =
      !isSocialUser &&
      profileEmailInput.trim().toLowerCase() !== (user?.email ?? '').toLowerCase();

    if (emailChanged) {
      setPendingNewEmail(profileEmailInput.trim());
      setEmailChangePassword('');
      setShowEmailPasswordStep(true);
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        displayName: profileNameInput.trim(),
        phoneNumber: profilePhoneInput.trim(),
      });
      toast.success('Profile updated successfully.', 'Profile Saved');
      setActiveSheet(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile.', 'Error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestEmailChangeOtp = async () => {
    if (!emailChangePassword) {
      toast.error('Enter your current password to continue.', 'Password Required');
      return;
    }
    setRequestingEmailOtp(true);
    try {
      const res = await requestEmailChange(pendingNewEmail, emailChangePassword);
      setShowEmailPasswordStep(false);
      setShowEmailVerifyStep(true);
      setEmailChangePassword('');
      toast.info(res.message, 'Verify Email');
    } catch (err: any) {
      toast.error(err?.message || 'Could not send verification code.', 'Error');
    } finally {
      setRequestingEmailOtp(false);
    }
  };

  const handleConfirmEmailOtp = async () => {
    if (emailOtpCode.trim().length < 6) {
      toast.error('Enter valid 6-digit code.', 'Verification');
      return;
    }
    setVerifyingEmailOtp(true);
    try {
      await confirmEmailChange(emailOtpCode.trim());
      setShowEmailVerifyStep(false);
      setEmailOtpCode('');
      toast.success('Email address updated.', 'Profile Saved');
      setActiveSheet(null);
    } catch (err: any) {
      toast.error(err?.message || 'Invalid code.', 'Verification Failed');
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  // 2. Password Updates
  const handleChangePassword = async () => {
    if (!currPasswordInput) {
      toast.error('Enter your current password.', 'Password');
      return;
    }
    if (newPasswordInput.length < 8) {
      toast.error('Password must be at least 8 characters.', 'Password');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      toast.error('Passwords do not match.', 'Password');
      return;
    }

    setUpdatingPassword(true);
    try {
      await changePassword({
        currentPassword: currPasswordInput,
        newPassword: newPasswordInput,
        revokeOtherSessions: true,
      });
      setCurrPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      toast.success(
        'Password changed successfully. Other devices have been signed out.',
        'Security',
      );
      setPasswordChoiceModalVisible(false);
      setActiveSheet(null);
      loadSessions();
    } catch (err: any) {
      toast.error(err?.message || 'Could not update password.', 'Security');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSendSecurityForgotOtp = async () => {
    if (!user?.email) return;
    setSendingSecurityForgotOtp(true);
    try {
      await requestPasswordReset(user.email);
      setSecurityForgotStep('otp_sent');
      toast.info(`Reset code sent to ${user.email}.`, 'Reset Password');
    } catch (err: any) {
      toast.error(err?.message || 'Could not send reset code.', 'Error');
    } finally {
      setSendingSecurityForgotOtp(false);
    }
  };

  const handleConfirmSecurityForgot = async () => {
    if (!user?.email || securityForgotOtp.trim().length < 6) {
      toast.error('Enter valid 6-digit OTP code.', 'Reset Password');
      return;
    }
    if (securityForgotNewPass.length < 8) {
      toast.error('New password must be at least 8 characters.', 'Reset Password');
      return;
    }
    setSendingSecurityForgotOtp(true);
    try {
      await confirmPasswordReset({
        email: user.email,
        resetToken: securityForgotOtp.trim(),
        newPassword: securityForgotNewPass,
      });
      setSecurityForgotStep('idle');
      setSecurityForgotOtp('');
      setSecurityForgotNewPass('');
      toast.success(
        'Password reset successfully. Other devices have been signed out.',
        'Security',
      );
      setPasswordChoiceModalVisible(false);
      setActiveSheet(null);
      loadSessions();
    } catch (err: any) {
      toast.error(err?.message || 'Invalid reset code.', 'Reset Failed');
    } finally {
      setSendingSecurityForgotOtp(false);
    }
  };

  // 3. Biometric and App Password
  const handleToggleBiometric = async (val: boolean) => {
    if (biometricBusy) return;

    if (val && !isBiometricSupported) {
      toast.error(
        'Biometric authentication is not available or not enrolled on this device.',
        'Device Security',
      );
      return;
    }

    setBiometricBusy(true);
    try {
      await toggleBiometrics(val);
      setBiometricLoginEnabled(val);
      toast.success(
        val ? 'Biometric login enabled.' : 'Biometric login disabled.',
        'Device Security',
      );
    } catch (err: any) {
      // Revert the switch — the native enrollment/verification did not succeed
      setBiometricLoginEnabled(!val);
      toast.error(
        err?.message ?? 'Could not update biometric login.',
        'Device Security',
      );
    } finally {
      setBiometricBusy(false);
    }
  };

  const handlePinDigitPress = (digit: string) => {
    if (savingPin || digit === '') return;
    setPinErrorMsg(null);

    if (digit === 'DEL') {
      if (pinCurrent.length > 0) {
        animatePinDot(pinCurrent.length - 1);
        setPinCurrent((prev) => prev.slice(0, -1));
      }
      return;
    }

    if (pinCurrent.length < 4) {
      const next = pinCurrent + digit;
      animatePinDot(next.length - 1);
      setPinCurrent(next);
      if (next.length === 4) {
        if (pinStep === 'enter') {
          setTimeout(() => {
            setPinDraft(next);
            setPinCurrent('');
            setPinStep('confirm');
          }, 100);
        } else {
          if (next === pinDraft) {
            handleCompletePinSetup(next);
          } else {
            setPinErrorMsg('PINs do not match. Please try again.');
            triggerPinShake();
            setTimeout(() => {
              setPinStep('enter');
              setPinDraft('');
              setPinCurrent('');
            }, 600);
          }
        }
      }
    }
  };

  const handleCompletePinSetup = async (finalPin: string) => {
    setSavingPin(true);
    setPinErrorMsg(null);
    try {
      await configurePin({ enable: true, newPin: finalPin });
      setShowPinSetupModal(false);
      setPinStep('enter');
      setPinDraft('');
      setPinCurrent('');
      toast.success('4-digit App PIN configured successfully.', 'App Security');
    } catch (err: any) {
      setPinErrorMsg(err?.message ?? 'Could not configure app PIN.');
      triggerPinShake();
    } finally {
      setSavingPin(false);
    }
  };

  const openPinSetup = () => {
    setPinStep('enter');
    setPinDraft('');
    setPinCurrent('');
    setPinErrorMsg(null);
    setShowPinSetupModal(true);
  };

  const handleTogglePin = (val: boolean) => {
    if (disablingPin) return;
    if (val) {
      openPinSetup();
    } else {
      setPinDisableCurrent('');
      setPinDisableError(null);
      setShowPinDisableModal(true);
    }
  };

  const handlePinDisableDigitPress = (digit: string) => {
    if (disablingPin || digit === '') return;
    setPinDisableError(null);

    if (digit === 'DEL') {
      if (pinDisableCurrent.length > 0) {
        animatePinDot(pinDisableCurrent.length - 1);
        setPinDisableCurrent((prev) => prev.slice(0, -1));
      }
      return;
    }

    if (pinDisableCurrent.length < 4) {
      const next = pinDisableCurrent + digit;
      animatePinDot(next.length - 1);
      setPinDisableCurrent(next);
      if (next.length === 4) {
        handleConfirmDisablePin(next);
      }
    }
  };

  const handleConfirmDisablePin = async (currentPin: string) => {
    setDisablingPin(true);
    setPinDisableError(null);
    try {
      await configurePin({ enable: false, currentPin });
      setShowPinDisableModal(false);
      setPinDisableCurrent('');
      toast.success('App Lock PIN removed.', 'App Security');
    } catch (err: any) {
      setPinDisableError(err?.message ?? 'Incorrect PIN. Please try again.');
      triggerPinShake();
      setPinDisableCurrent('');
    } finally {
      setDisablingPin(false);
    }
  };

  // 4. Active Sessions — real backend integration

  /** Loads sessions from backend. Called when the Sessions sheet opens. */
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await fetchActiveSessions();
      setSessions(data);
    } catch (err: any) {
      toast.error(
        err?.message ?? 'Could not load active sessions.',
        'Sessions',
      );
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // Load real sessions from backend when the sessions sheet opens
  useEffect(() => {
    if (activeSheet === 'sessions') {
      loadSessions();
    }
  }, [activeSheet, loadSessions]);

  /** Confirm that a session is recognised — UI only (keeps it in list). */
  const handleKeepSession = (id: string) => {
    toast.success('Session confirmed.', 'Active Sessions');
  };

  /**
   * Revoke a specific session.
   * - If it's the current device: redirect to confirmation modal for current device logout.
   * - Otherwise: call DELETE /auth/sessions/:id or report suspicious, refresh list, show toast.
   * - If reason is "unknown" (This wasn't me): revoke immediately, log security event, and show security recommendation toast with [CHANGE PASSWORD] action.
   */
  const handleRevokeSession = useCallback(
    async (id: string, name: string, reason: 'manual' | 'unknown' = 'manual') => {
      const target = sessions.find((s) => s.id === id);
      if (target?.isCurrent) {
        setCurrentDeviceLogoutConfirmVisible(true);
        return;
      }

      setSessionActionBusy(id);
      try {
        if (reason === 'unknown') {
          await apiReportSuspiciousSession(id);
          setSessions((prev) => prev.filter((s) => s.id !== id));
          toast.warning(
            'Unknown device signed out. For your security, we recommend changing your password.',
            {
              title: 'Security Alert',
              duration: 7000,
              action: {
                label: 'CHANGE PASSWORD',
                onPress: () => {
                  setPasswordChoiceModalVisible(true);
                },
              },
            },
          );
        } else {
          await apiRevokeSession(id);
          setSessions((prev) => prev.filter((s) => s.id !== id));
          toast.success(`"${name}" signed out successfully.`, 'Device Signed Out');
        }
      } catch (err: any) {
        toast.error(err?.message ?? 'Failed to sign out that device.', 'Error');
      } finally {
        setSessionActionBusy(null);
      }
    },
    [sessions],
  );

  /** Sign out all other devices — requires confirmation modal. */
  const handleRevokeAllOther = useCallback(async () => {
    setRevokingAll(true);
    try {
      await apiRevokeAllOtherSessions();
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      toast.success('All other devices have been signed out.', 'Sessions Cleared');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to sign out other devices.', 'Error');
    } finally {
      setRevokingAll(false);
      setRevokeAllConfirmVisible(false);
    }
  }, []);

  // 5. Logout & Delete
  const handleLogoutConfirm = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.info('You have been logged out.', 'Signed Out');
    } catch {
      // Force exit
    } finally {
      setLoggingOut(false);
      setLogoutConfirmVisible(false);
    }
  };

  const handleDeleteAccountWithPassword = async () => {
    if (user?.hasPassword !== false && !deletePasswordInput.trim()) {
      toast.error('Please enter your password.', 'Delete Account');
      return;
    }
    setDeletingAccount(true);
    try {
      await deleteAccount({
        confirmationText: 'DELETE',
        password: deletePasswordInput.trim() || undefined,
      });
      setShowDeleteDialog(false);
      setDeletePasswordInput('');
      toast.info('Account deleted permanently.', 'Account Removed');
    } catch (err: any) {
      toast.error(err?.message || 'Incorrect password or failed to delete account.', 'Error');
    } finally {
      setDeletingAccount(false);
    }
  };

  // Share invite
  const handleInviteFriends = async () => {
    try {
      await Share.share({
        message: 'Join me on Artha — the smart personal expense and group split manager: https://artha.app',
        title: 'Invite to Artha',
      });
    } catch {
      // Ignore
    }
  };

  const currentSession =
    sessions.find((s) => s.isCurrent) ??
    (sessions.length > 0 ? sessions[0] : null);
  const otherSessions = sessions.filter((s) =>
    currentSession ? s.id !== currentSession.id : !s.isCurrent,
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#F58A07' : colors.navyPrimary}
          />
        }
      >
        {/* ======================================================== */}
        {/* 1. TOP HEADER                                            */}
        {/* ======================================================== */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerCaption}>PROFILE & SETTINGS</Text>
            <Text style={styles.headerTitle}>Account</Text>
          </View>

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>Personal</Text>
          </View>
        </View>

        {/* 2. TOP PROFILE CARD WITH BOTTOM-RIGHT EDIT PENCIL */}
        <View style={styles.profileCard} testID="profile-card">
          <View style={styles.profileAvatarBox}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.profileAvatarImg} />
            ) : (
              <Text style={styles.profileAvatarText}>
                {getInitials(user?.displayName)}
              </Text>
            )}
          </View>

          <View style={styles.profileMetaWrap}>
            <View style={styles.nameRow}>
              <Text style={styles.profileNameText} numberOfLines={1}>
                {user?.displayName || 'Vansh Mehta'}
              </Text>
              <View style={styles.verifiedBadgePill}>
                <AppIcon name="Check" size={10} color="#16A34A" />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            </View>
            <Text style={styles.profileEmailText} numberOfLines={1}>
              {user?.email || 'user@example.com'}
            </Text>
          </View>

          {/* Bottom-Right Edit Pencil Button */}
          <TouchableOpacity
            style={styles.profileEditPencilBtn}
            onPress={() => setActiveSheet('manage_profile')}
            activeOpacity={0.75}
            testID="profile-edit-pencil-btn"
            accessibilityLabel="Edit Profile"
          >
            <AppIcon name="Pencil" size={15} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
          </TouchableOpacity>
        </View>

        {/* 2. ACCOUNT SECTION (Account Settings & Account Security) */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.cardGroup}>
            {/* Account Settings */}
            <TouchableOpacity
              style={styles.rowItem}
              onPress={() => setActiveSheet('account_settings')}
              activeOpacity={0.7}
              testID="account-settings-btn"
            >
              <View style={styles.rowIconCircle}>
                <AppIcon name="SlidersHorizontal" size={18} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Account Settings</Text>
                <Text style={styles.rowSubtitle}>Currency, timezone, language & advanced</Text>
              </View>
              <AppIcon name="ChevronRight" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Account Security */}
            <TouchableOpacity
              style={styles.rowItem}
              onPress={() => setActiveSheet('account_security')}
              activeOpacity={0.7}
              testID="account-open-security-btn"
            >
              <View style={styles.rowIconCircle}>
                <AppIcon name="Shield" size={18} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Account Security</Text>
                <Text style={styles.rowSubtitle}>Sign-in method & password authentication</Text>
              </View>
              <AppIcon name="ChevronRight" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. PREFERENCES SECTION (Appearance with Glassy Button & Notifications) */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.cardGroup}>
            {/* Appearance Row with 2 Buttons: Light & Dark */}
            <View style={styles.rowItem}>
              <View style={styles.rowIconCircle}>
                <AppIcon name={isDark ? 'Moon' : 'Sun'} size={18} color={isDark ? '#F58A07' : colors.navyPrimary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Appearance</Text>
                <Text style={styles.rowSubtitle}>{isDark ? 'Dark theme' : 'Light theme'}</Text>
              </View>

              {/* 2 Buttons Only: Light and Dark */}
              <View style={styles.themeSegmentTrack}>
                <TouchableOpacity
                  style={[
                    styles.themeSegmentBtn,
                    !isDark && styles.themeSegmentBtnActive,
                  ]}
                  onPress={() => handleSelectTheme('light')}
                  activeOpacity={0.7}
                  testID="theme-light-btn"
                  accessibilityRole="button"
                  accessibilityLabel="Switch to Light theme"
                >
                  <AppIcon
                    name="Sun"
                    size={13}
                    color={!isDark ? '#FFFFFF' : (isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B')}
                  />
                  <Text
                    style={[
                      styles.themeSegmentText,
                      !isDark && styles.themeSegmentTextActive,
                    ]}
                  >
                    Light
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.themeSegmentBtn,
                    isDark && styles.themeSegmentBtnActive,
                  ]}
                  onPress={() => handleSelectTheme('dark')}
                  activeOpacity={0.7}
                  testID="theme-dark-btn"
                  accessibilityRole="button"
                  accessibilityLabel="Switch to Dark theme"
                >
                  <AppIcon
                    name="Moon"
                    size={13}
                    color={isDark ? '#000000' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.themeSegmentText,
                      isDark && styles.themeSegmentTextActive,
                    ]}
                  >
                    Dark
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Notifications Row */}
            <TouchableOpacity
              style={styles.rowItem}
              onPress={() => setActiveSheet('notifications')}
              activeOpacity={0.7}
              testID="notifications-settings-btn"
            >
              <View style={styles.rowIconCircle}>
                <AppIcon name="Bell" size={18} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Notifications</Text>
                <Text style={styles.rowSubtitle}>Push & alert preferences</Text>
              </View>
              <AppIcon name="ChevronRight" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. PRIVACY & DEVICES SECTION */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Privacy & Devices</Text>
          <View style={styles.cardGroup}>
            {/* App Lock & Biometrics */}
            <TouchableOpacity
              style={styles.rowItem}
              onPress={() => setActiveSheet('applock')}
              activeOpacity={0.7}
              testID="account-applock-btn"
            >
              <View style={styles.rowIconCircle}>
                <AppIcon name="Lock" size={18} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>App Lock & Biometrics</Text>
                <Text style={styles.rowSubtitle}>Biometric login and app password</Text>
              </View>
              <AppIcon name="ChevronRight" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Active Sessions */}
            <TouchableOpacity
              style={styles.rowItem}
              onPress={() => setActiveSheet('sessions')}
              activeOpacity={0.7}
              testID="account-sessions-btn"
            >
              <View style={styles.rowIconCircle}>
                <AppIcon name="Laptop" size={18} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Active Sessions</Text>
                <Text style={styles.rowSubtitle}>Signed-in devices & location verification</Text>
              </View>
              <AppIcon name="ChevronRight" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. SUPPORT SECTION */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.cardGroup}>
            <TouchableOpacity
              style={styles.rowItem}
              onPress={() => setActiveSheet('help_center')}
              activeOpacity={0.7}
              testID="help-center-btn"
            >
              <View style={styles.rowIconCircle}>
                <AppIcon name="CircleHelp" size={18} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Help Center</Text>
                <Text style={styles.rowSubtitle}>Frequently asked questions & guidance</Text>
              </View>
              <AppIcon name="ChevronRight" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.rowItem}
              onPress={handleInviteFriends}
              activeOpacity={0.7}
              testID="invite-friends-btn"
            >
              <View style={styles.rowIconCircle}>
                <AppIcon name="Share2" size={18} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Invite Friends</Text>
                <Text style={styles.rowSubtitle}>Share Artha with colleagues & family</Text>
              </View>
              <AppIcon name="ChevronRight" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. LOG OUT ACTION (Only Logout kept at the bottom) */}
        <View style={styles.bottomActionsWrap}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => setLogoutConfirmVisible(true)}
            activeOpacity={0.8}
            testID="logout-btn"
          >
            <AppIcon name="LogOut" size={17} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerSpacing} />
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL 1: MANAGE PROFILE UPDATION */}
      {/* ========================================================================= */}
      <AccountPageSheetModal
        visible={activeSheet === 'manage_profile'}
        onClose={() => {
          setActiveSheet(null);
          setShowEmailPasswordStep(false);
          setShowEmailVerifyStep(false);
        }}
        topLabel="ACCOUNT"
        title="Edit Profile"
        subtitle="Manage your personal credentials"
      >
        <ScrollView
          style={styles.sheetBodyScroll}
          contentContainerStyle={styles.sheetBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {showEmailPasswordStep ? (
            /* Password confirmation before requesting an email-change OTP */
            <View style={styles.otpVerifyCard}>
              <Text style={styles.otpCardTitle}>Confirm Your Password</Text>
              <Text style={styles.otpCardSub}>
                Enter your current password to send a verification code to{' '}
                {pendingNewEmail}
              </Text>

              <TextInput
                style={styles.textInput}
                value={emailChangePassword}
                onChangeText={setEmailChangePassword}
                placeholder="Current password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                autoFocus
                testID="email-change-password-input"
              />

              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={handleRequestEmailChangeOtp}
                disabled={requestingEmailOtp}
                activeOpacity={0.8}
                testID="request-email-change-otp-btn"
              >
                {requestingEmailOtp ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.actionPillBtnText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelLink}
                onPress={() => setShowEmailPasswordStep(false)}
              >
                <Text style={styles.cancelLinkText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : showEmailVerifyStep ? (
            /* OTP Verification for Email Update */
            <View style={styles.otpVerifyCard}>
              <Text style={styles.otpCardTitle}>Verify New Email</Text>
              <Text style={styles.otpCardSub}>
                Enter the 6-digit code sent to {pendingNewEmail}
              </Text>

              <TextInput
                style={styles.otpInput}
                value={emailOtpCode}
                onChangeText={setEmailOtpCode}
                placeholder="000000"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                testID="email-otp-input"
              />

              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={handleConfirmEmailOtp}
                disabled={verifyingEmailOtp}
                activeOpacity={0.8}
                testID="confirm-email-otp-btn"
              >
                {verifyingEmailOtp ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.actionPillBtnText}>Verify & Save Email</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelLink}
                onPress={() => setShowEmailVerifyStep(false)}
              >
                <Text style={styles.cancelLinkText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Standard Profile Edit Form */
            <View>
              {/* Name Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                {isSocialUser ? (
                  <View style={styles.readOnlyInput}>
                    <Text style={styles.readOnlyText}>{user?.displayName || 'User'}</Text>
                    <View style={styles.socialLinkedBadge}>
                      <AppIcon name="Lock" size={12} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
                      <Text style={styles.socialLinkedBadgeText}>Linked via {socialProviderName}</Text>
                    </View>
                  </View>
                ) : (
                  <TextInput
                    style={[styles.textInput, nameFieldError && styles.inputError]}
                    value={profileNameInput}
                    onChangeText={(val) => {
                      setProfileNameInput(val);
                      if (nameFieldError) setNameFieldError(null);
                    }}
                    placeholder="Enter full name"
                    placeholderTextColor="#94A3B8"
                    testID="manage-profile-name-input"
                  />
                )}
                {nameFieldError && (
                  <Text style={styles.errorText}>{nameFieldError}</Text>
                )}
              </View>

              {/* Email Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                {isSocialUser ? (
                  <View style={styles.readOnlyInput}>
                    <Text style={styles.readOnlyText}>{user?.email || 'email@example.com'}</Text>
                    <View style={styles.socialLinkedBadge}>
                      <AppIcon name="Lock" size={12} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
                      <Text style={styles.socialLinkedBadgeText}>Linked via {socialProviderName}</Text>
                    </View>
                  </View>
                ) : (
                  <TextInput
                    style={styles.textInput}
                    value={profileEmailInput}
                    onChangeText={setProfileEmailInput}
                    placeholder="Enter email address"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    testID="manage-profile-email-input"
                  />
                )}
              </View>

              {/* Phone Number Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={profilePhoneInput}
                  onChangeText={setProfilePhoneInput}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  testID="manage-profile-phone-input"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                activeOpacity={0.8}
                testID="edit-profile-save-bottom-btn"
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.actionPillBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </AccountPageSheetModal>

      {/* ========================================================================= */}
      {/* MODAL 2: ACCOUNT SETTINGS (Currency, Timezone, Language, Advanced) */}
      {/* ========================================================================= */}
      <AccountPageSheetModal
        visible={activeSheet === 'account_settings'}
        onClose={() => {
          setActiveSheet(null);
          setOpenDropdown(null);
        }}
        topLabel="ACCOUNT"
        title="Account Settings"
        subtitle="Regional preferences & advanced management"
      >
        <ScrollView
          style={styles.sheetBodyScroll}
          contentContainerStyle={styles.sheetBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Currency Dropdown */}
          <View style={styles.dropdownBlock}>
            <Text style={styles.settingLabel}>Currency</Text>
            <TouchableOpacity
              style={[
                styles.dropdownTrigger,
                openDropdown === 'currency' && styles.dropdownTriggerActive,
              ]}
              onPress={() => toggleDropdown('currency')}
              activeOpacity={0.7}
              testID="currency-dropdown-trigger"
            >
              <Text style={styles.dropdownSelectedText}>
                {CURRENCIES.find((c) => c.code === currency)?.label || currency}
              </Text>
              <AppIcon
                name={openDropdown === 'currency' ? 'ChevronUp' : 'ChevronDown'}
                size={18}
                color={openDropdown === 'currency' ? (isDark ? '#F58A07' : colors.navyPrimary) : (isDark ? '#FFFFFF' : '#64748B')}
              />
            </TouchableOpacity>

            {openDropdown === 'currency' && (
              <View style={styles.dropdownMenu}>
                {CURRENCIES.map((c) => {
                  const isSelected = currency === c.code;
                  return (
                    <TouchableOpacity
                      key={c.code}
                      style={[
                        styles.dropdownItem,
                        isSelected && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setCurrency(c.code);
                        setOpenDropdown(null);
                        toast.success(`Currency set to ${c.code}.`, 'Settings');
                      }}
                      activeOpacity={0.7}
                      testID={`currency-option-${c.code}`}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          isSelected && styles.dropdownItemTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                      {isSelected && (
                        <AppIcon name="Check" size={16} color={isDark ? '#F58A07' : colors.navyPrimary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Timezone Dropdown */}
          <View style={styles.dropdownBlock}>
            <Text style={styles.settingLabel}>Timezone</Text>
            <TouchableOpacity
              style={[
                styles.dropdownTrigger,
                openDropdown === 'timezone' && styles.dropdownTriggerActive,
              ]}
              onPress={() => toggleDropdown('timezone')}
              activeOpacity={0.7}
              testID="timezone-dropdown-trigger"
            >
              <Text style={styles.dropdownSelectedText}>
                {TIMEZONES.find((tz) => tz.id === timezone)?.label || timezone}
              </Text>
              <AppIcon
                name={openDropdown === 'timezone' ? 'ChevronUp' : 'ChevronDown'}
                size={18}
                color={openDropdown === 'timezone' ? (isDark ? '#F58A07' : colors.navyPrimary) : (isDark ? '#FFFFFF' : '#64748B')}
              />
            </TouchableOpacity>

            {openDropdown === 'timezone' && (
              <View style={styles.dropdownMenu}>
                {TIMEZONES.map((tz) => {
                  const isSelected = timezone === tz.id;
                  return (
                    <TouchableOpacity
                      key={tz.id}
                      style={[
                        styles.dropdownItem,
                        isSelected && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setTimezone(tz.id);
                        setOpenDropdown(null);
                        toast.success(`Timezone set to ${tz.label}.`, 'Settings');
                      }}
                      activeOpacity={0.7}
                      testID={`timezone-option-${tz.id}`}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          isSelected && styles.dropdownItemTextActive,
                        ]}
                      >
                        {tz.label}
                      </Text>
                      {isSelected && (
                        <AppIcon name="Check" size={16} color={isDark ? '#F58A07' : colors.navyPrimary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* App Language Dropdown */}
          <View style={styles.dropdownBlock}>
            <Text style={styles.settingLabel}>App Language</Text>
            <TouchableOpacity
              style={[
                styles.dropdownTrigger,
                openDropdown === 'language' && styles.dropdownTriggerActive,
              ]}
              onPress={() => toggleDropdown('language')}
              activeOpacity={0.7}
              testID="language-dropdown-trigger"
            >
              <Text style={styles.dropdownSelectedText}>
                {LANGUAGES.find((lang) => lang.code === language)?.label || language}
              </Text>
              <AppIcon
                name={openDropdown === 'language' ? 'ChevronUp' : 'ChevronDown'}
                size={18}
                color={openDropdown === 'language' ? (isDark ? '#F58A07' : colors.navyPrimary) : (isDark ? '#FFFFFF' : '#64748B')}
              />
            </TouchableOpacity>

            {openDropdown === 'language' && (
              <View style={styles.dropdownMenu}>
                {LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.dropdownItem,
                        isSelected && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setLanguage(lang.code);
                        setOpenDropdown(null);
                        toast.success(`Language set to ${lang.label}.`, 'Settings');
                      }}
                      activeOpacity={0.7}
                      testID={`language-option-${lang.code}`}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          isSelected && styles.dropdownItemTextActive,
                        ]}
                      >
                        {lang.label}
                      </Text>
                      {isSelected && (
                        <AppIcon name="Check" size={16} color={isDark ? '#F58A07' : colors.navyPrimary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* ADVANCED FEATURES */}
          <View style={styles.advancedSection}>
            <Text style={styles.advancedSectionHeader}>ADVANCED</Text>

            {/* Blocked Users */}
            <TouchableOpacity
              style={styles.advancedRow}
              onPress={() => setActiveSheet('blocked_users')}
              activeOpacity={0.7}
              testID="blocked-users-btn"
            >
              <View style={styles.advancedRowLeft}>
                <AppIcon name="X" size={17} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
                <Text style={styles.advancedRowText}>Blocked Users</Text>
              </View>
              <AppIcon name="ChevronRight" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Delete Account */}
            <TouchableOpacity
              style={[styles.advancedRow, { borderBottomWidth: 0 }]}
              onPress={() => setShowDeleteDialog(true)}
              activeOpacity={0.7}
              testID="delete-account-advanced-btn"
            >
              <View style={styles.advancedRowLeft}>
                <AppIcon name="Trash2" size={17} color="#EF4444" />
                <Text style={[styles.advancedRowText, { color: '#EF4444', fontWeight: '700' }]}>
                  Delete Account
                </Text>
              </View>
              <AppIcon name="ChevronRight" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </AccountPageSheetModal>

      {/* ========================================================================= */}
      {/* MODAL 3: ACCOUNT SECURITY (Sign-in Method, Change/Forgot Password) */}
      {/* ========================================================================= */}
      <AccountPageSheetModal
        visible={activeSheet === 'account_security'}
        onClose={() => {
          setActiveSheet(null);
          setSecurityForgotStep('idle');
        }}
        topLabel="SECURITY"
        title="Account Security"
        subtitle="Manage sign-in method and authentication passwords"
      >
        <ScrollView
          style={styles.sheetBodyScroll}
          contentContainerStyle={styles.sheetBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Sign-In Method */}
          <Text style={styles.sheetSectionTitle}>Sign-In Method</Text>
          <View style={styles.securityMethodCard}>
            <View style={styles.securityMethodLeft}>
              <View style={styles.methodIconSlot}>
                <Icon
                  name={isSocialUser ? (socialProviderName.toLowerCase() as any) : 'mail'}
                  size={18}
                  color={isDark ? '#FFFFFF' : colors.navyPrimary}
                />
              </View>
              <View>
                <Text style={styles.methodCardTitle}>
                  {isSocialUser ? `${socialProviderName} Sign-In` : 'Email & Password'}
                </Text>
                <Text style={styles.methodCardEmail}>{user?.email || 'email@example.com'}</Text>
              </View>
            </View>
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedBadgeText}>Connected</Text>
            </View>
          </View>

          {/* Password Management */}
          <Text style={[styles.sheetSectionTitle, { marginTop: spacing.xl }]}>
            Password & Credentials
          </Text>

          {isSocialUser ? (
            <View style={styles.socialNoticeCard}>
              <AppIcon name="Shield" size={18} color={isDark ? '#F58A07' : colors.navyPrimary} />
              <Text style={styles.socialNoticeText}>
                Your account is linked with {socialProviderName}. Password management is handled by your provider.
              </Text>
            </View>
          ) : securityForgotStep === 'otp_sent' ? (
            /* Forgot Password OTP Verification Step */
            <View style={styles.passwordCard}>
              <Text style={styles.passwordCardTitle}>Reset via OTP</Text>
              <Text style={styles.passwordCardSub}>
                Enter the 6-digit code sent to {user?.email} and set your new password.
              </Text>

              <TextInput
                style={styles.textInput}
                value={securityForgotOtp}
                onChangeText={setSecurityForgotOtp}
                placeholder="6-digit reset code"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
              />

              <TextInput
                style={[styles.textInput, { marginTop: spacing.sm }]}
                value={securityForgotNewPass}
                onChangeText={setSecurityForgotNewPass}
                placeholder="New password (min 8 chars)"
                placeholderTextColor="#94A3B8"
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={handleConfirmSecurityForgot}
                disabled={sendingSecurityForgotOtp}
              >
                {sendingSecurityForgotOtp ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.actionPillBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelLink}
                onPress={() => setSecurityForgotStep('idle')}
              >
                <Text style={styles.cancelLinkText}>Back</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Change Password Form */
            <View style={styles.passwordCard}>
              <TextInput
                style={styles.textInput}
                value={currPasswordInput}
                onChangeText={setCurrPasswordInput}
                placeholder="Current password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
              />

              <TextInput
                style={[styles.textInput, { marginTop: spacing.sm }]}
                value={newPasswordInput}
                onChangeText={setNewPasswordInput}
                placeholder="New password (min 8 chars)"
                placeholderTextColor="#94A3B8"
                secureTextEntry
              />

              <TextInput
                style={[styles.textInput, { marginTop: spacing.sm }]}
                value={confirmPasswordInput}
                onChangeText={setConfirmPasswordInput}
                placeholder="Confirm new password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={handleChangePassword}
                disabled={updatingPassword}
              >
                {updatingPassword ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.actionPillBtnText}>Change Password</Text>
                )}
              </TouchableOpacity>

              {/* Forgot password link */}
              <TouchableOpacity
                style={styles.forgotPassBtn}
                onPress={handleSendSecurityForgotOtp}
                disabled={sendingSecurityForgotOtp}
              >
                <Text style={styles.forgotPassText}>Forgot password? Send reset code</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </AccountPageSheetModal>

      {/* ========================================================================= */}
      {/* MODAL 4: NOTIFICATIONS PREFERENCES */}
      {/* ========================================================================= */}
      <AccountPageSheetModal
        visible={activeSheet === 'notifications'}
        onClose={() => setActiveSheet(null)}
        topLabel="PREFERENCES"
        title="Notifications"
        subtitle="Configure alerts and digest preferences"
      >
        <ScrollView
          style={styles.sheetBodyScroll}
          contentContainerStyle={styles.sheetBodyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cleanToggleList}>
            <View style={styles.cleanToggleRow}>
              <Text style={styles.cleanToggleTitle}>Expense Reminders</Text>
              <Switch
                value={notifExpense}
                onValueChange={setNotifExpense}
                trackColor={{ false: isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1', true: isDark ? '#F58A07' : colors.navyPrimary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.cleanToggleRow}>
              <Text style={styles.cleanToggleTitle}>Group & Split Updates</Text>
              <Switch
                value={notifGroup}
                onValueChange={setNotifGroup}
                trackColor={{ false: isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1', true: isDark ? '#F58A07' : colors.navyPrimary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.cleanToggleRow}>
              <Text style={styles.cleanToggleTitle}>Budget Alerts</Text>
              <Switch
                value={notifBudget}
                onValueChange={setNotifBudget}
                trackColor={{ false: isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1', true: isDark ? '#F58A07' : colors.navyPrimary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.cleanToggleRow}>
              <Text style={styles.cleanToggleTitle}>Weekly Digest</Text>
              <Switch
                value={notifWeekly}
                onValueChange={setNotifWeekly}
                trackColor={{ false: isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1', true: isDark ? '#F58A07' : colors.navyPrimary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </ScrollView>
      </AccountPageSheetModal>

      {/* ========================================================================= */}
      {/* MODAL 5: APP LOCK & BIOMETRICS (Clean - Only 2 items) */}
      {/* ========================================================================= */}
      <AccountPageSheetModal
        visible={activeSheet === 'applock'}
        onClose={() => setActiveSheet(null)}
        topLabel="PRIVACY"
        title="App Lock & Biometrics"
        subtitle="Device security controls"
      >
        <ScrollView
          style={styles.sheetBodyScroll}
          contentContainerStyle={styles.sheetBodyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cleanCard}>
            {/* 1. Enable Biometric Login */}
            <View style={styles.cleanSwitchItem}>
              <View style={styles.cleanSwitchItemLeft}>
                <AppIcon name="Shield" size={20} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
                <Text style={styles.cleanSwitchItemLabel}>Enable Biometric Login</Text>
              </View>
              {biometricBusy ? (
                <ActivityIndicator size="small" color={isDark ? '#F58A07' : colors.navyPrimary} />
              ) : (
                <Switch
                  value={biometricLoginEnabled}
                  onValueChange={handleToggleBiometric}
                  disabled={!isBiometricSupported && !biometricLoginEnabled}
                  trackColor={{ false: isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1', true: isDark ? '#F58A07' : colors.navyPrimary }}
                  thumbColor="#FFFFFF"
                  testID="enable-biometrics-switch"
                />
              )}
            </View>

            {!isBiometricSupported && (
              <Text style={styles.biometricUnavailableHint}>
                Biometric authentication is not available or not enrolled on
                this device. Set up Face ID / Fingerprint in your device
                settings first.
              </Text>
            )}

            <View style={styles.divider} />

            {/* 2. App Lock (4-Digit PIN) */}
            <View style={styles.cleanSwitchItem}>
              <View style={styles.cleanSwitchItemLeft}>
                <AppIcon name="Lock" size={20} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
                <Text style={styles.cleanSwitchItemLabel}>Setup App Password / 4-Digit PIN</Text>
              </View>
              <Switch
                value={pinEnabled}
                onValueChange={handleTogglePin}
                trackColor={{ false: isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1', true: isDark ? '#F58A07' : colors.navyPrimary }}
                thumbColor="#FFFFFF"
                testID="enable-pin-switch"
              />
            </View>

          </View>
        </ScrollView>
      </AccountPageSheetModal>

      {/* Sub-Modal: App PIN Setup matching AppLockScreen Keypad UI */}
      <Modal
        visible={showPinSetupModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingPin) setShowPinSetupModal(false);
        }}
      >
        <View style={styles.pinModalBackdrop}>
          <View style={styles.pinModalCard}>
            {/* iOS Glass Handle */}
            <View style={styles.pinModalHandle} />

            {/* Top header row with close button */}
            <View style={styles.pinModalHeader}>
              <Text style={styles.pinModalTitle}>
                {pinStep === 'enter' ? 'Set 4-Digit PIN' : 'Confirm 4-Digit PIN'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowPinSetupModal(false)}
                disabled={savingPin}
                style={styles.pinModalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close PIN Setup"
              >
                <AppIcon name="X" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.pinModalSub}>
              {pinStep === 'enter'
                ? 'Create a 4-digit PIN to lock and protect Artha.'
                : 'Re-enter your 4-digit PIN to confirm.'}
            </Text>

            {pinErrorMsg ? (
              <View style={styles.pinErrorBanner}>
                <Text style={styles.pinErrorText}>{pinErrorMsg}</Text>
              </View>
            ) : null}

            {/* 4 Animated PIN Dots with Shake on error */}
            <Animated.View
              style={[
                styles.pinDotsRow,
                { transform: [{ translateX: pinShakeAnim }] },
              ]}
            >
              {Array.from({ length: 4 }).map((_, index) => {
                const isFilled = index < pinCurrent.length;
                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.pinDot,
                      isFilled && styles.pinDotFilled,
                      { transform: [{ scale: pinDotAnims[index] }] },
                    ]}
                  />
                );
              })}
            </Animated.View>

            {/* Same Numeric Keypad UI as AppLockScreen */}
            <View style={styles.pinKeypadGrid}>
              {PIN_KEYPAD_ROWS.map((row, rIdx) => (
                <View key={rIdx} style={styles.pinKeypadRow}>
                  {row.map((key, cIdx) =>
                    key === '' ? (
                      <View key={`spacer-${cIdx}`} style={styles.pinKeypadKeySpacer} />
                    ) : (
                      <TouchableOpacity
                        key={key}
                        activeOpacity={0.4}
                        style={styles.pinKeypadKey}
                        disabled={savingPin}
                        onPress={() => handlePinDigitPress(key)}
                        testID={`pin-setup-key-${key}`}
                      >
                        <Text style={styles.pinKeypadKeyText}>
                          {key === 'DEL' ? '⌫' : key}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              ))}
            </View>

            {savingPin ? (
              <View style={styles.pinSavingIndicator}>
                <ActivityIndicator size="small" color={isDark ? '#F58A07' : colors.navyPrimary} />
                <Text style={styles.pinSavingText}>Saving PIN…</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Sub-Modal: Confirm current PIN before removing App Lock */}
      <Modal
        visible={showPinDisableModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!disablingPin) setShowPinDisableModal(false);
        }}
      >
        <View style={styles.pinModalBackdrop}>
          <View style={styles.pinModalCard}>
            {/* iOS Glass Handle */}
            <View style={styles.pinModalHandle} />

            <View style={styles.pinModalHeader}>
              <Text style={styles.pinModalTitle}>Enter Current PIN</Text>
              <TouchableOpacity
                onPress={() => setShowPinDisableModal(false)}
                disabled={disablingPin}
                style={styles.pinModalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <AppIcon name="X" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.pinModalSub}>
              Confirm your current PIN to remove App Lock.
            </Text>

            {pinDisableError ? (
              <View style={styles.pinErrorBanner}>
                <Text style={styles.pinErrorText}>{pinDisableError}</Text>
              </View>
            ) : null}

            <Animated.View
              style={[
                styles.pinDotsRow,
                { transform: [{ translateX: pinShakeAnim }] },
              ]}
            >
              {Array.from({ length: 4 }).map((_, index) => {
                const isFilled = index < pinDisableCurrent.length;
                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.pinDot,
                      isFilled && styles.pinDotFilled,
                      { transform: [{ scale: pinDotAnims[index] }] },
                    ]}
                  />
                );
              })}
            </Animated.View>

            <View style={styles.pinKeypadGrid}>
              {PIN_KEYPAD_ROWS.map((row, rIdx) => (
                <View key={rIdx} style={styles.pinKeypadRow}>
                  {row.map((key, cIdx) =>
                    key === '' ? (
                      <View key={`spacer-${cIdx}`} style={styles.pinKeypadKeySpacer} />
                    ) : (
                      <TouchableOpacity
                        key={key}
                        activeOpacity={0.4}
                        style={styles.pinKeypadKey}
                        disabled={disablingPin}
                        onPress={() => handlePinDisableDigitPress(key)}
                        testID={`pin-disable-key-${key}`}
                      >
                        <Text style={styles.pinKeypadKeyText}>
                          {key === 'DEL' ? '⌫' : key}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              ))}
            </View>

            {disablingPin ? (
              <View style={styles.pinSavingIndicator}>
                <ActivityIndicator size="small" color={isDark ? '#F58A07' : colors.navyPrimary} />
                <Text style={styles.pinSavingText}>Removing App Lock…</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: ACTIVE SESSIONS */}
      {/* ========================================================================= */}
      <AccountPageSheetModal
        visible={activeSheet === 'sessions'}
        onClose={() => setActiveSheet(null)}
        topLabel="DEVICES & SECURITY"
        title="Active Sessions"
        subtitle="Manage where you are signed in"
      >
        <ScrollView
          style={styles.sheetBodyScroll}
          contentContainerStyle={styles.sheetBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Loading state */}
          {sessionsLoading && (
            <View style={styles.sessionsLoadingBox}>
              <ActivityIndicator size="small" color={isDark ? '#F58A07' : colors.navyPrimary} />
              <Text style={styles.sessionsLoadingText}>Loading verified sessions…</Text>
            </View>
          )}

          {/* Empty state */}
          {!sessionsLoading && sessions.length === 0 && (
            <View style={styles.sessionsLoadingBox}>
              <Text style={styles.sessionsLoadingText}>No active sessions found.</Text>
            </View>
          )}

          {/* 1. CURRENT DEVICE SECTION */}
          {!sessionsLoading && currentSession && (
            <View style={styles.sessionSection}>
              <Text style={styles.sessionSectionTitle}>CURRENT DEVICE</Text>
              <View style={[styles.sessionCard, styles.currentSessionCard]}>
                <View style={styles.sessionTopRow}>
                  <View style={[styles.sessionIconBox, styles.currentSessionIconBox]}>
                    <AppIcon
                      name={
                        platformIcon(
                          currentSession.platform,
                          currentSession.deviceType,
                          currentSession.deviceName,
                        ) === 'phone'
                          ? 'Smartphone'
                          : platformIcon(
                            currentSession.platform,
                            currentSession.deviceType,
                            currentSession.deviceName,
                          ) === 'tablet'
                            ? 'Tablet'
                            : 'Laptop'
                      }
                      size={20}
                      color={isDark ? '#FFFFFF' : colors.navyDeep}
                    />
                  </View>
                  <View style={styles.sessionMeta}>
                    <View style={styles.sessionTitleRow}>
                      <Text style={styles.sessionDeviceName}>
                        {currentSession.deviceName}
                      </Text>
                      <View style={styles.thisDeviceBadge}>
                        <View style={styles.liveIndicatorDot} />
                        <Text style={styles.thisDeviceBadgeText}>CURRENT DEVICE</Text>
                      </View>
                    </View>
                    <Text style={styles.sessionLocationText}>
                      {currentSession.approximateLocation || 'Mumbai, India'}
                    </Text>
                    <Text style={styles.sessionOperatingSystemText}>
                      {currentSession.operatingSystem || currentSession.platform} • Active now
                    </Text>
                  </View>
                </View>

                {/* Sign Out on Current Device */}
                <View style={styles.currentDeviceActionRow}>
                  <TouchableOpacity
                    style={styles.currentDeviceSignOutBtn}
                    onPress={() => setCurrentDeviceLogoutConfirmVisible(true)}
                  >
                    <AppIcon name="LogOut" size={13} color="#64748B" />
                    <Text style={styles.currentDeviceSignOutText}>Sign Out This Device</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* 2. OTHER ACTIVE SESSIONS SECTION */}
          {!sessionsLoading && (
            <View style={styles.sessionSection}>
              <View style={styles.sessionSectionHeaderRow}>
                <Text style={styles.sessionSectionTitle}>
                  OTHER ACTIVE SESSIONS {otherSessions.length > 0 ? `(${otherSessions.length})` : ''}
                </Text>
              </View>

              {otherSessions.length === 0 ? (
                <View style={styles.allSecureBox}>
                  <View style={styles.allSecureIconCircle}>
                    <AppIcon name="Shield" size={20} color="#10B981" />
                  </View>
                  <Text style={styles.allSecureTitle}>No other devices</Text>
                  <Text style={styles.allSecureSub}>
                    Your account is currently only signed in on this device.
                  </Text>
                </View>
              ) : (
                otherSessions.map((sess) => {
                  const iconType = platformIcon(
                    sess.platform,
                    sess.deviceType,
                    sess.deviceName,
                  );
                  const iconName: AppIconName =
                    iconType === 'phone'
                      ? 'Smartphone'
                      : iconType === 'tablet'
                        ? 'Tablet'
                        : 'Laptop';
                  const relativeTime = formatLastActive(sess.lastUsedAt);

                  return (
                    <View key={sess.id} style={styles.sessionCard}>
                      <View style={styles.sessionTopRow}>
                        <View style={styles.sessionIconBox}>
                          <AppIcon
                            name={iconName}
                            size={18}
                            color={isDark ? '#FFFFFF' : colors.navyPrimary}
                          />
                        </View>
                        <View style={styles.sessionMeta}>
                          <Text style={styles.sessionDeviceName}>
                            {sess.deviceName}
                          </Text>
                          <Text style={styles.sessionLocationText}>
                            {sess.approximateLocation || 'India'}
                          </Text>
                          <Text style={styles.sessionOperatingSystemText}>
                            {sess.operatingSystem || sess.platform} • Last active {relativeTime}
                          </Text>
                        </View>
                      </View>

                      {/* Action buttons for non-current sessions */}
                      <View style={styles.otherSessionActionsRow}>
                        <TouchableOpacity
                          style={styles.unknownDeviceBtn}
                          onPress={() =>
                            handleRevokeSession(
                              sess.id,
                              sess.deviceName,
                              'unknown',
                            )
                          }
                          disabled={sessionActionBusy === sess.id}
                        >
                          <AppIcon name="AlertTriangle" size={13} color="#D97706" />
                          <Text style={styles.unknownDeviceBtnText}>
                            Don't recognize this device
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeSessionBtn}
                          onPress={() =>
                            handleRevokeSession(
                              sess.id,
                              sess.deviceName,
                              'manual',
                            )
                          }
                          disabled={sessionActionBusy === sess.id}
                        >
                          {sessionActionBusy === sess.id ? (
                            <ActivityIndicator size="small" color="#DC2626" />
                          ) : (
                            <Text style={styles.removeSessionBtnText}>
                              Sign Out
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* 3. Sign Out All Other Devices */}
          {!sessionsLoading && otherSessions.length > 0 && (
            <TouchableOpacity
              style={styles.revokeAllBtn}
              onPress={() => setRevokeAllConfirmVisible(true)}
              disabled={revokingAll}
            >
              <AppIcon name="LogOut" size={16} color="#DC2626" />
              <Text style={styles.revokeAllBtnText}>Sign Out All Other Devices</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </AccountPageSheetModal>

      {/* ========================================================================= */}
      {/* MODAL: CURRENT DEVICE SIGN OUT CONFIRMATION                               */}
      {/* ========================================================================= */}
      <Modal
        visible={currentDeviceLogoutConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrentDeviceLogoutConfirmVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Sign Out of This Device?</Text>
            <Text style={styles.dialogSubtitle}>
              You will be signed out of your Artha account on this device and returned to the sign-in screen.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setCurrentDeviceLogoutConfirmVisible(false)}
                disabled={loggingOut}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogConfirmBtn, { backgroundColor: '#DC2626' }]}
                onPress={async () => {
                  setCurrentDeviceLogoutConfirmVisible(false);
                  await handleLogoutConfirm();
                }}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.dialogConfirmText}>Sign Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: PASSWORD UPDATE CHOICE (OPTION A: KNOWS PASSWORD, OPTION B: RESET) */}
      {/* ========================================================================= */}
      <Modal
        visible={passwordChoiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordChoiceModalVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.passwordChoiceDialog}>
            <View style={styles.passwordChoiceHeader}>
              <View style={styles.passwordChoiceIcon}>
                <AppIcon name="Shield" size={24} color={isDark ? '#F58A07' : colors.navyPrimary} />
              </View>
              <Text style={styles.passwordChoiceTitle}>Update Your Password</Text>
              <Text style={styles.passwordChoiceSubtitle}>
                For security reasons, Artha recommends updating your password after reporting an unfamiliar device.
              </Text>
            </View>

            <View style={styles.passwordChoiceOptions}>
              <TouchableOpacity
                style={styles.passwordOptionCard}
                onPress={() => {
                  setPasswordChoiceModalVisible(false);
                  setActiveSheet('account_security');
                  setSecurityForgotStep('idle');
                }}
              >
                <View style={styles.passwordOptionIconCircle}>
                  <AppIcon name="Key" size={18} color={isDark ? '#FFFFFF' : colors.navyDeep} />
                </View>
                <View style={styles.passwordOptionInfo}>
                  <Text style={styles.passwordOptionTitle}>I know my current password</Text>
                  <Text style={styles.passwordOptionDesc}>Enter your current password and choose a new one</Text>
                </View>
                <AppIcon name="ChevronRight" size={16} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.passwordOptionCard}
                onPress={async () => {
                  setPasswordChoiceModalVisible(false);
                  setActiveSheet('account_security');
                  await handleSendSecurityForgotOtp();
                }}
              >
                <View style={styles.passwordOptionIconCircle}>
                  <AppIcon name="Mail" size={18} color={isDark ? '#FFFFFF' : colors.navyDeep} />
                </View>
                <View style={styles.passwordOptionInfo}>
                  <Text style={styles.passwordOptionTitle}>I forgot my password</Text>
                  <Text style={styles.passwordOptionDesc}>Reset using a secure 6-digit email OTP</Text>
                </View>
                <AppIcon name="ChevronRight" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.passwordChoiceCancelBtn}
              onPress={() => setPasswordChoiceModalVisible(false)}
            >
              <Text style={styles.passwordChoiceCancelText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: REVOKE ALL OTHER DEVICES CONFIRMATION */}
      {/* ========================================================================= */}
      <Modal
        visible={revokeAllConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRevokeAllConfirmVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Sign Out All Other Devices?</Text>
            <Text style={styles.dialogSubtitle}>
              All sessions except this device will be immediately signed out. They will need to log in again.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setRevokeAllConfirmVisible(false)}
                disabled={revokingAll}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogConfirmBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleRevokeAllOther}
                disabled={revokingAll}
              >
                {revokingAll ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.dialogConfirmText}>Sign Out All</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 7: HELP CENTER */}
      {/* ========================================================================= */}
      <AccountPageSheetModal
        visible={activeSheet === 'help_center'}
        onClose={() => setActiveSheet(null)}
        topLabel="SUPPORT"
        title="Help Center"
        subtitle="Frequently asked questions"
      >
        <ScrollView
          style={styles.sheetBodyScroll}
          contentContainerStyle={styles.sheetBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {FAQ_ITEMS.map((item, index) => (
            <View key={index} style={styles.faqCard}>
              <Text style={styles.faqQuestion}>{item.q}</Text>
              <Text style={styles.faqAnswer}>{item.a}</Text>
            </View>
          ))}
        </ScrollView>
      </AccountPageSheetModal>

      {/* ========================================================================= */}
      {/* MODAL 8: BLOCKED USERS */}
      {/* ========================================================================= */}
      <AccountPageSheetModal
        visible={activeSheet === 'blocked_users'}
        onClose={() => setActiveSheet(null)}
        topLabel="ADVANCED"
        title="Blocked Users"
        subtitle="Manage restricted accounts"
      >
        <ScrollView
          style={styles.sheetBodyScroll}
          contentContainerStyle={styles.sheetBodyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.blockedInputRow}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              value={newBlockedUserEmail}
              onChangeText={setNewBlockedUserEmail}
              placeholder="user@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.blockAddBtn}
              onPress={() => {
                if (newBlockedUserEmail.trim()) {
                  setBlockedUsers((prev) => [...prev, newBlockedUserEmail.trim()]);
                  setNewBlockedUserEmail('');
                  toast.success('User added to blocked list.', 'Blocked');
                }
              }}
            >
              <Text style={styles.blockAddBtnText}>Block</Text>
            </TouchableOpacity>
          </View>

          {blockedUsers.length === 0 ? (
            <View style={styles.emptyBlockedBox}>
              <AppIcon name="Shield" size={32} color="#94A3B8" />
              <Text style={styles.emptyBlockedTitle}>No Blocked Users</Text>
              <Text style={styles.emptyBlockedSub}>You haven't blocked anyone yet.</Text>
            </View>
          ) : (
            blockedUsers.map((email, idx) => (
              <View key={idx} style={styles.blockedUserRow}>
                <Text style={styles.blockedUserEmail}>{email}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setBlockedUsers((prev) => prev.filter((_, i) => i !== idx));
                    toast.info('User unblocked.', 'Unblocked');
                  }}
                >
                  <Text style={styles.unblockText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </AccountPageSheetModal>

      {/* ========================================================================= */}
      {/* DIALOG: DELETE ACCOUNT (Direct Password Prompt Only) */}
      {/* ========================================================================= */}
      <Modal
        visible={showDeleteDialog}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteDialog(false);
          setDeletePasswordInput('');
        }}
      >
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Delete Account</Text>
            <Text style={styles.dialogSub}>
              {user?.hasPassword !== false
                ? 'Enter your password to permanently delete your account.'
                : 'Are you sure you want to permanently delete your account?'}
            </Text>

            {user?.hasPassword !== false && (
              <TextInput
                style={styles.textInput}
                value={deletePasswordInput}
                onChangeText={setDeletePasswordInput}
                placeholder="Enter password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                autoFocus
                testID="delete-account-password-input"
              />
            )}

            <View style={styles.dialogActionsRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => {
                  setShowDeleteDialog(false);
                  setDeletePasswordInput('');
                }}
                disabled={deletingAccount}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogDeleteConfirmBtn}
                onPress={handleDeleteAccountWithPassword}
                disabled={deletingAccount || (user?.hasPassword !== false && !deletePasswordInput.trim())}
                testID="delete-account-submit-btn"
              >
                {deletingAccount ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.dialogDeleteConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* CONFIRMATION DIALOG: LOG OUT */}
      {/* ========================================================================= */}
      <Modal
        visible={logoutConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutConfirmVisible(false)}
      >
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Log Out</Text>
            <Text style={styles.dialogSub}>Are you sure you want to log out of Artha?</Text>

            <View style={styles.dialogActionsRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setLogoutConfirmVisible(false)}
                disabled={loggingOut}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogLogoutConfirmBtn}
                onPress={handleLogoutConfirm}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.dialogLogoutConfirmText}>Log Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (themeColors: typeof colors, isDark: boolean) =>
  StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: isDark ? '#000000' : '#F2F3F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 4,
  },
  headerCaption: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#A1A1AA' : themeColors.textSecondary,
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: isDark ? '#FFFFFF' : '#0F172A',
    letterSpacing: -0.6,
  },
  statusPill: {
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : '#0F172A',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 40,
  },
  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    position: 'relative',
    ...(isDark ? {} : shadows.subtle),
  },
  profileAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: isDark ? '#F58A07' : colors.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  profileAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  profileAvatarText: {
    fontSize: 19,
    fontWeight: '800',
    color: isDark ? '#000000' : '#FFFFFF',
  },
  profileMetaWrap: {
    flex: 1,
    paddingRight: 40,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  profileNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
    letterSpacing: -0.3,
  },
  verifiedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  profileEmailText: {
    fontSize: 13,
    color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B',
    fontWeight: '500',
  },
  profileEditPencilBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: isDark ? '#000000' : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...(isDark ? {} : shadows.subtle),
  },
  // Section Wrap
  sectionWrap: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  cardGroup: {
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    overflow: 'hidden',
    ...(isDark ? {} : shadows.subtle),
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: isDark ? '#000000' : '#F1F5F9',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
    marginLeft: 64,
  },
  // 2-Option Theme Segment Control (Light & Dark)
  themeSegmentTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#000000' : '#F1F5F9',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
  },
  themeSegmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  themeSegmentBtnActive: {
    backgroundColor: isDark ? '#F58A07' : '#084887',
    shadowColor: isDark ? '#F58A07' : '#084887',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.15,
    shadowRadius: 3,
    elevation: isDark ? 0 : 2,
  },
  themeSegmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B',
  },
  themeSegmentTextActive: {
    fontWeight: '700',
    color: isDark ? '#000000' : '#FFFFFF',
  },
  // Bottom Log Out
  bottomActionsWrap: {
    marginTop: 8,
    marginBottom: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.25)',
    borderRadius: 16,
    paddingVertical: 14,
    ...(isDark ? {} : shadows.subtle),
  },
  logoutBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  footerSpacing: {
    height: 100,
  },
  // Sheet Body Content
  sheetBodyScroll: {
    flex: 1,
  },
  sheetBodyContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sheetSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
    fontWeight: '600',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 11.5,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '600',
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#000000' : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : '#64748B',
  },
  socialLinkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E0F2FE',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  socialLinkedBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : colors.textSecondary,
  },
  actionPillBtn: {
    backgroundColor: isDark ? '#F58A07' : themeColors.navyPrimary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...(isDark ? {} : shadows.subtle),
  },
  actionPillBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: isDark ? '#000000' : '#FFFFFF',
  },
  // OTP Card
  otpVerifyCard: {
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    alignItems: 'center',
  },
  otpCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
    marginBottom: 4,
  },
  otpCardSub: {
    fontSize: 12.5,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  otpInput: {
    backgroundColor: isDark ? '#000000' : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 6,
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
    width: '80%',
    marginBottom: 14,
  },
  cancelLink: {
    marginTop: 12,
    padding: 6,
  },
  cancelLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
  },
  // Account Settings Dropdowns
  dropdownBlock: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
    marginBottom: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    ...(isDark ? {} : shadows.subtle),
  },
  dropdownTriggerActive: {
    borderColor: isDark ? '#F58A07' : colors.navyPrimary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
  },
  dropdownMenu: {
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : themeColors.navyPrimary,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
    ...(isDark ? {} : shadows.subtle),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F8FAFC',
  },
  dropdownItemText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#475569',
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: isDark ? '#F58A07' : themeColors.navyPrimary,
  },
  // Advanced Features Section
  advancedSection: {
    marginTop: 10,
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  advancedSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#94A3B8',
    letterSpacing: 0.8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
  },
  advancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
  },
  advancedRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  advancedRowText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
  },
  // Security Modal
  securityMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    borderRadius: 14,
    padding: 14,
  },
  securityMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIconSlot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: isDark ? '#000000' : '#F1F5F9',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
  },
  methodCardEmail: {
    fontSize: 12,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
    marginTop: 1,
  },
  connectedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  connectedBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  socialNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F0F9FF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#BAE6FD',
    borderRadius: 12,
    padding: 14,
  },
  socialNoticeText: {
    flex: 1,
    fontSize: 12.5,
    color: isDark ? '#FFFFFF' : '#0369A1',
    lineHeight: 18,
    fontWeight: '500',
  },
  passwordCard: {
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    padding: 14,
  },
  passwordCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
    marginBottom: 4,
  },
  passwordCardSub: {
    fontSize: 12,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
    marginBottom: 12,
  },
  forgotPassBtn: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  forgotPassText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: isDark ? '#F58A07' : themeColors.navyPrimary,
  },
  // Notifications Toggles
  cleanToggleList: {
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    overflow: 'hidden',
  },
  cleanToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cleanToggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
  },
  // App Lock Clean
  cleanCard: {
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    overflow: 'hidden',
  },
  cleanSwitchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cleanSwitchItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cleanSwitchItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
  },
  biometricUnavailableHint: {
    fontSize: 12,
    lineHeight: 17,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : colors.textMuted,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  cleanActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  // Active Sessions
  sessionSection: {
    marginBottom: 20,
  },
  sessionSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sessionCard: {
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.04,
    shadowRadius: 3,
    elevation: isDark ? 0 : 1,
  },
  currentSessionCard: {
    borderColor: isDark ? '#F58A07' : 'rgba(8, 72, 135, 0.22)',
    backgroundColor: isDark ? '#000000' : '#FAFCFF',
  },
  sessionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: isDark ? '#000000' : '#F1F5F9',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentSessionIconBox: {
    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE',
  },
  sessionMeta: {
    flex: 1,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sessionDeviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
  },
  thisDeviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  thisDeviceBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.3,
  },
  sessionLocationText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : '#334155',
    marginTop: 2,
  },
  sessionOperatingSystemText: {
    fontSize: 11.5,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
    marginTop: 1,
  },
  sessionTimeText: {
    fontSize: 11.5,
    color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#94A3B8',
    marginTop: 1,
  },
  currentDeviceActionRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(8, 72, 135, 0.08)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  currentDeviceSignOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  currentDeviceSignOutText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
  },
  allSecureBox: {
    backgroundColor: isDark ? '#000000' : '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#BBF7D0',
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  allSecureIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  allSecureTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : '#166534',
  },
  allSecureSub: {
    fontSize: 12,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#15803D',
    textAlign: 'center',
  },
  otherSessionActionsRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  unknownDeviceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245, 138, 7, 0.4)' : '#FDE68A',
    backgroundColor: isDark ? '#000000' : '#FFFBEB',
  },
  unknownDeviceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#F58A07' : '#B45309',
  },
  removeSessionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA',
    backgroundColor: isDark ? '#000000' : '#FEF2F2',
    minWidth: 70,
    alignItems: 'center',
  },
  removeSessionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  sessionsLoadingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  sessionsLoadingText: {
    fontSize: 13,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#94A3B8',
  },
  revokeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5',
    backgroundColor: isDark ? '#000000' : '#FFF5F5',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  revokeAllBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  // Password Choice Dialog
  passwordChoiceDialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: isDark ? 0 : 0.15,
    shadowRadius: 24,
    elevation: isDark ? 0 : 24,
  },
  passwordChoiceHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  passwordChoiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDark ? '#000000' : '#F1F5F9',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  passwordChoiceTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
    textAlign: 'center',
  },
  passwordChoiceSubtitle: {
    fontSize: 12.5,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  passwordChoiceOptions: {
    gap: 10,
    marginBottom: 14,
  },
  passwordOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#000000' : '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    padding: 12,
    gap: 12,
  },
  passwordOptionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordOptionInfo: {
    flex: 1,
  },
  passwordOptionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
  },
  passwordOptionDesc: {
    fontSize: 11.5,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
    marginTop: 2,
  },
  passwordChoiceCancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  passwordChoiceCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : '#64748B',
  },
  // FAQ
  faqCard: {
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  faqQuestion: {
    fontSize: 13.5,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 12.5,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
    lineHeight: 18,
  },
  // Blocked Users
  blockedInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  blockAddBtn: {
    backgroundColor: isDark ? '#F58A07' : colors.navyPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#000000' : '#FFFFFF',
  },
  emptyBlockedBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyBlockedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
    marginTop: 10,
  },
  emptyBlockedSub: {
    fontSize: 12.5,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
    marginTop: 2,
  },
  blockedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  blockedUserEmail: {
    fontSize: 13.5,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
  },
  unblockText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  // Delete Account Sheet
  deleteWarningCard: {
    backgroundColor: isDark ? '#000000' : '#FEF2F2',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  deleteWarningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 4,
  },
  deleteWarningBody: {
    fontSize: 12.5,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#991B1B',
    lineHeight: 18,
  },
  deleteConfirmPrompt: {
    fontSize: 13,
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
    marginBottom: 4,
  },
  dangerPillBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    ...shadows.subtle,
  },
  dangerPillBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Dialog (PIN & Logout)
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 29, 40, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dialogBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
    ...(isDark ? {} : shadows.card),
  },
  dialogSubtitle: {
    fontSize: 13,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
    ...(isDark ? {} : shadows.card),
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
    marginBottom: 4,
  },
  dialogSub: {
    fontSize: 13,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
    marginBottom: 16,
  },
  dialogActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  dialogCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: isDark ? '#000000' : '#F1F5F9',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
  },
  dialogConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: isDark ? '#F58A07' : colors.navyPrimary,
    alignItems: 'center',
  },
  dialogConfirmText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: isDark ? '#000000' : '#FFFFFF',
  },
  dialogLogoutConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  dialogLogoutConfirmText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dialogDeleteConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogDeleteConfirmText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Keypad PIN Modal Styles (Solid Clean Bottom-Sheet)
  pinModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  pinModalCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0 : 0.15,
    shadowRadius: 20,
    elevation: isDark ? 0 : 10,
  },
  pinModalHandle: {
    width: 38,
    height: 3.5,
    borderRadius: 3,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : '#CBD5E1',
    marginBottom: 14,
    alignSelf: 'center',
  },
  pinModalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pinModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : themeColors.textPrimary,
    letterSpacing: -0.3,
  },
  pinModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? '#000000' : '#F1F5F9',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinModalSub: {
    fontSize: 13,
    color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  pinErrorBanner: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    width: '100%',
  },
  pinErrorText: {
    color: '#DC2626',
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 26,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : '#084887',
    backgroundColor: 'transparent',
    opacity: 0.35,
  },
  pinDotFilled: {
    backgroundColor: '#F58A07',
    borderColor: '#F58A07',
    opacity: 1,
  },
  pinKeypadGrid: {
    width: '100%',
    maxWidth: 284,
  },
  pinKeypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pinKeypadKey: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(8, 72, 135, 0.12)',
    shadowColor: '#031D44',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.04,
    shadowRadius: 4,
    elevation: isDark ? 0 : 1,
  },
  pinKeypadKeySpacer: {
    width: 68,
    height: 68,
  },
  pinKeypadKeyText: {
    fontSize: 24,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : '#031D44',
  },
  pinSavingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  pinSavingText: {
    fontSize: 13,
    color: isDark ? '#FFFFFF' : '#475569',
    fontWeight: '600',
  },
  });

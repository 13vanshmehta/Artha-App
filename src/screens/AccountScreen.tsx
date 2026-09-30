import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
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
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { Icon, IconName } from '../components/common/Icon';
import { AccountPageSheetModal } from '../components/common/AccountPageSheetModal';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/ToastContext';
import {
  secureStorage,
  DEFAULT_USER_PREFERENCES,
  StoredUserPreferences,
  PaymentMethodType,
  SavedPaymentMethodItem,
} from '../services/secureStorage';
import {
  SecuritySettingsModal,
  SecuritySheetMode,
} from './auth/SecuritySettingsModal';

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
  | 'payment_methods'
  | 'appearance'
  | 'language_currency'
  | 'notifications'
  | 'help_center'
  | 'invite_friends'
  | 'delete_account';

const PAYMENT_METHOD_TYPES: PaymentMethodType[] = [
  'UPI',
  'Cash',
  'Debit Card',
  'Credit Card',
  'Net Banking',
];

const FAQ_ITEMS = [
  {
    q: 'How are my expenses and group splits stored?',
    a: 'Personal and group expenses are associated with your authenticated Artha account. Payment method labels are stored for expense categorization only.',
  },
  {
    q: 'What is the difference between Account Security and App Lock?',
    a: 'Account Security manages your server-side login credentials (password and Google sign-in). App Lock & Biometrics protects the Artha app locally on this device using Face ID, Touch ID, Biometrics, or a 4–6 digit App PIN.',
  },
  {
    q: 'What happens to shared groups if I delete my account?',
    a: 'If you are the owner of a collaborative expense group with other members, group ownership is automatically transferred to another member so their shared records remain intact.',
  },
];

export const AccountScreen: React.FC<AccountScreenProps> = ({
  onScrollingChange,
}) => {
  const { user, logout, refreshProfile, updateProfile, deleteAccount } =
    useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Persisted user preferences
  const [prefs, setPrefs] = useState<StoredUserPreferences>(
    DEFAULT_USER_PREFERENCES,
  );

  // Dedicated Security Sheet state ('credentials' | 'applock' | 'sessions')
  const [securitySheet, setSecuritySheet] = useState<{
    visible: boolean;
    mode: SecuritySheetMode;
  }>({
    visible: false,
    mode: 'credentials',
  });

  // Dedicated Detail Sheet state
  const [activeSheet, setActiveSheet] = useState<DetailSheetKey>(null);

  // Screen 12: Log Out confirmation modal state
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Screen 2: Manage Profile form state
  const [profileNameInput, setProfileNameInput] = useState(
    user?.displayName ?? '',
  );
  const [nameFieldError, setNameFieldError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Screen 6: Payment Methods & UPI form state
  const [showAddMethodForm, setShowAddMethodForm] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [methodLabelInput, setMethodLabelInput] = useState('');
  const [methodTypeInput, setMethodTypeInput] =
    useState<PaymentMethodType>('UPI');
  const [methodUpiHandleInput, setMethodUpiHandleInput] = useState('');
  const [methodFieldError, setMethodFieldError] = useState<string | null>(null);

  // Screen 10: Help Center legal sub-view
  const [activeLegalView, setActiveLegalView] = useState<
    null | 'privacy' | 'terms'
  >(null);

  // Screen 13: Delete Account two-step confirmation state
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [deletePinInput, setDeletePinInput] = useState('');
  const [deleteFieldError, setDeleteFieldError] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const lastOffsetY = useRef(0);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    secureStorage.loadUserPreferences().then((loaded) => {
      if (mounted) {
        setPrefs(loaded);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (user?.displayName) {
      setProfileNameInput(user.displayName);
    }
  }, [user?.displayName]);

  const updateAndPersistPrefs = useCallback(
    async (
      updater: (prev: StoredUserPreferences) => StoredUserPreferences,
    ) => {
      setPrefs((prev) => {
        const next = updater(prev);
        secureStorage.saveUserPreferences(next);
        return next;
      });
    },
    [],
  );

  const showBottomNav = useCallback(() => {
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    onScrollingChange?.(false);
  }, [onScrollingChange]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    showBottomNav();
    refreshProfile().catch(() => undefined);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      setRefreshing(false);
    }, 700);
  }, [refreshProfile, showBottomNav]);

  useEffect(() => {
    return () => {
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const currentY = contentOffset.y;
    const diff = currentY - lastOffsetY.current;

    if (currentY <= 20) {
      showBottomNav();
      lastOffsetY.current = currentY;
      return;
    }

    const isAtBottom =
      currentY + layoutMeasurement.height >= contentSize.height - 40;
    if (isAtBottom) {
      showBottomNav();
      lastOffsetY.current = currentY;
      return;
    }

    if (diff < -6) {
      showBottomNav();
    } else if (diff > 8 && currentY > 50) {
      onScrollingChange?.(true);

      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = setTimeout(() => {
        onScrollingChange?.(false);
      }, 350);
    }

    lastOffsetY.current = currentY;
  };

  const handleScrollEndDrag = () => {
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    scrollIdleTimer.current = setTimeout(() => {
      onScrollingChange?.(false);
    }, 200);
  };

  const handleMomentumScrollEnd = () => {
    showBottomNav();
  };

  // =========================================================================
  // DERIVED ACCOUNT DATA (No hardcoded names or fake subscription statuses)
  // =========================================================================
  const displayName = user?.displayName?.trim() || 'Artha User';
  const emailAddress = user?.email || '';
  const isVerificationKnown = typeof user?.emailVerified === 'boolean';
  const isEmailVerified = Boolean(user?.emailVerified);

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'AU';

  const biometricEnabled = Boolean(user?.securityPreferences?.biometricEnabled);
  const pinEnabled = Boolean(user?.securityPreferences?.pinEnabled);
  const appLockStatusLabel =
    biometricEnabled && pinEnabled
      ? 'Biometrics & PIN'
      : biometricEnabled
        ? 'Biometrics'
        : pinEnabled
          ? 'App PIN'
          : 'Off';

  const preferredMethod =
    prefs.paymentMethods.find((m) => m.isPreferred) ?? prefs.paymentMethods[0];

  // =========================================================================
  // SCREEN 2: MANAGE PROFILE HANDLERS
  // =========================================================================
  const openManageProfile = () => {
    setProfileNameInput(user?.displayName ?? '');
    setNameFieldError(null);
    setActiveSheet('manage_profile');
  };

  const handleSaveProfile = async () => {
    const trimmed = profileNameInput.trim();
    if (trimmed.length < 2) {
      setNameFieldError('Full name must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 80) {
      setNameFieldError('Full name must be 80 characters or fewer.');
      return;
    }

    setNameFieldError(null);
    setSavingProfile(true);
    try {
      await updateProfile(trimmed);
      setActiveSheet(null);
      toast.success('Profile updated successfully.', 'Profile Saved');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not update profile.';
      setNameFieldError(msg);
      toast.error(msg, 'Update Failed');
    } finally {
      setSavingProfile(false);
    }
  };

  // =========================================================================
  // SCREEN 6: PAYMENT METHODS & UPI HANDLERS
  // =========================================================================
  const handleSelectPreferredMethod = (methodId: string) => {
    updateAndPersistPrefs((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((m) => ({
        ...m,
        isPreferred: m.id === methodId,
      })),
    }));
    toast.info('Preferred payment method updated.', 'Payment Methods');
  };

  const handleStartAddPaymentMethod = () => {
    setEditingMethodId(null);
    setMethodLabelInput('');
    setMethodTypeInput('UPI');
    setMethodUpiHandleInput('');
    setMethodFieldError(null);
    setShowAddMethodForm(true);
  };

  const handleStartEditPaymentMethod = (item: SavedPaymentMethodItem) => {
    setEditingMethodId(item.id);
    setMethodLabelInput(item.label);
    setMethodTypeInput(item.type);
    setMethodUpiHandleInput(item.upiHandle ?? '');
    setMethodFieldError(null);
    setShowAddMethodForm(true);
  };

  const handleSavePaymentMethod = () => {
    const cleanLabel = methodLabelInput.trim();
    const cleanHandle = methodUpiHandleInput.trim();

    if (cleanLabel.length < 2 || cleanLabel.length > 40) {
      setMethodFieldError('Label must be between 2 and 40 characters.');
      return;
    }

    if (cleanHandle && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(cleanHandle)) {
      setMethodFieldError('Enter a valid UPI ID (e.g. name@bank) or leave blank.');
      return;
    }

    setMethodFieldError(null);

    if (editingMethodId) {
      updateAndPersistPrefs((prev) => ({
        ...prev,
        paymentMethods: prev.paymentMethods.map((m) =>
          m.id === editingMethodId
            ? {
                ...m,
                label: cleanLabel,
                type: methodTypeInput,
                upiHandle:
                  methodTypeInput === 'UPI' && cleanHandle
                    ? cleanHandle
                    : undefined,
              }
            : m,
        ),
      }));
      toast.success('Payment method label updated.');
    } else {
      const newItem: SavedPaymentMethodItem = {
        id: `pm-custom-${Date.now()}`,
        label: cleanLabel,
        type: methodTypeInput,
        upiHandle:
          methodTypeInput === 'UPI' && cleanHandle ? cleanHandle : undefined,
        isPreferred: false,
        isBuiltIn: false,
      };
      updateAndPersistPrefs((prev) => ({
        ...prev,
        paymentMethods: [...prev.paymentMethods, newItem],
      }));
      toast.success('Payment method added.');
    }

    setShowAddMethodForm(false);
    setEditingMethodId(null);
    setMethodLabelInput('');
    setMethodUpiHandleInput('');
  };

  const handleRemovePaymentMethod = (id: string) => {
    updateAndPersistPrefs((prev) => {
      const remaining = prev.paymentMethods.filter((m) => m.id !== id);
      const hasPreferred = remaining.some((m) => m.isPreferred);
      if (!hasPreferred && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isPreferred: true };
      }
      return {
        ...prev,
        paymentMethods: remaining,
      };
    });
    toast.info(
      'Custom payment method removed. Existing expense records are unchanged.',
    );
  };

  // =========================================================================
  // SCREEN 11: INVITE FRIENDS HANDLER
  // =========================================================================
  const handleShareInvite = async () => {
    try {
      await Share.share({
        message:
          'Track personal and group expenses clearly with Artha — Know. Spend. Grow.',
        title: 'Invite to Artha',
      });
    } catch {
      toast.error('Could not open the system share sheet.');
    }
  };

  // =========================================================================
  // SCREEN 12: LOG OUT HANDLER
  // =========================================================================
  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutConfirmVisible(false);
      toast.info('You have been signed out of Artha.', 'Signed Out');
    } finally {
      setLoggingOut(false);
    }
  };

  // =========================================================================
  // SCREEN 13: DELETE ACCOUNT HANDLERS
  // =========================================================================
  const openDeleteAccountSheet = () => {
    setDeleteStep(1);
    setDeleteConfirmationInput('');
    setDeletePasswordInput('');
    setDeletePinInput('');
    setDeleteFieldError(null);
    setActiveSheet('delete_account');
  };

  const handleExecuteDeleteAccount = async () => {
    setDeleteFieldError(null);

    if (deleteConfirmationInput.trim().toUpperCase() !== 'DELETE') {
      setDeleteFieldError('Type DELETE in uppercase to confirm.');
      return;
    }

    if (user?.hasPassword && !deletePasswordInput) {
      setDeleteFieldError('Enter your current account password to continue.');
      return;
    }

    if (
      !user?.hasPassword &&
      user?.securityPreferences?.pinEnabled &&
      !/^\d{4,6}$/.test(deletePinInput)
    ) {
      setDeleteFieldError('Enter your 4–6 digit App PIN to continue.');
      return;
    }

    setDeletingAccount(true);
    try {
      await deleteAccount({
        confirmationText: 'DELETE',
        password: user?.hasPassword ? deletePasswordInput : undefined,
        pin:
          !user?.hasPassword && user?.securityPreferences?.pinEnabled
            ? deletePinInput
            : undefined,
      });
      setActiveSheet(null);
      toast.info(
        'Your Artha account has been permanently deleted.',
        'Account Deleted',
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Account deletion could not be completed.';
      setDeleteFieldError(msg);
      toast.error(msg, 'Deletion Failed');
    } finally {
      setDeletingAccount(false);
    }
  };

  // =========================================================================
  // OVERVIEW SECTIONS (Screen 1 — Account Overview)
  // =========================================================================
  const accountRows: OverviewRowItem[] = [
    {
      id: 'manage-profile',
      title: 'Manage Profile',
      subtitle: 'Name and registered email details',
      icon: 'user',
      onPress: openManageProfile,
      testID: 'account-manage-profile-btn',
    },
    {
      id: 'account-security',
      title: 'Account Security',
      subtitle: 'Password and connected sign-in providers',
      icon: 'settings',
      onPress: () =>
        setSecuritySheet({ visible: true, mode: 'credentials' }),
      testID: 'account-open-security-btn',
    },
  ];

  const preferenceRows: OverviewRowItem[] = [
    {
      id: 'payment-methods',
      title: 'Payment Methods & UPI',
      subtitle: 'Manage expense payment labels',
      icon: 'card',
      trailingValue: preferredMethod?.label || 'UPI',
      onPress: () => {
        setShowAddMethodForm(false);
        setMethodFieldError(null);
        setActiveSheet('payment_methods');
      },
    },
    {
      id: 'appearance',
      title: 'Appearance',
      subtitle: 'Theme preference',
      icon: 'moon',
      trailingValue:
        prefs.appearanceMode === 'System' ? 'System' : prefs.appearanceMode,
      onPress: () => setActiveSheet('appearance'),
    },
    {
      id: 'language-currency',
      title: 'Language & Currency',
      subtitle: 'Display language and currency format',
      icon: 'globe',
      trailingValue: `${prefs.language} · ₹`,
      onPress: () => setActiveSheet('language_currency'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Push and email notification preferences',
      icon: 'bell',
      onPress: () => setActiveSheet('notifications'),
    },
  ];

  const privacyAndDevicesRows: OverviewRowItem[] = [
    {
      id: 'app-lock-biometrics',
      title: 'App Lock & Biometrics',
      subtitle: 'Biometric unlock, local PIN, and auto-lock',
      icon: 'shield',
      trailingValue: appLockStatusLabel,
      onPress: () => setSecuritySheet({ visible: true, mode: 'applock' }),
      testID: 'manage-security-sessions-btn',
    },
    {
      id: 'active-sessions',
      title: 'Active Sessions',
      subtitle: 'Review and revoke signed-in devices',
      icon: 'smartphone',
      onPress: () => setSecuritySheet({ visible: true, mode: 'sessions' }),
    },
  ];

  const supportRows: OverviewRowItem[] = [
    {
      id: 'help-center',
      title: 'Help Center',
      subtitle: 'FAQs, privacy policy, terms, and version',
      icon: 'help',
      onPress: () => {
        setActiveLegalView(null);
        setActiveSheet('help_center');
      },
    },
    {
      id: 'invite-friends',
      title: 'Invite Friends',
      subtitle: 'Share Artha via your device share sheet',
      icon: 'group',
      onPress: () => setActiveSheet('invite_friends'),
    },
  ];

  const renderOverviewRow = (item: OverviewRowItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingsRow}
      activeOpacity={0.72}
      onPress={item.onPress}
      testID={item.testID}
    >
      <View style={styles.rowIconBox}>
        <Icon name={item.icon} size={18} color={colors.heroGradientStart} />
      </View>

      <View style={styles.rowTextCol}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        {item.subtitle ? (
          <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
        ) : null}
      </View>

      {item.trailingValue ? (
        <View style={styles.rowPillBadge}>
          <Text style={styles.rowPillText}>{item.trailingValue}  ›</Text>
        </View>
      ) : (
        <Icon name="chevronRight" size={14} color={colors.navyPrimary} />
      )}
    </TouchableOpacity>
  );

  // =========================================================================
  // DETAIL SHEET HEADER & BODY RENDERING
  // =========================================================================
  const getDetailSheetHeader = (): {
    topLabel: string;
    title?: string;
    subtitle?: string;
    rightActionLabel?: string;
    onRightActionPress?: () => void;
    rightActionDisabled?: boolean;
  } => {
    switch (activeSheet) {
      case 'manage_profile':
        return {
          topLabel: 'Manage Profile',
          title: 'Personal Information',
          subtitle: 'View and update your Artha account profile details.',
          rightActionLabel: savingProfile ? 'Saving...' : 'Save',
          onRightActionPress: handleSaveProfile,
          rightActionDisabled: savingProfile,
        };
      case 'payment_methods':
        return {
          topLabel: 'Payment Methods & UPI',
          title: 'Expense Payment Labels',
          subtitle:
            'Manage payment method labels used to categorize and record your expenses.',
        };
      case 'appearance':
        return {
          topLabel: 'Appearance',
          title: 'App Theme',
          subtitle: 'Choose how Artha appears on this device.',
        };
      case 'language_currency':
        return {
          topLabel: 'Language & Currency',
          title: 'Regional Preferences',
          subtitle: 'Manage display language and monetary formatting.',
        };
      case 'notifications':
        return {
          topLabel: 'Notifications',
          title: 'Alert Preferences',
          subtitle:
            'Control push and email notifications for your expenses and security.',
        };
      case 'help_center':
        return {
          topLabel: 'Help Center',
          title: 'Support & Policies',
          subtitle:
            'Answers to common questions, privacy policy, and terms of service.',
        };
      case 'invite_friends':
        return {
          topLabel: 'Invite Friends',
          title: 'Share Artha',
          subtitle:
            'Invite friends or family to track personal and shared group expenses.',
        };
      case 'delete_account':
        return {
          topLabel: 'Delete Account',
          title:
            deleteStep === 1
              ? 'Request Account Deletion'
              : 'Confirm Permanent Deletion',
          subtitle:
            deleteStep === 1
              ? 'Review how deleting your account affects your profile, expenses, and shared groups.'
              : 'Verify your identity and confirm permanent removal of your Artha account.',
        };
      default:
        return { topLabel: 'Account' };
    }
  };

  const renderDetailSheetBody = () => {
    switch (activeSheet) {
      /* ------------------------------------------------------------------ */
      /* SCREEN 2 — MANAGE PROFILE                                          */
      /* ------------------------------------------------------------------ */
      case 'manage_profile':
        return (
          <ScrollView
            style={styles.sheetScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScrollContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {/* Profile Avatar & Summary Card */}
            <View style={styles.profileSummaryCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
              <View style={styles.profileSummaryInfo}>
                <Text style={styles.profileSummaryName} numberOfLines={1}>
                  {displayName}
                </Text>
                {emailAddress ? (
                  <Text style={styles.profileSummaryEmail} numberOfLines={1}>
                    {emailAddress}
                  </Text>
                ) : null}
                {isVerificationKnown && (
                  <View
                    style={[
                      styles.verificationPill,
                      isEmailVerified
                        ? styles.verificationPillVerified
                        : styles.verificationPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.verificationPillText,
                        isEmailVerified
                          ? styles.verificationPillTextVerified
                          : styles.verificationPillTextPending,
                      ]}
                    >
                      {isEmailVerified ? 'Email Verified' : 'Unverified Email'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Editable Full Name */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabelText}>Full Name</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  nameFieldError ? styles.fieldInputError : null,
                ]}
                value={profileNameInput}
                onChangeText={(val) => {
                  setProfileNameInput(val);
                  setNameFieldError(null);
                }}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textMuted}
                maxLength={80}
                autoCapitalize="words"
                testID="manage-profile-name-input"
              />
              {nameFieldError ? (
                <Text style={styles.fieldErrorText}>{nameFieldError}</Text>
              ) : (
                <Text style={styles.fieldHintText}>
                  Displayed on your personal ledger and collaborative expense
                  groups.
                </Text>
              )}
            </View>

            {/* Registered Email (Read-only with explanation) */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabelText}>Registered Email</Text>
              <View style={styles.readOnlyFieldBox}>
                <Text style={styles.readOnlyFieldText}>
                  {emailAddress || 'Not available'}
                </Text>
                {isVerificationKnown && (
                  <Text
                    style={[
                      styles.readOnlyStatusText,
                      isEmailVerified
                        ? styles.verificationPillTextVerified
                        : styles.verificationPillTextPending,
                    ]}
                  >
                    {isEmailVerified ? 'Verified' : 'Unverified'}
                  </Text>
                )}
              </View>
              <Text style={styles.fieldHintText}>
                Your verified email address identifies your Artha account and
                cannot be changed directly from this screen.
              </Text>
            </View>

            {/* Account Creation Date (if available) */}
            {user?.createdAt ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabelText}>Account Created</Text>
                <View style={styles.readOnlyFieldBox}>
                  <Text style={styles.readOnlyFieldText}>
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.primaryPillBtn}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.85}
              testID="edit-profile-save-bottom-btn"
            >
              {savingProfile ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryPillBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        );

      /* ------------------------------------------------------------------ */
      /* SCREEN 6 — PAYMENT METHODS & UPI                                   */
      /* ------------------------------------------------------------------ */
      case 'payment_methods':
        return (
          <ScrollView
            style={styles.sheetScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScrollContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.noticeCard}>
              <Text style={styles.noticeCardText}>
                Payment methods in Artha are labels used to categorize and
                record your expenses. Artha never asks for bank passwords, card
                CVVs, or UPI PINs, and does not connect directly to your bank
                account.
              </Text>
            </View>

            <Text style={styles.sheetSectionLabel}>
              Saved Payment Method Labels
            </Text>
            <View style={styles.sectionRowsWrap}>
              {prefs.paymentMethods.map((method) => (
                <View key={method.id} style={styles.sheetRowItem}>
                  <View style={styles.rowIconBox}>
                    <Icon name="card" size={18} color={colors.navyPrimary} />
                  </View>
                  <View style={styles.rowTextCol}>
                    <View style={styles.inlineRowTitleWrap}>
                      <Text style={styles.rowTitle}>{method.label}</Text>
                      {method.isPreferred && (
                        <View style={styles.preferredBadge}>
                          <Text style={styles.preferredBadgeText}>
                            PREFERRED
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rowSubtitle}>
                      {method.type}
                      {method.upiHandle ? ` • ${method.upiHandle}` : ''}
                    </Text>
                  </View>

                  <View style={styles.methodActionsGroup}>
                    {!method.isPreferred && (
                      <TouchableOpacity
                        style={styles.rowPillBadge}
                        onPress={() => handleSelectPreferredMethod(method.id)}
                      >
                        <Text style={styles.rowPillText}>Set Default</Text>
                      </TouchableOpacity>
                    )}

                    {!method.isBuiltIn && (
                      <>
                        <TouchableOpacity
                          style={styles.rowPillBadge}
                          onPress={() => handleStartEditPaymentMethod(method)}
                        >
                          <Text style={styles.rowPillText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeSmallPill}
                          onPress={() => handleRemovePaymentMethod(method.id)}
                        >
                          <Text style={styles.removeSmallPillText}>Remove</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {showAddMethodForm ? (
              <View style={styles.inlineFormCard}>
                <Text style={styles.fieldLabelText}>
                  {editingMethodId
                    ? 'Edit Payment Method Label'
                    : 'Add Custom Payment Method Label'}
                </Text>

                <Text style={styles.subInputLabel}>Category Type</Text>
                <View style={styles.chipsWrap}>
                  {PAYMENT_METHOD_TYPES.map((typeOption) => {
                    const selected = methodTypeInput === typeOption;
                    return (
                      <TouchableOpacity
                        key={typeOption}
                        style={[
                          styles.chipPill,
                          selected
                            ? styles.chipPillActive
                            : styles.chipPillOutline,
                        ]}
                        onPress={() => setMethodTypeInput(typeOption)}
                      >
                        <Text
                          style={[
                            styles.chipPillText,
                            selected
                              ? styles.chipPillTextActive
                              : styles.chipPillTextOutline,
                          ]}
                        >
                          {typeOption}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.subInputLabel}>Label Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={methodLabelInput}
                  onChangeText={(v) => {
                    setMethodLabelInput(v);
                    setMethodFieldError(null);
                  }}
                  placeholder="e.g. Google Pay UPI or HDFC Credit Card"
                  placeholderTextColor={colors.textMuted}
                  maxLength={40}
                />

                {methodTypeInput === 'UPI' && (
                  <>
                    <Text style={styles.subInputLabel}>
                      Optional UPI Handle (For Reference Only)
                    </Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={methodUpiHandleInput}
                      onChangeText={(v) => {
                        setMethodUpiHandleInput(v);
                        setMethodFieldError(null);
                      }}
                      placeholder="e.g. name@okaxis"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      maxLength={60}
                    />
                    <Text style={styles.fieldHintText}>
                      Stored locally on your device solely to identify your
                      preferred UPI handle in expense records.
                    </Text>
                  </>
                )}

                {methodFieldError ? (
                  <Text style={styles.fieldErrorText}>{methodFieldError}</Text>
                ) : null}

                <View style={styles.inlineButtonsRow}>
                  <TouchableOpacity
                    style={styles.secondaryOutlineBtn}
                    onPress={() => {
                      setShowAddMethodForm(false);
                      setEditingMethodId(null);
                      setMethodFieldError(null);
                    }}
                  >
                    <Text style={styles.secondaryOutlineBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryInlineBtn}
                    onPress={handleSavePaymentMethod}
                  >
                    <Text style={styles.primaryInlineBtnText}>Save Label</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.primaryPillBtn}
                onPress={handleStartAddPaymentMethod}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryPillBtnText}>
                  Add Custom Payment Label
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        );

      /* ------------------------------------------------------------------ */
      /* SCREEN 7 — APPEARANCE                                              */
      /* ------------------------------------------------------------------ */
      case 'appearance':
        return (
          <ScrollView
            style={styles.sheetScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScrollContent}
            nestedScrollEnabled
          >
            <Text style={styles.sheetSectionLabel}>Theme Selection</Text>

            {/* System Default */}
            <TouchableOpacity
              style={styles.sheetRowItem}
              activeOpacity={0.75}
              onPress={() => {
                updateAndPersistPrefs((prev) => ({
                  ...prev,
                  appearanceMode: 'System',
                }));
                toast.info('Appearance set to System Default.', 'Appearance');
              }}
            >
              <View style={styles.rowIconBox}>
                <Icon name="smartphone" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>System Default</Text>
                <Text style={styles.rowSubtitle}>
                  Uses Artha’s signature light palette matched to your device
                </Text>
              </View>
              <View
                style={[
                  styles.rowPillBadge,
                  prefs.appearanceMode === 'System' &&
                    styles.rowPillBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.rowPillText,
                    prefs.appearanceMode === 'System' &&
                      styles.rowPillTextActive,
                  ]}
                >
                  {prefs.appearanceMode === 'System' ? 'Selected' : 'Select'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Light Mode */}
            <TouchableOpacity
              style={styles.sheetRowItem}
              activeOpacity={0.75}
              onPress={() => {
                updateAndPersistPrefs((prev) => ({
                  ...prev,
                  appearanceMode: 'Light',
                }));
                toast.info('Appearance set to Light mode.', 'Appearance');
              }}
            >
              <View style={styles.rowIconBox}>
                <Icon name="moon" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Light</Text>
                <Text style={styles.rowSubtitle}>
                  Pale ice-blue and high-contrast deep navy surfaces
                </Text>
              </View>
              <View
                style={[
                  styles.rowPillBadge,
                  prefs.appearanceMode === 'Light' && styles.rowPillBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.rowPillText,
                    prefs.appearanceMode === 'Light' &&
                      styles.rowPillTextActive,
                  ]}
                >
                  {prefs.appearanceMode === 'Light' ? 'Selected' : 'Select'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Dark Mode (Clearly marked Coming Soon so it never fakes a partial theme) */}
            <TouchableOpacity
              style={styles.sheetRowItem}
              activeOpacity={0.75}
              onPress={() =>
                toast.info(
                  'Full app-wide Dark Mode across charts and ledgers is coming soon.',
                  'Coming Soon',
                )
              }
            >
              <View style={styles.rowIconBox}>
                <Icon name="moon" size={18} color={colors.textMuted} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Dark</Text>
                <Text style={styles.rowSubtitle}>
                  Full dark theme across charts, forms, and ledgers
                </Text>
              </View>
              <View style={styles.comingSoonPill}>
                <Text style={styles.comingSoonPillText}>Coming Soon</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        );

      /* ------------------------------------------------------------------ */
      /* SCREEN 8 — LANGUAGE & CURRENCY                                     */
      /* ------------------------------------------------------------------ */
      case 'language_currency':
        return (
          <ScrollView
            style={styles.sheetScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScrollContent}
            nestedScrollEnabled
          >
            <Text style={styles.sheetSectionLabel}>Language</Text>
            <View style={styles.sheetRowItem}>
              <View style={styles.rowIconBox}>
                <Icon name="globe" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>English</Text>
                <Text style={styles.rowSubtitle}>
                  Supported application interface language
                </Text>
              </View>
              <View style={[styles.rowPillBadge, styles.rowPillBadgeActive]}>
                <Text style={[styles.rowPillText, styles.rowPillTextActive]}>
                  Active
                </Text>
              </View>
            </View>

            <Text style={styles.sheetSectionLabel}>Currency</Text>
            <View style={styles.sheetRowItem}>
              <View style={styles.rowIconBox}>
                <Icon name="wallet" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>INR (₹) — Indian Rupee</Text>
                <Text style={styles.rowSubtitle}>
                  Default currency for expenses, group splits, and monthly
                  reports
                </Text>
              </View>
              <View style={[styles.rowPillBadge, styles.rowPillBadgeActive]}>
                <Text style={[styles.rowPillText, styles.rowPillTextActive]}>
                  Default
                </Text>
              </View>
            </View>

            <View style={styles.noticeCard}>
              <Text style={styles.noticeCardText}>
                All monetary values in Artha are formatted in Indian Rupees
                (₹ INR). Display currency formatting does not perform automatic
                exchange-rate conversion on historical expense amounts.
              </Text>
            </View>
          </ScrollView>
        );

      /* ------------------------------------------------------------------ */
      /* SCREEN 9 — NOTIFICATIONS                                           */
      /* ------------------------------------------------------------------ */
      case 'notifications':
        return (
          <ScrollView
            style={styles.sheetScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScrollContent}
            nestedScrollEnabled
          >
            <View style={styles.noticeCard}>
              <Text style={styles.noticeCardText}>
                Device notification permissions must be enabled in your phone’s
                system settings for push alerts to appear on your lock screen.
              </Text>
            </View>

            <Text style={styles.sheetSectionLabel}>Push Notifications</Text>
            <View style={styles.sheetRowItem}>
              <View style={styles.rowIconBox}>
                <Icon name="bell" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Expense Reminders</Text>
                <Text style={styles.rowSubtitle}>
                  Reminders to log daily personal expenses
                </Text>
              </View>
              <Switch
                value={prefs.notifications.pushExpenseReminders}
                onValueChange={(val) =>
                  updateAndPersistPrefs((prev) => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      pushExpenseReminders: val,
                    },
                  }))
                }
                trackColor={{ false: '#CBD5E1', true: colors.bluePrimary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.sheetRowItem}>
              <View style={styles.rowIconBox}>
                <Icon name="group" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Group Expense Updates</Text>
                <Text style={styles.rowSubtitle}>
                  Alerts when members add expenses to your shared groups
                </Text>
              </View>
              <Switch
                value={prefs.notifications.pushGroupUpdates}
                onValueChange={(val) =>
                  updateAndPersistPrefs((prev) => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      pushGroupUpdates: val,
                    },
                  }))
                }
                trackColor={{ false: '#CBD5E1', true: colors.bluePrimary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.sheetRowItem}>
              <View style={styles.rowIconBox}>
                <Icon name="wallet" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Settlement Updates</Text>
                <Text style={styles.rowSubtitle}>
                  Notifications when shared group balances are settled
                </Text>
              </View>
              <Switch
                value={prefs.notifications.pushSettlementUpdates}
                onValueChange={(val) =>
                  updateAndPersistPrefs((prev) => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      pushSettlementUpdates: val,
                    },
                  }))
                }
                trackColor={{ false: '#CBD5E1', true: colors.bluePrimary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.sheetRowItem}>
              <View style={styles.rowIconBox}>
                <Icon name="analytics" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Budget Alerts</Text>
                <Text style={styles.rowSubtitle}>
                  Warnings when category spending approaches your monthly limit
                </Text>
              </View>
              <Switch
                value={prefs.notifications.pushBudgetAlerts}
                onValueChange={(val) =>
                  updateAndPersistPrefs((prev) => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      pushBudgetAlerts: val,
                    },
                  }))
                }
                trackColor={{ false: '#CBD5E1', true: colors.bluePrimary }}
                thumbColor={colors.white}
              />
            </View>

            <Text style={styles.sheetSectionLabel}>Email Notifications</Text>
            <View style={styles.sheetRowItem}>
              <View style={styles.rowIconBox}>
                <Icon name="shield" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Security & Sign-In Alerts</Text>
                <Text style={styles.rowSubtitle}>
                  Required for new device sign-ins and password changes
                </Text>
              </View>
              <View style={styles.comingSoonPill}>
                <Text style={styles.comingSoonPillText}>Required</Text>
              </View>
            </View>

            <View style={styles.sheetRowItem}>
              <View style={styles.rowIconBox}>
                <Icon name="lock" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>
                  Verification & Password Reset
                </Text>
                <Text style={styles.rowSubtitle}>
                  Required for 6-digit OTP verification and recovery emails
                </Text>
              </View>
              <View style={styles.comingSoonPill}>
                <Text style={styles.comingSoonPillText}>Required</Text>
              </View>
            </View>

            <View style={styles.sheetRowItem}>
              <View style={styles.rowIconBox}>
                <Icon name="mail" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Group Activity & Summaries</Text>
                <Text style={styles.rowSubtitle}>
                  Periodic email summaries of group expenses and monthly totals
                </Text>
              </View>
              <Switch
                value={prefs.notifications.emailActivitySummaries}
                onValueChange={(val) =>
                  updateAndPersistPrefs((prev) => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      emailActivitySummaries: val,
                    },
                  }))
                }
                trackColor={{ false: '#CBD5E1', true: colors.bluePrimary }}
                thumbColor={colors.white}
              />
            </View>
          </ScrollView>
        );

      /* ------------------------------------------------------------------ */
      /* SCREEN 10 — HELP CENTER                                            */
      /* ------------------------------------------------------------------ */
      case 'help_center':
        return (
          <ScrollView
            style={styles.sheetScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScrollContent}
            nestedScrollEnabled
          >
            <Text style={styles.sheetSectionLabel}>
              Frequently Asked Questions
            </Text>
            {FAQ_ITEMS.map((item) => (
              <View key={item.q} style={styles.faqCard}>
                <Text style={styles.faqQuestionText}>{item.q}</Text>
                <Text style={styles.faqAnswerText}>{item.a}</Text>
              </View>
            ))}

            <Text style={styles.sheetSectionLabel}>Legal & Policies</Text>
            <TouchableOpacity
              style={styles.sheetRowItem}
              activeOpacity={0.75}
              onPress={() =>
                setActiveLegalView((prev) =>
                  prev === 'privacy' ? null : 'privacy',
                )
              }
            >
              <View style={styles.rowIconBox}>
                <Icon name="shield" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Privacy Policy</Text>
                <Text style={styles.rowSubtitle}>
                  How Artha protects your financial and authentication data
                </Text>
              </View>
              <Icon
                name={activeLegalView === 'privacy' ? 'arrowDown' : 'chevronRight'}
                size={14}
                color={colors.navyPrimary}
              />
            </TouchableOpacity>

            {activeLegalView === 'privacy' && (
              <View style={styles.faqCard}>
                <Text style={styles.faqAnswerText}>
                  Artha stores authentication tokens in hardware-backed device
                  Keychain/Keystore storage, hashes passwords and App PINs with
                  Argon2id, and never sells or shares your personal or group
                  expense records with third-party advertisers.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.sheetRowItem}
              activeOpacity={0.75}
              onPress={() =>
                setActiveLegalView((prev) =>
                  prev === 'terms' ? null : 'terms',
                )
              }
            >
              <View style={styles.rowIconBox}>
                <Icon name="receipt" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Terms of Service</Text>
                <Text style={styles.rowSubtitle}>
                  Usage terms for personal and collaborative expense tracking
                </Text>
              </View>
              <Icon
                name={activeLegalView === 'terms' ? 'arrowDown' : 'chevronRight'}
                size={14}
                color={colors.navyPrimary}
              />
            </TouchableOpacity>

            {activeLegalView === 'terms' && (
              <View style={styles.faqCard}>
                <Text style={styles.faqAnswerText}>
                  Artha is a personal and collaborative expense-tracking tool
                  and is not a bank or payment processor. Users are responsible
                  for maintaining the confidentiality of their account
                  credentials and verifying shared group settlements.
                </Text>
              </View>
            )}

            <Text style={styles.sheetSectionLabel}>Application Info</Text>
            <View style={styles.sheetRowItem}>
              <View style={styles.rowIconBox}>
                <Icon name="smartphone" size={18} color={colors.navyPrimary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>App Version</Text>
                <Text style={styles.rowSubtitle}>
                  Artha — Know. Spend. Grow.
                </Text>
              </View>
              <View style={styles.comingSoonPill}>
                <Text style={styles.comingSoonPillText}>v0.0.1</Text>
              </View>
            </View>
          </ScrollView>
        );

      /* ------------------------------------------------------------------ */
      /* SCREEN 11 — INVITE FRIENDS                                         */
      /* ------------------------------------------------------------------ */
      case 'invite_friends':
        return (
          <ScrollView
            style={styles.sheetScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScrollContent}
            nestedScrollEnabled
          >
            <View style={styles.faqCard}>
              <Text style={styles.faqQuestionText}>
                Collaborate on Shared Expenses
              </Text>
              <Text style={styles.faqAnswerText}>
                Invite roommates, family members, or travel companions to join
                Artha so you can split bills and track shared group expenses
                together.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryPillBtn}
              onPress={handleShareInvite}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryPillBtnText}>
                Share Invitation via System Share Sheet
              </Text>
            </TouchableOpacity>
          </ScrollView>
        );

      /* ------------------------------------------------------------------ */
      /* SCREEN 13 — DELETE ACCOUNT (Two-Step Confirmation + Re-Auth)       */
      /* ------------------------------------------------------------------ */
      case 'delete_account':
        return (
          <ScrollView
            style={styles.sheetScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScrollContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {deleteStep === 1 ? (
              <>
                <View style={styles.destructiveWarningCard}>
                  <Text style={styles.destructiveWarningTitle}>
                    What happens when you delete your account:
                  </Text>
                  <Text style={styles.destructiveWarningItem}>
                    • Your personal profile, login credentials, linked social
                    identities, and active device sessions are permanently
                    revoked and removed.
                  </Text>
                  <Text style={styles.destructiveWarningItem}>
                    • Your personal non-group expense records are permanently
                    deleted.
                  </Text>
                  <Text style={styles.destructiveWarningItem}>
                    • Collaborative groups where you are the sole member are
                    deleted. For shared groups with other members, group
                    ownership is transferred to another member so other users’
                    shared financial records are preserved.
                  </Text>
                </View>

                <View style={styles.bottomActionsBlock}>
                  <TouchableOpacity
                    style={styles.logOutPillBtn}
                    activeOpacity={0.8}
                    onPress={() => setActiveSheet(null)}
                  >
                    <Text style={styles.logOutPillText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteAccountPillBtn}
                    activeOpacity={0.8}
                    onPress={() => setDeleteStep(2)}
                    testID="delete-account-continue-btn"
                  >
                    <Icon name="trash" size={16} color={colors.negative} />
                    <Text style={styles.deleteAccountPillText}>
                      Continue to Final Confirmation
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabelText}>
                    Type DELETE to Confirm
                  </Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={deleteConfirmationInput}
                    onChangeText={(v) => {
                      setDeleteConfirmationInput(v);
                      setDeleteFieldError(null);
                    }}
                    placeholder="Type DELETE"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    testID="delete-account-confirm-input"
                  />
                </View>

                {user?.hasPassword ? (
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabelText}>
                      Confirm Current Password
                    </Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={deletePasswordInput}
                      onChangeText={(v) => {
                        setDeletePasswordInput(v);
                        setDeleteFieldError(null);
                      }}
                      placeholder="Enter your account password"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                      autoCapitalize="none"
                      testID="delete-account-password-input"
                    />
                  </View>
                ) : user?.securityPreferences?.pinEnabled ? (
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabelText}>Confirm App PIN</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={deletePinInput}
                      onChangeText={(v) => {
                        setDeletePinInput(v.replace(/\D/g, ''));
                        setDeleteFieldError(null);
                      }}
                      placeholder="Enter your 4–6 digit App PIN"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={6}
                      testID="delete-account-pin-input"
                    />
                  </View>
                ) : null}

                {deleteFieldError ? (
                  <Text style={styles.fieldErrorText}>{deleteFieldError}</Text>
                ) : null}

                <View style={styles.bottomActionsBlock}>
                  <TouchableOpacity
                    style={styles.logOutPillBtn}
                    activeOpacity={0.8}
                    disabled={deletingAccount}
                    onPress={() => setDeleteStep(1)}
                  >
                    <Text style={styles.logOutPillText}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteAccountSolidBtn}
                    activeOpacity={0.85}
                    disabled={deletingAccount}
                    onPress={handleExecuteDeleteAccount}
                    testID="delete-account-submit-btn"
                  >
                    {deletingAccount ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <>
                        <Icon name="trash" size={16} color={colors.white} />
                        <Text style={styles.deleteAccountSolidText}>
                          Permanently Delete Account
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        );

      default:
        return null;
    }
  };

  const detailHeader = getDetailSheetHeader();

  return (
    <View style={styles.screen}>
      {/* ================================================================ */}
      {/* SCREEN 1 — ACCOUNT OVERVIEW                                      */}
      {/* ================================================================ */}
      <ScrollView
        style={styles.sheetScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.navyPrimary, colors.bluePrimary]}
            tintColor={colors.navyPrimary}
          />
        }
      >
        {/* Header: Page Title + Compact Real Profile Summary */}
        <View style={styles.overviewHeader}>
          <Text style={styles.overviewTitle}>Account</Text>
        </View>

        <TouchableOpacity
          style={styles.profileSummaryCard}
          activeOpacity={0.8}
          onPress={openManageProfile}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>

          <View style={styles.profileSummaryInfo}>
            <Text style={styles.profileSummaryName} numberOfLines={1}>
              {displayName}
            </Text>
            {emailAddress ? (
              <Text style={styles.profileSummaryEmail} numberOfLines={1}>
                {emailAddress}
              </Text>
            ) : null}
          </View>

          {isVerificationKnown && (
            <View
              style={[
                styles.verificationPill,
                isEmailVerified
                  ? styles.verificationPillVerified
                  : styles.verificationPillPending,
              ]}
            >
              <Text
                style={[
                  styles.verificationPillText,
                  isEmailVerified
                    ? styles.verificationPillTextVerified
                    : styles.verificationPillTextPending,
                ]}
              >
                {isEmailVerified ? 'Verified' : 'Unverified'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Section A — Account */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionCategoryTitle}>Account</Text>
          <View style={styles.sectionRowsWrap}>
            {accountRows.map(renderOverviewRow)}
          </View>
        </View>

        {/* Section B — Preferences */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionCategoryTitle}>Preferences</Text>
          <View style={styles.sectionRowsWrap}>
            {preferenceRows.map(renderOverviewRow)}
          </View>
        </View>

        {/* Section C — Privacy & Devices */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionCategoryTitle}>Privacy & Devices</Text>
          <View style={styles.sectionRowsWrap}>
            {privacyAndDevicesRows.map(renderOverviewRow)}
          </View>
        </View>

        {/* Section D — Support */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionCategoryTitle}>Support</Text>
          <View style={styles.sectionRowsWrap}>
            {supportRows.map(renderOverviewRow)}
          </View>
        </View>

        {/* Footer Actions: Log Out & Delete Account */}
        <View style={styles.bottomActionsBlock}>
          <TouchableOpacity
            style={styles.logOutPillBtn}
            activeOpacity={0.78}
            onPress={() => setLogoutConfirmVisible(true)}
            testID="account-signout-btn"
          >
            <Icon name="logOut" size={16} color={colors.navyPrimary} />
            <Text style={styles.logOutPillText}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteAccountPillBtn}
            activeOpacity={0.78}
            onPress={openDeleteAccountSheet}
            testID="account-delete-btn"
          >
            <Icon name="trash" size={16} color={colors.negative} />
            <Text style={styles.deleteAccountPillText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ================================================================ */}
      {/* SCREENS 3, 4, 5 — SECURITY, APP LOCK & BIOMETRICS, SESSIONS      */}
      {/* ================================================================ */}
      <SecuritySettingsModal
        visible={securitySheet.visible}
        mode={securitySheet.mode}
        onClose={() =>
          setSecuritySheet((prev) => ({ ...prev, visible: false }))
        }
      />

      {/* ================================================================ */}
      {/* SCREENS 2, 6, 7, 8, 9, 10, 11, 13 — DEDICATED DETAIL SHEETS      */}
      {/* ================================================================ */}
      <AccountPageSheetModal
        visible={activeSheet !== null}
        onClose={() => setActiveSheet(null)}
        topLabel={detailHeader.topLabel}
        title={detailHeader.title}
        subtitle={detailHeader.subtitle}
        rightActionLabel={detailHeader.rightActionLabel}
        onRightActionPress={detailHeader.onRightActionPress}
        rightActionDisabled={detailHeader.rightActionDisabled}
        closeButtonTestID="account-subsheet-close-btn"
        testID="account-subsheet-modal"
      >
        {renderDetailSheetBody()}
      </AccountPageSheetModal>

      {/* ================================================================ */}
      {/* SCREEN 12 — LOG OUT CONFIRMATION DIALOG                          */}
      {/* ================================================================ */}
      <Modal
        visible={logoutConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutConfirmVisible(false)}
      >
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialogCard} testID="logout-confirm-dialog">
            <Text style={styles.dialogTitle}>Log out?</Text>
            <Text style={styles.dialogBodyText}>
              You will be signed out of your Artha account on this device and
              returned to the welcome screen.
            </Text>

            <View style={styles.dialogActionsRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                disabled={loggingOut}
                onPress={() => setLogoutConfirmVisible(false)}
                testID="logout-dialog-cancel-btn"
              >
                <Text style={styles.dialogCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                disabled={loggingOut}
                onPress={handleConfirmLogout}
                testID="logout-dialog-confirm-btn"
              >
                {loggingOut ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.dialogConfirmBtnText}>Log Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundSubtle,
  },
  sheetScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sheetScrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 60,
  },
  // Account Overview Header & Compact Profile Summary
  overviewHeader: {
    marginBottom: spacing.md,
  },
  overviewTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.navyPrimary,
    letterSpacing: -0.5,
  },
  profileSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderBlue,
    padding: 14,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
  },
  profileSummaryInfo: {
    flex: 1,
    paddingRight: 8,
  },
  profileSummaryName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navyPrimary,
  },
  profileSummaryEmail: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
  },
  verificationPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    marginTop: 4,
  },
  verificationPillVerified: {
    backgroundColor: colors.positiveBg,
  },
  verificationPillPending: {
    backgroundColor: colors.warningBg,
  },
  verificationPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  verificationPillTextVerified: {
    color: colors.positive,
  },
  verificationPillTextPending: {
    color: colors.warning,
  },
  // Overview Sections & Rows (64–88dp comfortable height)
  sectionBlock: {
    marginBottom: spacing.lg,
  },
  sectionCategoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.heroGradientStart,
    marginBottom: spacing.xs + 2,
    letterSpacing: 0.2,
  },
  sectionRowsWrap: {
    gap: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  rowIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(111, 181, 238, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navyPrimary,
    letterSpacing: -0.2,
  },
  rowSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  rowPillBadge: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderBlue,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
  },
  rowPillBadgeActive: {
    backgroundColor: colors.navyPrimary,
    borderColor: colors.navyPrimary,
  },
  rowPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navyPrimary,
  },
  rowPillTextActive: {
    color: colors.white,
  },
  comingSoonPill: {
    backgroundColor: 'rgba(10, 40, 85, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.12)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
  },
  comingSoonPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textMuted,
  },
  // Footer Actions
  bottomActionsBlock: {
    marginTop: spacing.md,
    gap: 12,
  },
  logOutPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderBlue,
    borderRadius: borderRadius.round,
    paddingVertical: 14,
    ...shadows.subtle,
  },
  logOutPillText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navyPrimary,
  },
  deleteAccountPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.09)',
    borderRadius: borderRadius.round,
    paddingVertical: 14,
  },
  deleteAccountPillText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.negative,
  },
  deleteAccountSolidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.negative,
    borderRadius: borderRadius.round,
    paddingVertical: 14,
  },
  deleteAccountSolidText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  // Detail Sheets Shared Elements
  sheetSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.heroGradientStart,
    marginTop: spacing.md,
    marginBottom: spacing.xs + 2,
    letterSpacing: 0.2,
  },
  sheetRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 10,
  },
  inlineRowTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  preferredBadge: {
    backgroundColor: colors.positiveBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  preferredBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.positive,
  },
  methodActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removeSmallPill: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
  },
  removeSmallPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.negative,
  },
  noticeCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderBlue,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  noticeCardText: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  faqCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.1)',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navyDeep,
    marginBottom: 4,
  },
  faqAnswerText: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  destructiveWarningCard: {
    backgroundColor: 'rgba(220, 38, 38, 0.06)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.22)',
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 8,
  },
  destructiveWarningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.negative,
    marginBottom: 2,
  },
  destructiveWarningItem: {
    fontSize: 13,
    color: colors.navyDeep,
    lineHeight: 19,
  },
  // Form Fields
  fieldBlock: {
    marginBottom: spacing.md,
  },
  fieldLabelText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.navyPrimary,
    marginBottom: 6,
  },
  subInputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.navyDeep,
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderBlue,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: '600',
    color: colors.navyPrimary,
  },
  fieldInputError: {
    borderColor: colors.negative,
  },
  fieldErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.negative,
    marginTop: 6,
  },
  fieldHintText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 17,
  },
  readOnlyFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 40, 85, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyFieldText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  readOnlyStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inlineFormCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderBlue,
    padding: spacing.md,
    marginTop: spacing.sm,
    ...shadows.subtle,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipPill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: borderRadius.round,
  },
  chipPillActive: {
    backgroundColor: colors.navyPrimary,
  },
  chipPillOutline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderBlue,
  },
  chipPillText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  chipPillTextActive: {
    color: colors.white,
  },
  chipPillTextOutline: {
    color: colors.navyPrimary,
  },
  inlineButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryOutlineBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.16)',
    borderRadius: borderRadius.round,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryOutlineBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.navyDeep,
  },
  primaryInlineBtn: {
    flex: 1,
    backgroundColor: colors.navyPrimary,
    borderRadius: borderRadius.round,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryInlineBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.white,
  },
  primaryPillBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.navyPrimary,
    borderRadius: borderRadius.round,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  primaryPillBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  // Screen 12: Log Out Confirmation Dialog
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 19, 41, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.card,
  },
  dialogTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.navyDeep,
    marginBottom: 8,
  },
  dialogBodyText: {
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  dialogActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dialogCancelBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderBlue,
    borderRadius: borderRadius.round,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dialogCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navyPrimary,
  },
  dialogConfirmBtn: {
    flex: 1,
    backgroundColor: colors.navyPrimary,
    borderRadius: borderRadius.round,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  bottomSpacer: {
    height: 115,
  },
});

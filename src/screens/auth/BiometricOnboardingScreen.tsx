import React, { useContext, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import {
  AuthPrimaryButton,
  AuthSecondaryButton,
} from '../../components/auth/AuthButtons';
import { Icon } from '../../components/common/Icon';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Palette } from '../../theme/colors';
import { toast } from '../../context/ToastContext';
import { formatPlatformBiometryLabel } from '../../services/secureStorage';
import { notificationService } from '../../services/notificationService';
import { borderRadius, shadows, spacing } from '../../theme/spacing';

export const BiometricOnboardingScreen: React.FC = () => {
  const { isDark, colors: themeColors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };
  const {
    supportedBiometry,
    completeBiometricOnboarding,
    skipBiometricOnboarding,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isBiometricAvailable = Boolean(supportedBiometry);
  const biometryLabel = formatPlatformBiometryLabel(supportedBiometry);

  const handleEnableBiometrics = async () => {
    if (loading) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await completeBiometricOnboarding(true);
      toast.success(
        `${biometryLabel} app unlock enabled on this device.`,
        'Protection Configured',
      );
      notificationService.addNotification({
        title: 'Security: Biometric unlock enabled',
        message: `${biometryLabel} authentication was activated on this device.`,
        iconName: 'Shield',
        iconColor: '#084887',
        iconBg: '#E0F2FE',
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not complete biometric setup.';
      setErrorMsg(message);
      toast.error(message, 'Biometric Setup');
    } finally {
      setLoading(false);
    }
  };

  const handleMaybeLater = async () => {
    if (loading) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await skipBiometricOnboarding();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 24) + spacing.md,
          paddingBottom: Math.max(insets.bottom, 20) + spacing.md,
        },
      ]}
      testID="biometric-onboarding-screen"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Subtle pill tag indicating onboarding step */}
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>QUICK SETUP</Text>
        </View>

        {/* Center Minimalist Biometric / Fingerprint Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconGlowHalo} />
          <View style={styles.iconCircle}>
            <Icon
              name="fingerprint"
              size={48}
              color={isDark ? themeColors.accent : '#031D44'}
            />
          </View>
        </View>

        {/* Short Headline & Supporting Text */}
        <Text
          style={styles.title}
          testID="biometric-onboarding-title"
          accessibilityRole="header"
        >
          Secure Artha on this device
        </Text>

        <Text style={styles.subtitle}>
          Use your device's biometrics to unlock Artha quickly and privately.
        </Text>

        {/* Inline Feedback Banner if Biometric Operation Fails or is Cancelled */}
        {errorMsg ? (
          <View style={styles.errorBanner} testID="biometric-error-banner">
            <Icon name="warning" size={16} color={themeColors.negative} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Informative fallback if biometric hardware is unavailable */}
        {!isBiometricAvailable && (
          <View
            style={styles.unavailableCard}
            testID="biometric-unavailable-card"
          >
            <Icon name="info" size={16} color={themeColors.textMuted} />
            <Text style={styles.unavailableText}>
              Biometric authentication is not currently available or enrolled on
              this device. You can configure device protection anytime in
              Account Settings.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Action Container */}
      <View style={styles.bottomSection}>
        {isBiometricAvailable ? (
          <>
            <AuthPrimaryButton
              label={loading ? 'Verifying...' : 'Enable Biometrics'}
              onPress={handleEnableBiometrics}
              loading={loading}
              testID="onboarding-enable-biometrics-btn"
              accessibilityLabel="Enable Biometrics"
            />

            <View style={styles.buttonSpacer} />

            <AuthSecondaryButton
              label="Maybe Later"
              onPress={handleMaybeLater}
              disabled={loading}
              testID="onboarding-skip-biometrics-btn"
              accessibilityLabel="Maybe Later"
            />
          </>
        ) : (
          <AuthPrimaryButton
            label="Continue to Artha"
            onPress={handleMaybeLater}
            loading={loading}
            testID="onboarding-skip-biometrics-btn"
            accessibilityLabel="Continue to Artha"
          />
        )}

        {/* Small Privacy Footnote */}
        <View style={styles.privacyRow} testID="biometric-privacy-note">
          <Icon name="shield" size={13} color={themeColors.textMuted} />
          <Text style={styles.privacyNote}>
            Your biometric data stays on your device.
          </Text>
        </View>
      </View>
    </View>
  );
};

const makeStyles = (c: Palette, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xxl,
    },
    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
    },
    badgePill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: borderRadius.round,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(10, 40, 85, 0.08)',
      marginBottom: spacing.xxl,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: isDark ? c.accent : c.navyPrimary,
      letterSpacing: 0.8,
    },
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xxl,
      width: 104,
      height: 104,
    },
    iconGlowHalo: {
      position: 'absolute',
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: isDark ? 'rgba(245, 138, 7, 0.15)' : c.blueLight,
      opacity: 0.45,
    },
    iconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? c.border : 'rgba(111, 181, 238, 0.4)',
      ...shadows.card,
    },
    title: {
      fontSize: 23,
      fontWeight: '800',
      color: c.textPrimary,
      textAlign: 'center',
      letterSpacing: -0.4,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: c.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      marginBottom: spacing.xl,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : c.negativeBg,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.2)',
      width: '100%',
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      color: c.negative,
      fontWeight: '600',
    },
    unavailableCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surface,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      marginTop: spacing.md,
      borderWidth: 1,
      borderColor: isDark ? c.border : 'rgba(10, 40, 85, 0.08)',
      width: '100%',
    },
    unavailableText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: c.textMuted,
      fontWeight: '500',
    },
    bottomSection: {
      width: '100%',
      paddingTop: spacing.md,
    },
    buttonSpacer: {
      height: spacing.md,
    },
    privacyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing.lg,
    },
    privacyNote: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: '500',
    },
  });

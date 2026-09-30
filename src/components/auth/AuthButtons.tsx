import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from '../common/Icon';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

export const AuthPrimaryButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  testID,
  accessibilityLabel,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.primaryButton, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.primaryButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

export const AuthSecondaryButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  disabled = false,
  testID,
  accessibilityLabel,
}) => {
  return (
    <TouchableOpacity
      style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled }}
      testID={testID}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
};

interface SocialAuthGroupProps {
  onGooglePress: () => void;
  onApplePress: () => void;
  disabled?: boolean;
  googleLoading?: boolean;
  dividerLabel?: string;
  googleTestID?: string;
  appleTestID?: string;
}

export const SocialAuthGroup: React.FC<SocialAuthGroupProps> = ({
  onGooglePress,
  onApplePress,
  disabled = false,
  googleLoading = false,
  dividerLabel = 'OR',
  googleTestID = 'login-google-btn',
  appleTestID = 'login-apple-btn',
}) => {
  const isGoogleDisabled = disabled || googleLoading;

  return (
    <View style={styles.socialContainer}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>{dividerLabel}</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialButtonsColumn}>
        <TouchableOpacity
          style={[
            styles.socialPillBtn,
            isGoogleDisabled && styles.buttonDisabled,
          ]}
          onPress={onGooglePress}
          disabled={isGoogleDisabled}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          accessibilityState={{
            disabled: isGoogleDisabled,
            busy: googleLoading,
          }}
          testID={googleTestID}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color={colors.navyDeep} />
          ) : (
            <>
              <View style={styles.socialIconSlot}>
                <Icon name="google" size={18} />
              </View>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.socialPillBtn,
            styles.applePillBtn,
            disabled && styles.buttonDisabled,
          ]}
          onPress={onApplePress}
          disabled={disabled}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
          accessibilityState={{ disabled }}
          testID={appleTestID}
        >
          <View style={styles.socialIconSlot}>
            <Icon name="apple" size={18} color={colors.navyDeep} />
          </View>
          <Text style={styles.appleBtnText}>Continue with Apple</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  primaryButton: {
    minHeight: 54,
    borderRadius: borderRadius.round,
    backgroundColor: colors.navyDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: borderRadius.round,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.14)',
  },
  secondaryButtonText: {
    color: colors.navyDeep,
    fontSize: 14.5,
    fontWeight: '700',
  },
  socialContainer: {
    marginTop: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '72%',
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(10, 40, 85, 0.12)',
  },
  dividerLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textMuted,
    marginHorizontal: spacing.md,
    letterSpacing: 0.5,
  },
  socialButtonsColumn: {
    width: '100%',
    gap: spacing.sm,
  },
  socialPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    width: '100%',
    borderRadius: borderRadius.round,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.12)',
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    gap: 10,
  },
  applePillBtn: {
    backgroundColor: colors.white,
    borderColor: 'rgba(10, 40, 85, 0.12)',
  },
  socialIconSlot: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.navyDeep,
  },
  appleBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.navyDeep,
  },
});

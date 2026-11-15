import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from '../common/Icon';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Palette } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

interface AuthFormInputProps extends TextInputProps {
  label: string;
  errorText?: string | null;
  helperText?: string | null;
  isPassword?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  passwordToggleTestID?: string;
  disabled?: boolean;
  centerText?: boolean;
}

export const AuthFormInput: React.FC<AuthFormInputProps> = ({
  label,
  errorText,
  helperText,
  isPassword = false,
  showPassword = false,
  onTogglePassword,
  passwordToggleTestID,
  disabled = false,
  centerText = false,
  value,
  onFocus,
  onBlur,
  ...rest
}) => {
  const { isDark, colors: themeColors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(errorText);

  return (
    <View style={styles.fieldGroup}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hasError ? (
          <Text
            style={styles.inlineErrorLabel}
            accessibilityLiveRegion="polite"
          >
            {errorText}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          hasError && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            isPassword && styles.inputWithAccessory,
            centerText && styles.inputCentered,
          ]}
          placeholderTextColor={themeColors.textMuted}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          value={value}
          editable={!disabled}
          secureTextEntry={isPassword ? !showPassword : false}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          {...rest}
        />

        {isPassword && onTogglePassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={onTogglePassword}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? 'Hide password' : 'Show password'
            }
            testID={passwordToggleTestID}
          >
            <Icon
              name={showPassword ? 'eyeOff' : 'eye'}
              size={18}
              color={
                isFocused
                  ? (isDark ? themeColors.accent : themeColors.navyPrimary)
                  : themeColors.textMuted
              }
            />
          </TouchableOpacity>
        )}
      </View>

      {helperText && !hasError ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const makeStyles = (c: Palette, isDark: boolean) =>
  StyleSheet.create({
    fieldGroup: {
      marginBottom: spacing.lg,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textPrimary,
    },
    inlineErrorLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: c.negative,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 54,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: isDark ? c.border : 'rgba(10, 40, 85, 0.12)',
      borderRadius: borderRadius.round,
    },
    inputContainerFocused: {
      borderColor: isDark ? c.accent : c.navyPrimary,
      backgroundColor: c.surface,
    },
    inputContainerError: {
      borderColor: c.negative,
    },
    inputContainerDisabled: {
      opacity: 0.6,
    },
    input: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      paddingVertical: Platform.OS === 'ios' ? 15 : 12,
      fontSize: 15,
      fontWeight: '500',
      color: c.textPrimary,
    },
    inputWithAccessory: {
      paddingRight: spacing.xs,
    },
    inputCentered: {
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: 8,
      textAlign: 'center',
      color: c.textPrimary,
    },
    eyeButton: {
      minWidth: 48,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingRight: spacing.lg,
      paddingLeft: spacing.sm,
    },
    helperText: {
      fontSize: 11.5,
      fontWeight: '500',
      color: c.textMuted,
      marginTop: 6,
      paddingHorizontal: 8,
    },
  });

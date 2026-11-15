import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Palette } from '../../theme/colors';
import { Logo } from '../../components/common/Logo';

const PIN_LENGTH = 4;
const KEYPAD_ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['BIO', '0', 'DEL'],
];

export const AppLockScreen: React.FC = () => {
  const { unlockWithPin, unlockWithBiometrics, logout, user } = useAuth();
  const { isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const biometricEnabled = Boolean(user?.securityPreferences?.biometricEnabled);
  const pinEnabled = Boolean(user?.securityPreferences?.pinEnabled);

  const isJest =
    typeof jest !== 'undefined' ||
    Boolean((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.JEST_WORKER_ID) ||
    Boolean((globalThis as Record<string, unknown>).jest);

  const hasAutoPromptedBioRef = useRef(false);

  // Smooth micro-animations: scale pulse for each dot & shake on error
  const dotScaleAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const animateDot = (index: number) => {
    if (isJest || index < 0 || index >= PIN_LENGTH) return;
    dotScaleAnims[index].setValue(0.7);
    Animated.spring(dotScaleAnims[index], {
      toValue: 1,
      friction: 4,
      tension: 160,
      useNativeDriver: true,
    }).start();
  };

  const triggerShake = () => {
    if (isJest) return;
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -12, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 12, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();
  };

  // Biometric unlock handler
  const handleBiometricAuth = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const res = await unlockWithBiometrics();
      if (!res.success && res.errorMessage) {
        setErrorMsg(res.errorMessage);
        triggerShake();
      }
    } catch {
      setErrorMsg('Biometric authentication failed.');
      triggerShake();
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, unlockWithBiometrics]);

  // Biometric is priority: automatically prompt once on mount if enabled
  useEffect(() => {
    if (isJest) return;
    if (biometricEnabled && !hasAutoPromptedBioRef.current) {
      hasAutoPromptedBioRef.current = true;
      handleBiometricAuth();
    }
  }, [biometricEnabled, handleBiometricAuth, isJest]);

  const handleDigitPress = (key: string) => {
    if (isBusy || key === '') return;
    setErrorMsg(null);

    if (key === 'DEL') {
      if (pin.length > 0) {
        animateDot(pin.length - 1);
        setPin((prev) => prev.slice(0, -1));
      }
      return;
    }

    if (key === 'BIO') {
      if (biometricEnabled) {
        handleBiometricAuth();
      }
      return;
    }

    if (pin.length < PIN_LENGTH) {
      const nextPin = pin + key;
      animateDot(nextPin.length - 1);
      setPin(nextPin);
      if (nextPin.length === PIN_LENGTH) {
        verifyPin(nextPin);
      }
    }
  };

  const verifyPin = async (candidatePin: string) => {
    if (candidatePin.length !== PIN_LENGTH || isBusy) return;

    setIsBusy(true);
    setErrorMsg(null);
    try {
      const res = await unlockWithPin(candidatePin);
      if (!res.success) {
        setPin('');
        setErrorMsg(res.errorMessage || 'Incorrect PIN. Try again.');
        triggerShake();
      }
    } catch {
      setPin('');
      setErrorMsg('Incorrect PIN. Try again.');
      triggerShake();
    } finally {
      setIsBusy(false);
    }
  };

  const canVerify = pin.length === PIN_LENGTH && !isBusy;

  return (
    <View style={styles.container} testID="app-lock-screen">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header with small Artha logo and Title */}
      <View style={styles.header}>
        <View style={styles.logoTile}>
          <Logo size={52} variant={isDark ? 'white' : 'navy'} animated={false} />
        </View>

        <Text style={styles.brandTitle} accessibilityRole="header">
          <Text style={styles.brandNavy}>Arth</Text>
          <Text style={styles.brandOrange}>a</Text>
        </Text>

        <Text style={styles.promptText}>
          {pinEnabled
            ? 'Enter your 4-digit PIN'
            : 'Biometric Authentication Required'}
        </Text>
      </View>

      {/* Case A: PIN is enabled (either PIN only or Both enabled) */}
      {pinEnabled ? (
        <>
          {/* 4 Animated Circles where PIN is entered with horizontal shake on error */}
          <Animated.View
            style={[
              styles.pinCirclesRow,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => {
              const isFilled = i < pin.length;
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.pinCircle,
                    isFilled ? styles.pinCircleFilled : styles.pinCircleEmpty,
                    { transform: [{ scale: dotScaleAnims[i] }] },
                  ]}
                />
              );
            })}
          </Animated.View>

          {/* Error message */}
          {errorMsg ? (
            <View style={styles.errorBox} testID="applock-error-banner">
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : (
            <View style={styles.errorBoxSpacer} />
          )}

          {/* Numerical Circled Keypad with instant active feedback */}
          <View style={styles.keypad}>
            {KEYPAD_ROWS.map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((k, cIdx) => {
                  if (k === 'BIO') {
                    if (!biometricEnabled) {
                      return (
                        <View
                          key={`empty-${cIdx}`}
                          style={styles.keypadCircleSpacer}
                        />
                      );
                    }
                    return (
                      <TouchableOpacity
                        key="BIO"
                        style={[styles.keypadCircle, styles.keypadBioCircle]}
                        onPress={handleBiometricAuth}
                        activeOpacity={0.5}
                        testID="applock-biometric-keypad-btn"
                        accessibilityLabel="Unlock with Biometrics"
                      >
                        <Text style={styles.keypadBioText}>BIO</Text>
                      </TouchableOpacity>
                    );
                  }

                  if (k === '') {
                    return (
                      <View
                        key={`empty-${cIdx}`}
                        style={styles.keypadCircleSpacer}
                      />
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={k}
                      style={styles.keypadCircle}
                      onPress={() => handleDigitPress(k)}
                      activeOpacity={0.4}
                      testID={`applock-key-${k}`}
                    >
                      <Text style={styles.keypadDigitText}>
                        {k === 'DEL' ? '⌫' : k}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Bottom Verify Button */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[
                styles.verifyButton,
                !canVerify && styles.verifyButtonDisabled,
              ]}
              disabled={!canVerify}
              onPress={() => verifyPin(pin)}
              activeOpacity={0.8}
              testID="applock-submit-pin-btn"
            >
              <Text style={styles.verifyButtonText}>
                {isBusy ? 'Verifying…' : 'Verify'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutLink}
              onPress={() => logout()}
              testID="applock-logout-btn"
            >
              <Text style={styles.logoutLinkText}>Log out of account</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Case B: ONLY Biometric is enabled (PIN is OFF) */
        <View style={styles.biometricOnlyContainer}>
          {/* Error message if any */}
          {errorMsg ? (
            <View style={styles.errorBox} testID="applock-error-banner">
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : (
            <Text style={styles.biometricNoticeText}>
              Confirm your identity with Biometrics to access your financial data.
            </Text>
          )}

          {/* Primary Biometric Unlock Button */}
          <TouchableOpacity
            style={styles.biometricMainButton}
            onPress={handleBiometricAuth}
            activeOpacity={0.85}
            disabled={isBusy}
            testID="applock-biometric-btn"
          >
            {isBusy ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.biometricMainButtonText}>
                Verify with Biometrics
              </Text>
            )}
          </TouchableOpacity>

          {/* Log Out */}
          <TouchableOpacity
            style={styles.logoutLink}
            onPress={() => logout()}
            testID="applock-logout-btn"
          >
            <Text style={styles.logoutLinkText}>Log out of account</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const makeStyles = (c: Palette, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 54,
      paddingBottom: 28,
      paddingHorizontal: 28,
    },
    header: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoTile: {
      width: 60,
      height: 60,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    brandTitle: {
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.5,
      fontFamily: Platform.select({
        ios: 'Plus Jakarta Sans',
        android: 'sans-serif-medium',
        default: 'System',
      }),
    },
    brandNavy: {
      color: isDark ? '#FFFFFF' : '#031D44',
    },
    brandOrange: {
      color: c.accent,
    },
    promptText: {
      marginTop: 12,
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? c.textSecondary : '#084887',
      letterSpacing: 0.2,
    },
    pinCirclesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      marginVertical: 12,
    },
    pinCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    pinCircleEmpty: {
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : '#084887',
      backgroundColor: 'transparent',
      opacity: isDark ? 0.6 : 0.35,
    },
    pinCircleFilled: {
      borderWidth: 0,
      backgroundColor: c.accent,
    },
    errorBox: {
      minHeight: 28,
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorBoxSpacer: {
      height: 28,
    },
    errorText: {
      color: c.negative,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    keypad: {
      width: '100%',
      maxWidth: 290,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
    },
    keypadRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
    keypadCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: isDark ? c.border : 'rgba(8, 72, 135, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: isDark ? '#000000' : '#031D44',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.04,
      shadowRadius: 4,
      elevation: isDark ? 0 : 1,
    },
    keypadBioCircle: {
      backgroundColor: isDark ? 'rgba(245, 138, 7, 0.12)' : 'rgba(8, 72, 135, 0.06)',
      borderColor: isDark ? c.accent : '#084887',
    },
    keypadBioText: {
      fontSize: 14,
      fontWeight: '800',
      color: isDark ? c.accent : '#084887',
      letterSpacing: 0.5,
    },
    keypadCircleSpacer: {
      width: 68,
      height: 68,
    },
    keypadDigitText: {
      fontSize: 24,
      fontWeight: '700',
      color: c.textPrimary,
    },
    bottomSection: {
      width: '100%',
      alignItems: 'center',
      gap: 12,
    },
    verifyButton: {
      width: '100%',
      height: 52,
      borderRadius: 26,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.15 : 0.25,
      shadowRadius: 8,
      elevation: 3,
    },
    verifyButtonDisabled: {
      opacity: 0.45,
    },
    verifyButtonText: {
      color: c.onAccent,
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    logoutLink: {
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    logoutLinkText: {
      color: isDark ? c.textSecondary : '#084887',
      fontSize: 13,
      fontWeight: '600',
      opacity: 0.8,
    },
    biometricOnlyContainer: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      paddingHorizontal: 16,
      marginVertical: 'auto',
    },
    biometricNoticeText: {
      fontSize: 15,
      color: isDark ? c.textSecondary : '#084887',
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 280,
      opacity: 0.85,
    },
    biometricMainButton: {
      width: '100%',
      maxWidth: 280,
      height: 54,
      borderRadius: 27,
      backgroundColor: isDark ? c.accent : '#031D44',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: isDark ? c.accent : '#031D44',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    biometricMainButtonText: {
      color: isDark ? c.onAccent : '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  });

import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

const PIN_MAX_LENGTH = 6;
const PIN_MIN_LENGTH = 4;
const KEYPAD_ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'DEL'],
];

interface AppLockScreenProps {
  /**
   * Fires once the very first (auto-triggered) biometric attempt on mount has
   * settled — success, failure, or skipped because biometrics aren't enabled.
   * Lets the caller keep its splash screen up instead of flashing this screen's
   * own UI underneath while that silent first attempt is still running.
   */
  onAutoAttemptSettled?: () => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  onAutoAttemptSettled,
}) => {
  const { unlockWithBiometrics, unlockWithPin, logout, user } = useAuth();
  const isJest = typeof jest !== 'undefined';

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const biometricEnabled = Boolean(user?.securityPreferences?.biometricEnabled);
  const pinEnabled = Boolean(user?.securityPreferences?.pinEnabled);

  const handleSystemUnlockPrompt = useCallback(async () => {
    if (isBusy) return;
    setErrorMsg(null);
    setIsBusy(true);
    try {
      const res = await unlockWithBiometrics();
      if (!res.success && !res.cancelled && res.errorMessage) {
        setErrorMsg(res.errorMessage);
      }
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, unlockWithBiometrics]);

  useEffect(() => {
    if (!isJest && biometricEnabled) {
      handleSystemUnlockPrompt().finally(() => onAutoAttemptSettled?.());
    } else {
      onAutoAttemptSettled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJest, biometricEnabled]);

  const handleDigitPress = (key: string) => {
    if (isBusy || key === '') return;
    setErrorMsg(null);

    if (key === 'DEL') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (key === 'DONE') {
      handleVerifyPin();
      return;
    }

    if (pin.length < PIN_MAX_LENGTH) {
      setPin((prev) => prev + key);
    }
  };

  const handleVerifyPin = async () => {
    if (pin.length < PIN_MIN_LENGTH || isBusy) {
      setErrorMsg('Enter your 4 to 6 digit PIN.');
      return;
    }

    setIsBusy(true);
    setErrorMsg(null);
    try {
      const res = await unlockWithPin(pin);
      if (!res.success) {
        setPin('');
        setErrorMsg(res.errorMessage || 'Incorrect PIN.');
      }
    } finally {
      setIsBusy(false);
    }
  };

  const canSubmit = pin.length >= PIN_MIN_LENGTH && !isBusy;

  return (
    <View style={styles.container} testID="app-lock-screen">
      <StatusBar barStyle="dark-content" />

      <Image
        source={require('../../assets/branding/welcome_wave_bg.png')}
        style={styles.waveBackground}
        resizeMode="cover"
      />

      <View style={styles.logoBlock} pointerEvents="none">
        <View style={styles.logoTile}>
          <Image
            source={require('../../assets/branding/artha_icon_dark.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.brandName}>Artha</Text>
        <Text style={styles.tagline}>Know. Spend. Grow.</Text>
      </View>

      <View style={styles.unlockBlock}>
        {errorMsg ? (
          <View testID="applock-error-banner" style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {pinEnabled ? (
          <>
            <Text style={styles.unlockPrompt}>Enter your PIN</Text>

            <View style={styles.pinDotsRow}>
              {Array.from({ length: PIN_MAX_LENGTH }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    index < pin.length && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>

            <View style={styles.keypad}>
              {KEYPAD_ROWS.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.keypadRow}>
                  {row.map((key, colIndex) =>
                    key === '' ? (
                      <View key={colIndex} style={styles.keypadKeySpacer} />
                    ) : (
                      <TouchableOpacity
                        key={key}
                        activeOpacity={0.6}
                        style={styles.keypadKey}
                        onPress={() => handleDigitPress(key)}
                        testID={`applock-key-${key}`}
                      >
                        <Text style={styles.keypadKeyText}>
                          {key === 'DEL' ? '⌫' : key}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.unlockButton,
                !canSubmit && styles.unlockButtonDisabled,
              ]}
              disabled={!canSubmit}
              onPress={handleVerifyPin}
              testID="applock-submit-pin-btn"
            >
              <Text style={styles.unlockButtonText}>
                {isBusy ? 'Verifying…' : 'Unlock'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.unlockPrompt}>
            {isBusy ? 'Verifying…' : 'Tap below to unlock'}
          </Text>
        )}

        {biometricEnabled && (
          <TouchableOpacity
            style={styles.biometricRetryButton}
            onPress={handleSystemUnlockPrompt}
            testID="applock-biometric-btn"
          >
            <Text style={styles.biometricRetryText}>
              Use Face ID / Fingerprint
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.logoutLink}
          onPress={() => logout()}
          testID="applock-logout-btn"
        >
          <Text style={styles.logoutLinkText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 72,
  },
  waveBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  logoBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTile: {
    width: 72,
    height: 72,
    borderRadius: 20,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.navyDeep,
    letterSpacing: -0.5,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Bold',
      android: 'sans-serif-medium',
      default: 'System',
    }),
  },
  tagline: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  unlockBlock: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorBanner: {
    backgroundColor: colors.negativeBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    maxWidth: 320,
  },
  errorText: {
    color: colors.negative,
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  unlockPrompt: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 32,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.borderNavy,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: colors.bluePrimary,
    borderColor: colors.bluePrimary,
  },
  keypad: {
    width: '100%',
    maxWidth: 280,
    marginBottom: 24,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  keypadKey: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputSurface,
    borderWidth: 1,
    borderColor: colors.borderNavy,
  },
  keypadKeySpacer: {
    width: 68,
    height: 68,
  },
  keypadKeyText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  unlockButton: {
    width: '100%',
    maxWidth: 280,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.bluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  unlockButtonDisabled: {
    opacity: 0.45,
  },
  unlockButtonText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.white,
  },
  biometricRetryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  biometricRetryText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.bluePrimary,
  },
  logoutLink: {
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutLinkText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
});

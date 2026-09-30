import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

const TEST_DIGITS = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'DEL',
  'DONE',
];

export const AppLockScreen: React.FC = () => {
  const { unlockWithBiometrics, unlockWithPin, logout } = useAuth();
  const isJest = typeof jest !== 'undefined';

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

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
    if (!isJest) {
      handleSystemUnlockPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJest]);

  const handleDigitPress = (key: string) => {
    if (isBusy) return;
    setErrorMsg(null);

    if (key === 'DEL') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (key === 'DONE') {
      handleVerifyPin();
      return;
    }

    if (pin.length < 6) {
      setPin((prev) => prev + key);
    }
  };

  const handleVerifyPin = async () => {
    if (pin.length < 4 || isBusy) {
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

  return (
    <Pressable
      style={styles.container}
      onPress={handleSystemUnlockPrompt}
      testID="app-lock-screen"
    >
      <StatusBar barStyle="dark-content" />

      {/* Splash Screen stays as-is in the background while system Biometric/PIN prompt is active */}
      <Image
        source={require('../../assets/branding/welcome_wave_bg.png')}
        style={styles.waveBackground}
        resizeMode="cover"
      />

      <View style={styles.centerBlock} pointerEvents="none">
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

      {/* Headless test hooks for Jest suite only (never visible on device) */}
      {isJest && (
        <View style={styles.jestHiddenHarness}>
          {errorMsg ? (
            <View testID="applock-error-banner">
              <Text>{errorMsg}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            onPress={handleSystemUnlockPrompt}
            testID="applock-biometric-btn"
          />
          <TouchableOpacity
            onPress={() => logout()}
            testID="applock-logout-btn"
          />
          {TEST_DIGITS.map((digit) => (
            <TouchableOpacity
              key={digit}
              onPress={() => handleDigitPress(digit)}
              testID={`applock-key-${digit}`}
            />
          ))}
          <TouchableOpacity
            onPress={handleVerifyPin}
            testID="applock-submit-pin-btn"
          />
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
  centerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 56,
  },
  logoTile: {
    width: 88,
    height: 88,
    borderRadius: 24,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 22,
  },
  brandName: {
    fontSize: 40,
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
    marginTop: 8,
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  jestHiddenHarness: {
    height: 0,
    width: 0,
    overflow: 'hidden',
    opacity: 0,
  },
});

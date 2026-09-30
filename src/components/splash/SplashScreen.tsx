import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';

interface SplashScreenProps {
  isReady?: boolean;
  onFinish?: () => void;
  durationMs?: number;
  skipFadeOut?: boolean;
  testID?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isReady = true,
  onFinish,
  durationMs = 1500,
  skipFadeOut = false,
  testID = 'artha-splash-screen',
}) => {
  const [minDurationDone, setMinDurationDone] = useState(false);
  const isExitingRef = useRef(false);

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.94)).current;

  const triggerExit = useCallback(() => {
    if (isExitingRef.current || !onFinish) {
      return;
    }
    isExitingRef.current = true;

    if (skipFadeOut) {
      onFinish();
      return;
    }

    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      onFinish();
    });
  }, [containerOpacity, onFinish, skipFadeOut]);

  useEffect(() => {
    // Subtle fade-in & gentle scale-up on mount
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: 1,
        damping: 20,
        stiffness: 140,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      setMinDurationDone(true);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [contentOpacity, contentScale, durationMs]);

  useEffect(() => {
    if (minDurationDone && isReady) {
      triggerExit();
    }
  }, [minDurationDone, isReady, triggerExit]);

  return (
    <Animated.View
      style={[styles.container, { opacity: containerOpacity }]}
      testID={testID}
    >
      <StatusBar barStyle="dark-content" />

      <Image
        source={require('../../assets/branding/welcome_wave_bg.png')}
        style={styles.waveBackground}
        resizeMode="cover"
      />

      <TouchableOpacity
        activeOpacity={1}
        style={styles.touchArea}
        onPress={() => {
          if (isReady) {
            triggerExit();
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Artha Splash Screen"
      >
        <Animated.View
          style={[
            styles.centerBlock,
            {
              opacity: contentOpacity,
              transform: [{ scale: contentScale }],
            },
          ]}
        >
          <View style={styles.logoTile}>
            <Image
              source={require('../../assets/branding/artha_icon_dark.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.brandName} accessibilityRole="header">
            Artha
          </Text>

          <Text style={styles.tagline}>Know. Spend. Grow.</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 99999,
    elevation: 999,
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
  touchArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
});

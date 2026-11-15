import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Logo } from '../common/Logo';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Palette } from '../../theme/colors';

export interface SplashScreenProps {
  logoSize?: number;
  showRings?: boolean;
  animated?: boolean;
  /** When true (e.g. unauthenticated welcome), renders "Get Started" and "Log in" */
  showActions?: boolean;
  onGetStarted?: () => void;
  onLogin?: () => void;
  /** When true, renders the subtle one-way progress bar and trust text */
  showFooterLoader?: boolean;
  loaderDurationMs?: number;
  onLoaderComplete?: () => void;
  /** Callback when splash finishes (e.g. on launch) */
  onFinish?: () => void;
  durationMs?: number;
  skipFadeOut?: boolean;
  testID?: string;
}

/**
 * Unified Artha Splash & Welcome Screen Component
 *
 * Implements the single canonical brand screen matching the exact design specification:
 * - Off-white background (#F7F5FB)
 * - Concentric background rings (280px & 420px, 1px solid rgba(8, 72, 135, 0.06))
 * - Dead-centered Ascending Arrow 'A' logo mark
 * - Bold 'Artha' title ('Arth' in #031D44, 'a' in #F58A07)
 * - Animated tagline: '— Know. Spend. Grow. —' with smile curve under 'Grow.'
 * - Bottom actions: Navy pill 'Get Started' button + 'Already have an account? Log in'
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({
  logoSize = 155,
  showRings = true,
  animated = true,
  showActions = false,
  onGetStarted,
  onLogin,
  showFooterLoader = false,
  loaderDurationMs = 1500,
  onLoaderComplete,
  onFinish,
  durationMs = 1500,
  skipFadeOut = false,
  testID = 'artha-splash-screen',
}) => {
  const { isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const safeAreaInsets = React.useContext(SafeAreaInsetsContext);
  const insets = safeAreaInsets ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const auth = React.useContext(AuthContext);
  const user = auth?.user;
  const status = auth?.status;
  const unlockWithBiometrics = auth?.unlockWithBiometrics;
  const isExitingRef = useRef(false);
  const containerOpacity = useRef(new Animated.Value(1)).current;

  const isJest =
    typeof jest !== 'undefined' ||
    Boolean((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.JEST_WORKER_ID) ||
    Boolean((globalThis as Record<string, unknown>).jest);

  // Sequential word animations: Know. -> Spend. -> Grow. -> smile curve
  const word1Anim = useRef(new Animated.Value(isJest || !animated ? 1 : 0)).current;
  const word2Anim = useRef(new Animated.Value(isJest || !animated ? 1 : 0)).current;
  const word3Anim = useRef(new Animated.Value(isJest || !animated ? 1 : 0)).current;
  const curveAnim = useRef(new Animated.Value(isJest || !animated ? 1 : 0)).current;

  // Single one-way loader fill animation (0 to 120px)
  const loaderProgress = useRef(new Animated.Value(isJest ? 1 : 0)).current;

  const triggerExit = useCallback(() => {
    if (isExitingRef.current) return;
    const exitCallback = onLoaderComplete || onFinish;
    if (!exitCallback) return;

    isExitingRef.current = true;

    if (skipFadeOut || isJest) {
      exitCallback();
      return;
    }

    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      exitCallback();
    });
  }, [containerOpacity, onLoaderComplete, onFinish, skipFadeOut, isJest]);

  // Play wordmark & tagline sequential animation
  useEffect(() => {
    if (isJest || !animated) return;

    Animated.sequence([
      Animated.delay(300),
      Animated.timing(word1Anim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(100),
      Animated.timing(word2Anim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(100),
      Animated.timing(word3Anim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(50),
      Animated.timing(curveAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [animated, isJest, word1Anim, word2Anim, word3Anim, curveAnim]);

  // Biometric authentication during splash screen:
  // If user is logged in & biometric is enabled, trigger biometric right on the splash screen
  useEffect(() => {
    if (isJest || showActions) return;
    const biometricEnabled = Boolean(user?.securityPreferences?.biometricEnabled);

    if (status === 'locked' && biometricEnabled && unlockWithBiometrics) {
      unlockWithBiometrics().then((res) => {
        if (res.success) {
          triggerExit();
        }
      });
    }
  }, [isJest, showActions, user?.securityPreferences?.biometricEnabled, status, unlockWithBiometrics, triggerExit]);

  // Loader progress animation (if showFooterLoader is true)
  useEffect(() => {
    if (!showFooterLoader || showActions) return;

    if (isJest) {
      triggerExit();
      return;
    }

    Animated.timing(loaderProgress, {
      toValue: 1,
      duration: loaderDurationMs,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        triggerExit();
      }
    });
  }, [isJest, showFooterLoader, showActions, loaderDurationMs, loaderProgress, triggerExit]);

  // Auto exit timer if onFinish is provided without actions
  useEffect(() => {
    if (showActions || !onFinish) return;

    const timer = setTimeout(() => {
      triggerExit();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [showActions, onFinish, durationMs, triggerExit]);

  const loaderFillWidth = loaderProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  return (
    <Animated.View
      style={[styles.container, { opacity: containerOpacity }]}
      testID={testID}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Main Center Area: Logo, Concentric Rings, Wordmark, and Tagline */}
      <View style={styles.centerSection}>
        {/* Subtle Decorative Concentric Background Rings */}
        {showRings && (
          <View style={styles.ringsContainer} pointerEvents="none">
            <View style={[styles.bgCircle, styles.circleOuter]} />
            <View style={[styles.bgCircle, styles.circleInner]} />
          </View>
        )}

        {/* ASCENDING ARROW 'A' LOGO */}
        <View style={styles.logoSvg}>
          <Logo size={logoSize} variant={isDark ? 'white' : 'navy'} animated={animated} />
        </View>

        {/* Brand Title: Arth in navy (#031D44), a in orange (#F58A07) */}
        <View style={styles.brandTitle} accessibilityRole="header" accessibilityLabel="Artha">
          <Text style={styles.hiddenAccessibleText}>Artha</Text>
          <Text style={styles.brandTitleText}>
            Arth<Text style={styles.accent}>a</Text>
          </Text>
        </View>

        {/* Tagline: — Know. Spend. Grow. — */}
        <View style={styles.tagline}>
          <Text style={styles.hiddenAccessibleText}>Know. Spend. Grow.</Text>

          {/* Left orange dash */}
          <View style={styles.dash} />

          {/* Word 1: Know. */}
          <Animated.View
            style={{
              opacity: word1Anim,
              transform: [
                {
                  translateY: word1Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 0],
                  }),
                },
              ],
            }}
          >
            <Text style={styles.taglineWord}>Know.</Text>
          </Animated.View>

          {/* Word 2: Spend. */}
          <Animated.View
            style={{
              opacity: word2Anim,
              transform: [
                {
                  translateY: word2Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 0],
                  }),
                },
              ],
            }}
          >
            <Text style={styles.taglineWord}>Spend.</Text>
          </Animated.View>

          {/* Word 3: Grow. + smile curve */}
          <Animated.View
            style={[
              styles.wordSlotGrow,
              {
                opacity: word3Anim,
                transform: [
                  {
                    translateY: word3Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.taglineWord}>Grow.</Text>
            <Animated.View
              style={[
                styles.growCurve,
                {
                  opacity: curveAnim,
                },
              ]}
            >
              <Svg width={42} height={8} viewBox="0 0 50 12">
                <Path
                  d="M 2 9 Q 25 1 48 9"
                  fill="none"
                  stroke="#F58A07"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              </Svg>
            </Animated.View>
          </Animated.View>

          {/* Right orange dash */}
          <View style={styles.dash} />
        </View>
      </View>

      {/* Bottom Actions: Get Started & Log In */}
      {showActions ? (
        <View
          style={[
            styles.bottomActions,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onGetStarted}
            activeOpacity={0.85}
            testID="welcome-get-started-btn"
            accessibilityRole="button"
            accessibilityLabel="Get Started"
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={onLogin}
            activeOpacity={0.7}
            testID="welcome-signin-btn"
            accessibilityRole="button"
            accessibilityLabel="Already have an account? Log in"
          >
            <Text style={styles.loginPromptText}>
              Already have an account?{' '}
              <Text style={styles.loginActionText}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      ) : showFooterLoader ? (
        <View
          style={[
            styles.footerLoader,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          <View style={styles.loaderTrack}>
            <Animated.View
              style={[
                styles.loaderFill,
                {
                  width: loaderFillWidth,
                },
              ]}
            >
              <Svg width="100%" height="100%" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="loaderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#F58A07" />
                    <Stop offset="100%" stopColor="#F9AB55" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#loaderGrad)" rx={2} ry={2} />
              </Svg>
            </Animated.View>
          </View>
          <Text style={styles.trustText}>Smart Personal Finance</Text>
        </View>
      ) : null}
    </Animated.View>
  );
};

// Aliases for clean backward compatibility
export const BrandSplashLockup = SplashScreen;
export type BrandSplashLockupProps = SplashScreenProps;

const makeStyles = (c: Palette, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: isDark ? '#000000' : '#F7F5FB',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    centerSection: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      zIndex: 2,
    },
    ringsContainer: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      width: 420,
      height: 420,
      top: '50%',
      left: '50%',
      marginLeft: -210,
      marginTop: -210,
      zIndex: 1,
    },
    bgCircle: {
      position: 'absolute',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245, 138, 7, 0.09)' : 'rgba(8, 72, 135, 0.06)',
    },
    circleInner: {
      width: 280,
      height: 280,
    },
    circleOuter: {
      width: 420,
      height: 420,
    },
    logoSvg: {
      width: 155,
      height: 155,
      marginBottom: 10,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    brandTitle: {
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    brandTitleText: {
      fontSize: 46,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#031D44',
      letterSpacing: -1,
      lineHeight: 52,
      fontFamily: Platform.select({
        ios: 'Plus Jakarta Sans',
        android: 'sans-serif-medium',
        default: 'System',
      }),
    },
    accent: {
      color: c.accent,
    },
    hiddenAccessibleText: {
      position: 'absolute',
      opacity: 0,
      height: 0,
      width: 0,
    },
    tagline: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      position: 'relative',
      zIndex: 2,
    },
    dash: {
      width: 16,
      height: 2.5,
      backgroundColor: c.accent,
      borderRadius: 2,
    },
    taglineWord: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#F9AB55' : '#084887',
      letterSpacing: 2.2,
      fontFamily: Platform.select({
        ios: 'Plus Jakarta Sans',
        android: 'sans-serif-medium',
        default: 'System',
      }),
    },
    wordSlotGrow: {
      position: 'relative',
    },
    growCurve: {
      position: 'absolute',
      bottom: -8,
      left: 5,
      width: 42,
      height: 8,
    },
    bottomActions: {
      width: '100%',
      paddingHorizontal: 24,
      paddingTop: 8,
      alignItems: 'center',
      zIndex: 3,
    },
    primaryButton: {
      width: '100%',
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
    primaryButtonText: {
      color: isDark ? c.onAccent : '#FFFFFF',
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    loginLink: {
      marginTop: 16,
      paddingVertical: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loginPromptText: {
      fontSize: 14,
      color: isDark ? c.textSecondary : '#031D44',
      opacity: 0.8,
    },
    loginActionText: {
      fontWeight: '700',
      color: isDark ? c.accent : '#084887',
    },
    footerLoader: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      zIndex: 2,
    },
    loaderTrack: {
      width: 120,
      height: 4,
      borderRadius: 4,
      backgroundColor: isDark ? 'rgba(245, 138, 7, 0.18)' : 'rgba(8, 72, 135, 0.15)',
      overflow: 'hidden',
    },
    loaderFill: {
      height: '100%',
      borderRadius: 4,
      overflow: 'hidden',
    },
    trustText: {
      fontSize: 11,
      fontWeight: '500',
      color: isDark ? '#F9AB55' : '#031D44',
      opacity: isDark ? 0.75 : 0.65,
      letterSpacing: 0.5,
      fontFamily: Platform.select({
        ios: 'Plus Jakarta Sans',
        android: 'sans-serif-medium',
        default: 'System',
      }),
    },
  });

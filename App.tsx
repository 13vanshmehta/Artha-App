import React, { useState, useRef, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
  Platform,
  Animated,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { colors } from './src/theme/colors';
import { mockExpenses, ExpenseItem } from './src/data/mockData';
import { BottomTabBar, TabKey } from './src/components/navigation/BottomTabBar';
import { HomeScreen } from './src/screens/HomeScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { SplashScreen } from './src/components/splash/SplashScreen';
import { ToastHost } from './src/components/common/ToastHost';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ToastProvider, toast } from './src/context/ToastContext';
import { AuthFlowNavigator } from './src/screens/auth/AuthFlowNavigator';
import { AppLockScreen } from './src/screens/auth/AppLockScreen';

function AppContent() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { status, isOfflineBannerVisible } = useAuth();

  const [showSplash, setShowSplash] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabKey>('Home');
  const [expenses, setExpenses] = useState<ExpenseItem[]>(mockExpenses);
  const [isScrolling, setIsScrolling] = useState(false);

  // Synchronized screen slide animation matching bottom nav physics
  const screenTranslateX = useRef(
    new Animated.Value(currentTab === 'Account' ? -screenWidth : 0),
  ).current;

  useEffect(() => {
    Animated.spring(screenTranslateX, {
      toValue: currentTab === 'Account' ? -screenWidth : 0,
      damping: 24,
      stiffness: 185,
      mass: 0.85,
      useNativeDriver: true,
    }).start();
  }, [currentTab, screenWidth, screenTranslateX]);

  // Subtle opacity depth fade during transition
  const homeOpacity = screenTranslateX.interpolate({
    inputRange: [-screenWidth, 0],
    outputRange: [0.75, 1],
    extrapolate: 'clamp',
  });

  const accountOpacity = screenTranslateX.interpolate({
    inputRange: [-screenWidth, 0],
    outputRange: [1, 0.75],
    extrapolate: 'clamp',
  });

  const handleSelectTab = (tab: TabKey) => {
    if (tab === currentTab) return;
    setIsScrolling(false);
    setCurrentTab(tab);
  };

  const handleReplaySplash = () => {
    setShowSplash(true);
  };

  const handleAddExpense = (newExpense: Omit<ExpenseItem, 'id'>) => {
    const item: ExpenseItem = {
      ...newExpense,
      id: `exp-${Date.now()}`,
    };
    setExpenses((prev) => [item, ...prev]);
    toast.success(
      `Added ₹${newExpense.amount} for ${newExpense.merchant}.`,
      'Expense Added',
    );
  };

  const prevStatusRef = useRef(status);
  const bodyFadeAnim = useRef(new Animated.Value(1)).current;
  const bodySlideX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prev === status || prev === 'initializing' || showSplash) {
      return;
    }

    const slideFrom = status === 'authenticated' ? 38 : -32;
    bodyFadeAnim.setValue(0.25);
    bodySlideX.setValue(slideFrom);
    Animated.parallel([
      Animated.timing(bodyFadeAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(bodySlideX, {
        toValue: 0,
        damping: 22,
        stiffness: 185,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [bodyFadeAnim, bodySlideX, showSplash, status]);

  const renderMainBody = () => {
    if (status === 'initializing') {
      return <View style={styles.initializingPlaceholder} testID="session-restoring-view" />;
    }

    if (status === 'unauthenticated' || status === 'pending_verification') {
      return (
        <Animated.View
          style={[
            styles.screenPage,
            {
              opacity: bodyFadeAnim,
              transform: [{ translateX: bodySlideX }],
            },
          ]}
        >
          <AuthFlowNavigator
            initialStep={
              status === 'pending_verification' ? 'verify_otp' : 'welcome'
            }
            isSplashActive={showSplash}
          />
        </Animated.View>
      );
    }

    if (status === 'locked') {
      return <AppLockScreen />;
    }

    return (
      <Animated.View
        style={[
          styles.screenPage,
          {
            opacity: bodyFadeAnim,
            transform: [{ translateX: bodySlideX }],
          },
        ]}
      >
        {isOfflineBannerVisible && (
          <View style={styles.offlineBanner} testID="offline-mode-banner">
            <Text style={styles.offlineBannerText}>
              Offline Mode • Viewing cached Keychain session
            </Text>
          </View>
        )}

        {/* Screen Body with Synchronized Horizontal Motion */}
        <View style={styles.screenWrapper}>
          <Animated.View
            style={[
              styles.screensTrack,
              {
                width: screenWidth * 2,
                transform: [{ translateX: screenTranslateX }],
              },
            ]}
          >
            {/* Home Screen Page */}
            <Animated.View
              style={[
                styles.screenPage,
                {
                  width: screenWidth,
                  opacity: homeOpacity,
                },
              ]}
              pointerEvents={currentTab === 'Home' ? 'auto' : 'none'}
            >
              <HomeScreen
                expenses={expenses}
                onOpenAddExpense={() =>
                  handleAddExpense({
                    merchant: 'New Expense',
                    amount: 450,
                    category: 'Shopping',
                    paymentMethod: 'UPI',
                    timeStr: 'Just now',
                    dateStr: 'Today',
                    dateGroup: 'Today',
                    type: 'expense',
                  })
                }
                onReplaySplash={handleReplaySplash}
                onScrollingChange={setIsScrolling}
              />
            </Animated.View>

            {/* Account Screen Page */}
            <Animated.View
              style={[
                styles.screenPage,
                {
                  width: screenWidth,
                  opacity: accountOpacity,
                },
              ]}
              pointerEvents={currentTab === 'Account' ? 'auto' : 'none'}
            >
              <AccountScreen onScrollingChange={setIsScrolling} />
            </Animated.View>
          </Animated.View>
        </View>

        {/* Floating Bottom Navigation Bar (Auto-hides on scroll) */}
        <BottomTabBar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          isScrolling={isScrolling}
        />
      </Animated.View>
    );
  };

  return (
    <View
      style={[
        styles.rootContainer,
        status === 'authenticated' && {
          paddingTop:
            Platform.OS === 'ios'
              ? insets.top
              : Math.max(insets.top, StatusBar.currentHeight ?? 28) + 6,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" />

      {renderMainBody()}

      {/* Global Toast Notification Host */}
      <ToastHost />

      {/* Launch & Replay Splash Screen */}
      {(showSplash || status === 'initializing') && (
        <SplashScreen
          isReady={status !== 'initializing'}
          skipFadeOut={status === 'unauthenticated' || status === 'locked'}
          onFinish={() => setShowSplash(false)}
          durationMs={1500}
        />
      )}
    </View>
  );
}

const FALLBACK_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function App() {
  return (
    <SafeAreaProvider
      initialMetrics={initialWindowMetrics ?? FALLBACK_SAFE_AREA_METRICS}
    >
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  initializingPlaceholder: {
    flex: 1,
    backgroundColor: colors.background,
  },
  offlineBanner: {
    backgroundColor: colors.warningBg,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: colors.warning,
    fontSize: 11.5,
    fontWeight: '700',
  },
  screenWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  screensTrack: {
    flex: 1,
    flexDirection: 'row',
  },
  screenPage: {
    flex: 1,
    height: '100%',
  },
});

export default App;

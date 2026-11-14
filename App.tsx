import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
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
import { BottomTabBar, TabKey } from './src/components/navigation/BottomTabBar';
import { HomeScreen } from './src/screens/HomeScreen';
import { TrackerScreen } from './src/screens/TrackerScreen';
import { GroupsScreen } from './src/screens/GroupsScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { SplashScreen } from './src/components/splash/SplashScreen';
import { ToastHost } from './src/components/common/ToastHost';
import { AlertHost } from './src/components/common/AlertHost';
import { ToastProvider, toast } from './src/context/ToastContext';
import { AlertProvider } from './src/context/AlertContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AuthFlowNavigator } from './src/screens/auth/AuthFlowNavigator';
import { AppLockScreen } from './src/screens/auth/AppLockScreen';
import { BiometricOnboardingScreen } from './src/screens/auth/BiometricOnboardingScreen';
import { TransactionModal } from './src/components/finance/TransactionModal';
import { mockTransactions, MockTransaction } from './src/mock';

const TAB_ORDER: TabKey[] = ['Home', 'PE Tracker', 'Groups', 'Account'];

function AppContent() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { status, user } = useAuth();

  const [showSplash, setShowSplash] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabKey>('Home');
  const [isScrolling, setIsScrolling] = useState(false);
  const [expenses, setExpenses] = useState<MockTransaction[]>(mockTransactions);

  // Native horizontal scroll driver for 120 FPS buttery-smooth page sliding
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);

  // Continuous, JS-driven page position (e.g. 1.35 = 35% of the way from tab
  // index 1 to tab index 2). scrollX itself is updated natively (useNativeDriver:
  // true) for 120fps page sliding, but native-driven values can't drive layout/
  // color props (width, backgroundColor) — those require the JS thread. This
  // value is kept in sync with scrollX on every scroll tick below so the tab
  // bar can interpolate its pill position live, in real time with the finger.
  const scrollProgress = useRef(new Animated.Value(0)).current;

  // Ref mirror of currentTab to avoid stale closure inside the scrollX listener
  const currentTabRef = useRef<TabKey>('Home');

  // Real-time swipe sync: mirror the native scroll position into scrollProgress
  // every tick (driving the live tab-bar pill), and flip the discrete currentTab
  // as soon as the scroll crosses each page's midpoint (driving icon/label state).
  useEffect(() => {
    const listenerId = scrollX.addListener(({ value }) => {
      if (!windowWidth) return;
      const rawIndex = value / windowWidth;
      scrollProgress.setValue(
        Math.min(Math.max(rawIndex, 0), TAB_ORDER.length - 1),
      );

      // Snap to the nearest page index as soon as the scroll crosses the midpoint
      const idx = Math.min(
        Math.max(Math.round(rawIndex), 0),
        TAB_ORDER.length - 1,
      );
      const tab = TAB_ORDER[idx];
      if (tab && tab !== currentTabRef.current) {
        currentTabRef.current = tab;
        setCurrentTab(tab);
      }
    });

    return () => {
      scrollX.removeListener(listenerId);
    };
  }, [scrollX, scrollProgress, windowWidth]);

  // Synchronize bottom tab tap with smooth native scroll
  const handleSelectTab = useCallback(
    (tab: TabKey) => {
      setIsScrolling(false);
      setCurrentTab(tab);
      currentTabRef.current = tab;
      const targetIndex = TAB_ORDER.indexOf(tab);
      if (targetIndex !== -1) {
        scrollViewRef.current?.scrollTo({
          x: targetIndex * windowWidth,
          animated: true,
        });
      }
    },
    [windowWidth],
  );

  // Transaction Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<'expense' | 'income'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<MockTransaction | null>(null);

  const handleReplaySplash = () => {
    setShowSplash(true);
  };

  const handleOpenAdd = (type: 'expense' | 'income' = 'expense') => {
    setEditingTransaction(null);
    setModalDefaultType(type);
    setModalVisible(true);
  };

  const handleOpenEdit = (item: MockTransaction) => {
    setEditingTransaction(item);
    setModalDefaultType(item.type || 'expense');
    setModalVisible(true);
  };

  const handleSaveTransaction = (
    data: {
      title: string;
      merchant: string;
      category: string;
      amount: number;
      type: 'expense' | 'income';
      paymentMethod: string;
      notes?: string;
      incurredAt?: string;
    },
    existingId?: string,
  ) => {
    if (existingId) {
      setExpenses((prev) =>
        prev.map((item) =>
          item.id === existingId
            ? {
                ...item,
                merchant: data.merchant,
                category: data.category,
                amount: data.amount,
                type: data.type,
                paymentMethod: data.paymentMethod,
                notes: data.notes,
              }
            : item,
        ),
      );
      toast.success(
        `Updated ₹${data.amount} for ${data.merchant}.`,
        'Transaction Saved',
      );
    } else {
      const created: MockTransaction = {
        id: `tx_${Date.now()}`,
        merchant: data.merchant,
        category: data.category,
        amount: data.amount,
        type: data.type,
        dateStr: 'Today',
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateGroup: 'Today',
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      };
      setExpenses((prev) => [created, ...prev]);
      toast.success(
        `Added ₹${created.amount} for ${created.merchant}.`,
        data.type === 'income' ? 'Income Logged' : 'Expense Logged',
      );
    }
    setModalVisible(false);
  };

  const handleDeleteTransaction = (id: string) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
    toast.info('Transaction removed.', 'Deleted');
  };

  // 1. Unauthenticated or verifying email -> Show Auth Flow Navigator
  if (status === 'unauthenticated' || status === 'pending_verification') {
    return (
      <View style={styles.rootContainer}>
        <StatusBar barStyle="dark-content" />
        <AuthFlowNavigator isSplashActive={showSplash} />
        <ToastHost />
        <AlertHost />
        {showSplash && (
          <SplashScreen
            isReady={status !== 'initializing'}
            skipFadeOut={true}
            onFinish={() => setShowSplash(false)}
            durationMs={1500}
          />
        )}
      </View>
    );
  }

  // 2. Locked -> Biometric or PIN Unlock Screen
  if (status === 'locked') {
    return (
      <View style={styles.rootContainer}>
        <StatusBar barStyle="dark-content" />
        <AppLockScreen />
        <ToastHost />
        <AlertHost />
        {showSplash && (
          <SplashScreen
            isReady={status !== 'initializing'}
            skipFadeOut={true}
            onFinish={() => setShowSplash(false)}
            durationMs={1500}
          />
        )}
      </View>
    );
  }

  // 3. First-time Biometric Onboarding
  if (status === 'onboarding_biometrics') {
    return (
      <View style={styles.rootContainer}>
        <StatusBar barStyle="dark-content" />
        <BiometricOnboardingScreen />
        <ToastHost />
        <AlertHost />
        {showSplash && (
          <SplashScreen
            isReady={true}
            onFinish={() => setShowSplash(false)}
            durationMs={1500}
          />
        )}
      </View>
    );
  }

  // 4. Authenticated -> Primary 4-Tab Experience
  return (
    <View
      style={[
        styles.rootContainer,
        {
          paddingTop:
            Platform.OS === 'ios'
              ? insets.top
              : Math.max(insets.top, StatusBar.currentHeight ?? 28) + 6,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" />

      {/* 4 Primary Navigation Sections (Native Hardware-Accelerated Paging ScrollView) */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        onMomentumScrollEnd={(e) => {
          // Fallback: ensure currentTab is correct after the gesture fully settles
          const pageIndex = Math.min(
            Math.max(Math.round(e.nativeEvent.contentOffset.x / windowWidth), 0),
            TAB_ORDER.length - 1,
          );
          const tab = TAB_ORDER[pageIndex];
          if (tab && tab !== currentTabRef.current) {
            currentTabRef.current = tab;
            setCurrentTab(tab);
          }
        }}
        style={{ flex: 1, width: windowWidth }}
        contentContainerStyle={{ width: windowWidth * 4 }}
      >
        {/* 1. Home Dashboard */}
        <View style={{ width: windowWidth, height: '100%' }}>
          <HomeScreen
            userName={user?.displayName || 'User'}
            expenses={expenses}
            onReplaySplash={handleReplaySplash}
            onScrollingChange={setIsScrolling}
            onNavigateToTab={handleSelectTab}
            onOpenAddTransaction={handleOpenAdd}
          />
        </View>

        {/* 2. PE Tracker */}
        <View style={{ width: windowWidth, height: '100%' }}>
          <TrackerScreen
            expenses={expenses}
            onScrollingChange={setIsScrolling}
            onOpenAddTransaction={handleOpenAdd}
            onEditTransaction={handleOpenEdit}
            onDeleteTransaction={handleDeleteTransaction}
          />
        </View>

        {/* 3. Groups (Bill Splitting) */}
        <View style={{ width: windowWidth, height: '100%' }}>
          <GroupsScreen onScrollingChange={setIsScrolling} />
        </View>

        {/* 4. Account Screen */}
        <View style={{ width: windowWidth, height: '100%' }}>
          <AccountScreen onScrollingChange={setIsScrolling} />
        </View>
      </Animated.ScrollView>

      {/* Floating 4-Tab Bottom Navigation Bar — Active tab expands with page name label */}
      <BottomTabBar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isScrolling={isScrolling}
        scrollProgress={scrollProgress}
        pageWidth={windowWidth}
        userAvatarUrl={user?.photoUrl}
        userName={user?.displayName}
      />

      {/* Global Add & Edit Transaction Bottom Sheet Modal */}
      <TransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        initialData={editingTransaction}
        defaultType={modalDefaultType}
      />

      {/* Global Toast Notification Host */}
      <ToastHost />

      {/* Global In-App Confirmation Alert Host */}
      <AlertHost />

      {/* Launch & Replay Splash Screen */}
      {showSplash && (
        <SplashScreen
          isReady={status !== 'initializing'}
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
      <AlertProvider>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </AlertProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F2F3F7',
  },
  navPagesTrack: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
});

export default App;

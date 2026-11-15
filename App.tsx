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
import { ToastHost } from './src/components/common/ToastHost';
import { AlertHost } from './src/components/common/AlertHost';
import { ToastProvider, toast } from './src/context/ToastContext';
import { AlertProvider } from './src/context/AlertContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthFlowNavigator } from './src/screens/auth/AuthFlowNavigator';
import { AppLockScreen } from './src/screens/auth/AppLockScreen';
import { BiometricOnboardingScreen } from './src/screens/auth/BiometricOnboardingScreen';
import { SplashScreen } from './src/components/splash/SplashScreen';
import { TransactionModal } from './src/components/finance/TransactionModal';
import {
  CreateTransactionDto,
  Transaction,
  TransactionType,
  UpdateTransactionDto,
} from './src/api/types';
import { transactionsApi } from './src/api/transactions';
import { queryClient } from './src/state/queryClient';
import { notificationService } from './src/services/notificationService';
import { formatPaise } from './src/utils/money';

const TAB_ORDER: TabKey[] = ['Home', 'PE Tracker', 'Groups', 'Account'];

function AppContent() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { status, user } = useAuth();
  const { isDark } = useTheme();

  // Default launch screen: brand lockup only, no buttons. Shown until the
  // local auth check resolves and its own minimum duration has elapsed.
  const [showSplash, setShowSplash] = useState(true);

  const [currentTab, setCurrentTab] = useState<TabKey>('Home');
  const [isScrolling, setIsScrolling] = useState(false);

  // Horizontal scroll driver
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);

  // Continuous, JS-driven page position (e.g. 1.35 = 35% of the way from tab
  // index 1 to tab index 2) driving the tab bar pill and label expansion live with the finger.
  const scrollProgress = useRef(new Animated.Value(0)).current;

  // Ref mirror of currentTab to avoid stale closures
  const currentTabRef = useRef<TabKey>('Home');

  // Tracks if scroll was triggered programmatically (via bottom tab tap)
  const isProgrammaticScrollRef = useRef(false);

  // Status and user tracker to cleanly detect login/logout/user transitions
  const prevStatusRef = useRef<string>(status);
  const prevUserIdRef = useRef<string | null | undefined>(user?.id);

  // Synchronize state on authentication / logout / user switch:
  // Reset tab and scroll positions so upon login or logout the app is ALWAYS cleanly on Home.
  useEffect(() => {
    const statusChanged = prevStatusRef.current !== status;
    const isNewUser = prevUserIdRef.current !== user?.id;
    prevStatusRef.current = status;
    prevUserIdRef.current = user?.id;

    if (statusChanged || isNewUser) {
      // Whenever leaving or entering authenticated state, reset to Home tab and clear sensitive server state cache
      if (status !== 'authenticated') {
        queryClient.clear();
      }
      setCurrentTab('Home');
      currentTabRef.current = 'Home';
      isProgrammaticScrollRef.current = false;
      scrollX.setValue(0);
      scrollProgress.setValue(0);

      if (status === 'authenticated') {
        requestAnimationFrame(() => {
          scrollViewRef.current?.scrollTo({ x: 0, animated: false });
        });
      }
    }
  }, [status, user?.id, scrollX, scrollProgress]);

  // Real-time synchronization from scroll offset to tab index & progress
  const syncScrollState = useCallback(
    (offsetX: number) => {
      if (windowWidth <= 0) return;
      const rawIndex = offsetX / windowWidth;
      const clampedIndex = Math.min(
        Math.max(rawIndex, 0),
        TAB_ORDER.length - 1,
      );
      // Continuous position driving live tab-bar pill translation & label expansion
      scrollProgress.setValue(clampedIndex);

      // Discrete page index driving icon active state as scroll passes midpoint
      if (!isProgrammaticScrollRef.current) {
        const targetIdx = Math.min(
          Math.max(Math.round(rawIndex), 0),
          TAB_ORDER.length - 1,
        );
        const targetTab = TAB_ORDER[targetIdx];
        if (targetTab && targetTab !== currentTabRef.current) {
          currentTabRef.current = targetTab;
          setCurrentTab(targetTab);
        }
      }
    },
    [windowWidth, scrollProgress],
  );

  // Live scroll listener for buttery-smooth 60/120 FPS swipe sync
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e: any) => {
        const offsetX = e?.nativeEvent?.contentOffset?.x;
        if (typeof offsetX === 'number') {
          syncScrollState(offsetX);
        }
      },
    },
  );

  // Synchronize bottom tab tap with smooth native scroll
  const handleSelectTab = useCallback(
    (tab: TabKey) => {
      setIsScrolling(false);
      setCurrentTab(tab);
      currentTabRef.current = tab;
      const targetIndex = TAB_ORDER.indexOf(tab);
      if (targetIndex !== -1) {
        isProgrammaticScrollRef.current = true;
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
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleOpenAdd = (type: TransactionType = TransactionType.EXPENSE) => {
    setEditingTransaction(null);
    setModalDefaultType(type);
    setModalVisible(true);
  };

  const handleOpenEdit = (item: Transaction) => {
    setEditingTransaction(item);
    setModalDefaultType(item.type || TransactionType.EXPENSE);
    setModalVisible(true);
  };

  const handleDuplicateTransaction = (item: Transaction) => {
    // Pre-fill fields but strip ID and idempotency key so it records as a brand new transaction
    setEditingTransaction({
      ...item,
      id: '',
      clientTransactionId: undefined,
    } as any);
    setModalDefaultType(item.type || TransactionType.EXPENSE);
    setModalVisible(true);
    toast.info('Review and save duplicate transaction.', 'Duplicate Ready');
  };

  const handleSaveTransaction = async (
    data: CreateTransactionDto | UpdateTransactionDto,
    existingId?: string,
  ) => {
    try {
      if (existingId) {
        const updated = await transactionsApi.updateTransaction(
          existingId,
          data as UpdateTransactionDto,
        );
        queryClient.invalidateQueries(['transactions']);
        queryClient.invalidateQueries(['home']);
        const displayAmt = formatPaise(updated.amount);
        const label = updated.merchant || updated.category || 'Transaction';
        toast.success(
          `Updated ${displayAmt} for ${label}.`,
          'Transaction Saved',
        );
        // Real-time notification & system tray notification
        notificationService.addNotification({
          title: 'Transaction Updated',
          message: `${label} was updated to ${displayAmt}.`,
          iconName: 'Check',
          iconColor: '#3B82F6',
          iconBg: '#EFF6FF',
          payload: { transactionId: updated.id },
        });
      } else {
        const created = await transactionsApi.createTransaction(
          data as CreateTransactionDto,
        );
        queryClient.invalidateQueries(['transactions']);
        queryClient.invalidateQueries(['home']);
        const displayAmt = formatPaise(created.amount);
        const label = created.merchant || created.category || 'Transaction';
        toast.success(
          `Added ${displayAmt} for ${label}.`,
          created.type === TransactionType.INCOME ? 'Income Logged' : 'Transaction Logged',
        );

        // Real-time notification & system tray notification based on transaction type
        if (created.type === TransactionType.EXPENSE) {
          notificationService.addNotification({
            title: 'Expense Recorded',
            message: `${displayAmt} paid for ${label}.`,
            iconName: 'ArrowUpRight',
            iconColor: '#EF4444',
            iconBg: '#FEE2E2',
            payload: { transactionId: created.id, type: created.type },
          });
        } else if (created.type === TransactionType.INCOME) {
          notificationService.addNotification({
            title: 'Income Credited',
            message: `${displayAmt} received from ${label}.`,
            iconName: 'ArrowDownLeft',
            iconColor: '#16A34A',
            iconBg: '#DCFCE7',
            payload: { transactionId: created.id, type: created.type },
          });
        } else if (created.type === TransactionType.TRANSFER) {
          notificationService.addNotification({
            title: 'Transfer Completed',
            message: `Transferred ${displayAmt} between accounts.`,
            iconName: 'ArrowRight',
            iconColor: '#2563EB',
            iconBg: '#DBEAFE',
            payload: { transactionId: created.id, type: created.type },
          });
        } else if (created.type === TransactionType.REFUND) {
          notificationService.addNotification({
            title: 'Refund Processed',
            message: `Refund of ${displayAmt} recorded for ${label}.`,
            iconName: 'ArrowDownLeft',
            iconColor: '#0D9488',
            iconBg: '#CCFBF1',
            payload: { transactionId: created.id, type: created.type },
          });
        } else if (created.type === TransactionType.ADJUSTMENT) {
          notificationService.addNotification({
            title: 'Balance Adjusted',
            message: `Account adjustment of ${displayAmt} applied.`,
            iconName: 'SlidersHorizontal',
            iconColor: '#8B5CF6',
            iconBg: '#EDE9FE',
            payload: { transactionId: created.id, type: created.type },
          });
        }
      }
      setModalVisible(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save transaction.', 'Error');
      throw err;
    }
  };

  const handleDeleteTransaction = async (id: string, merchant?: string) => {
    try {
      await transactionsApi.deleteTransaction(id);
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['home']);
      toast.action(
        `Deleted ${merchant || 'transaction'}`,
        'UNDO',
        async () => {
          try {
            await transactionsApi.restoreTransaction(id);
            queryClient.invalidateQueries(['transactions']);
            queryClient.invalidateQueries(['home']);
            toast.success('Transaction restored.', 'Restored');
          } catch {
            toast.error('Unable to restore transaction.', 'Restore Failed');
          }
        },
        'Transaction Removed',
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete transaction.', 'Error');
      throw err;
    }
  };

  // 0. Default launch splash — logo + wordmark + tagline only, no buttons.
  if (showSplash) {
    return (
      <View style={[styles.rootContainer, { backgroundColor: isDark ? '#000000' : '#F7F5FB' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </View>
    );
  }

  // 0a. Safety net: the local auth check is normally near-instant, but if it
  // somehow outlasts the splash's fixed duration, hold a plain branded
  // background rather than falling through to the wrong screen.
  if (status === 'initializing') {
    return <View style={[styles.rootContainer, { backgroundColor: isDark ? '#000000' : '#F7F5FB' }]} />;
  }

  // 1a. Locked -> require PIN / biometric unlock before showing anything else
  if (status === 'locked') {
    return (
      <View style={[styles.rootContainer, isDark && { backgroundColor: '#000000' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <AppLockScreen />
        <ToastHost />
        <AlertHost />
      </View>
    );
  }

  // 1. Unauthenticated or verifying email -> Show Auth Flow Navigator (Welcome Screen)
  if (status === 'unauthenticated' || status === 'pending_verification') {
    return (
      <View style={[styles.rootContainer, isDark && { backgroundColor: '#000000' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <AuthFlowNavigator />
        <ToastHost />
        <AlertHost />
      </View>
    );
  }

  // 3. First-time Biometric Onboarding
  if (status === 'onboarding_biometrics') {
    return (
      <View style={[styles.rootContainer, isDark && { backgroundColor: '#000000' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <BiometricOnboardingScreen />
        <ToastHost />
        <AlertHost />
      </View>
    );
  }

  // 4. Authenticated -> Primary 4-Tab Experience
  return (
    <View
      style={[
        styles.rootContainer,
        isDark && { backgroundColor: '#000000' },
        {
          paddingTop:
            Platform.OS === 'ios'
              ? insets.top
              : Math.max(insets.top, StatusBar.currentHeight ?? 28) + 6,
        },
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* 4 Primary Navigation Sections (Paging ScrollView synced with bottom navbar) */}
      <Animated.ScrollView
        key={`primary-nav-scroll-${user?.id || 'guest'}`}
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentOffset={{ x: 0, y: 0 }}
        scrollEventThrottle={16}
        decelerationRate="fast"
        onScroll={handleScroll}
        onMomentumScrollEnd={(e) => {
          isProgrammaticScrollRef.current = false;
          const offsetX = e?.nativeEvent?.contentOffset?.x ?? 0;
          syncScrollState(offsetX);
          if (windowWidth > 0) {
            const targetIdx = Math.min(
              Math.max(Math.round(offsetX / windowWidth), 0),
              TAB_ORDER.length - 1,
            );
            const targetTab = TAB_ORDER[targetIdx];
            if (targetTab) {
              currentTabRef.current = targetTab;
              setCurrentTab(targetTab);
            }
          }
          const targetIndex = TAB_ORDER.indexOf(currentTabRef.current);
          if (targetIndex !== -1) {
            scrollProgress.setValue(targetIndex);
          }
        }}
        style={{ flex: 1, width: windowWidth }}
        contentContainerStyle={{ width: windowWidth * 4 }}
      >
        {/* 1. Home Dashboard */}
        <View style={{ width: windowWidth, height: '100%' }}>
          <HomeScreen
            userName={user?.displayName || 'User'}
            userAvatarUrl={user?.avatarUrl}
            onScrollingChange={setIsScrolling}
            onNavigateToTab={handleSelectTab}
            onOpenAddTransaction={handleOpenAdd}
            onEditTransaction={handleOpenEdit}
          />
        </View>

        {/* 2. PE Tracker */}
        <View style={{ width: windowWidth, height: '100%' }}>
          <TrackerScreen
            onScrollingChange={setIsScrolling}
            onOpenAddTransaction={handleOpenAdd}
            onEditTransaction={handleOpenEdit}
            onDuplicateTransaction={handleDuplicateTransaction}
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
        userAvatarUrl={user?.avatarUrl ?? undefined}
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
      <ThemeProvider>
        <AlertProvider>
          <ToastProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ToastProvider>
        </AlertProvider>
      </ThemeProvider>
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

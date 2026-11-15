import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import { AppIcon } from '../components/icons/AppIcon';
import { getCategoryIconConfig } from '../components/icons/categoryIcons';
import { colors } from '../theme/colors';
import { toast } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Logo } from '../components/common/Logo';
import {
  NotificationsModal,
  NotificationItem,
} from './NotificationsModal';
import { notificationService } from '../services/notificationService';
import { HomeDashboardData, Transaction, TransactionType } from '../api/types';
import { homeApi } from '../api/home';
import { analyticsApi } from '../api/analytics';
import { queryClient } from '../state/queryClient';
import { formatTransactionTime } from '../utils/date';

interface HomeScreenProps {
  userName?: string | null;
  userAvatarUrl?: string | null;
  expenses?: Transaction[];
  onRefresh?: () => Promise<void> | void;
  onScrollingChange?: (isScrolling: boolean) => void;
  onNavigateToTab?: (tab: 'Home' | 'PE Tracker' | 'Groups' | 'Account') => void;
  onOpenAddTransaction?: (type?: TransactionType) => void;
  onEditTransaction?: (transaction: Transaction) => void;
}

type HomeViewMode = 'overview' | 'insights';
type TimeRange = 'week' | 'month' | 'year';

const SWITCHER_WIDTH = 224;
const SWITCHER_PADDING = 3.5;
const SWITCHER_TAB_WIDTH = (SWITCHER_WIDTH - SWITCHER_PADDING * 2) / 2;

export const HomeScreen: React.FC<HomeScreenProps> = ({
  userName,
  userAvatarUrl: _userAvatarUrl,
  expenses: _expensesProp,
  onRefresh,
  onScrollingChange,
  onNavigateToTab,
  onOpenAddTransaction,
  onEditTransaction,
}) => {
  const authContext = React.useContext(AuthContext);
  const { isDark, colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors, isDark), [themeColors, isDark]);

  const [viewMode, setViewMode] = useState<HomeViewMode>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [insightsMonth, setInsightsMonth] = useState('November 2026');
  const [refreshing, setRefreshing] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<string | null>(null);
  const [insightsCategoryView, setInsightsCategoryView] = useState<'chart' | 'list'>('chart');
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    notificationService.getNotifications(),
  );
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((updated) => {
      setNotifications(updated);
    });
    return unsubscribe;
  }, []);

  // Real Server State
  const [homeData, setHomeData] = useState<HomeDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Insights data
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [_isLoadingInsights, setIsLoadingInsights] = useState(false);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const handleMarkNotificationAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
  }, []);

  const handleDeleteNotification = useCallback((id: string) => {
    notificationService.deleteNotification(id);
  }, []);

  const handleMarkAllNotificationsAsRead = useCallback(() => {
    notificationService.markAllAsRead();
  }, []);

  const handleClearAllNotifications = useCallback(() => {
    notificationService.clearAll();
  }, []);

  const { width: windowWidth } = useWindowDimensions();

  // Smooth sliding indicator animation matching BottomTabBar
  const switcherAnim = useRef(
    new Animated.Value(viewMode === 'overview' ? 0 : 1),
  ).current;

  useEffect(() => {
    const target = viewMode === 'overview' ? 0 : 1;
    Animated.spring(switcherAnim, {
      toValue: target,
      damping: 18,
      stiffness: 175,
      mass: 0.75,
      useNativeDriver: true,
    }).start();
  }, [viewMode, switcherAnim]);

  const switcherTranslateX = switcherAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SWITCHER_TAB_WIDTH],
  });

  // Physical page slide effect matching the top tab bar slider
  const pageSlideTranslateX = switcherAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -windowWidth],
  });

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const lastOffsetY = useRef(0);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBottomNav = useCallback(() => {
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    onScrollingChange?.(false);
  }, [onScrollingChange]);

  // Load Real Home Data
  const loadHome = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const data = await homeApi.getHomeData();
      setHomeData(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load financial dashboard.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load Real Insights Data
  const loadInsights = useCallback(async () => {
    setIsLoadingInsights(true);
    try {
      const summary = await analyticsApi.getSummary({ period: timeRange });
      setAnalyticsData(summary);
    } catch {
      // Keep previous
    } finally {
      setIsLoadingInsights(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadHome();

    const unsubscribeHome = queryClient.subscribe(['home'], () => {
      loadHome(true);
    });
    const unsubscribeTx = queryClient.subscribe(['transactions'], () => {
      loadHome(true);
      if (viewMode === 'insights') loadInsights();
    });

    return () => {
      unsubscribeHome();
      unsubscribeTx();
    };
  }, [loadHome, loadInsights, viewMode]);

  useEffect(() => {
    if (viewMode === 'insights') {
      loadInsights();
    }
  }, [viewMode, loadInsights]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    showBottomNav();
    try {
      if (onRefresh) await onRefresh();
      await loadHome(true);
      if (viewMode === 'insights') await loadInsights();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, loadHome, loadInsights, viewMode, showBottomNav]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const currentY = contentOffset.y;
    const diff = currentY - lastOffsetY.current;

    if (currentY <= 20) {
      showBottomNav();
      lastOffsetY.current = currentY;
      return;
    }

    if (diff < -6) {
      showBottomNav();
    } else if (diff > 8 && currentY > 50) {
      onScrollingChange?.(true);
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = setTimeout(() => {
        onScrollingChange?.(false);
      }, 350);
    }

    lastOffsetY.current = currentY;
  };

  // Contextual Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = useMemo(() => {
    const raw = userName ?? authContext?.user?.displayName;
    if (!raw || !raw.trim()) return 'Friend';
    return raw.trim().split(' ')[0];
  }, [userName, authContext?.user?.displayName]);

  // Derived Real Financial Values
  const totalIncome = homeData?.thisMonth?.income ?? 0;
  const totalExpenses = homeData?.thisMonth?.expenses ?? 0;
  const netBalance = homeData?.accountSummary?.totalBalance ?? (totalIncome - totalExpenses);
  const todaySpent = homeData?.today?.spent ?? 0;

  // Monthly Budget calculations
  const monthlyBudget = useMemo(() => {
    return Math.max(50000, Math.ceil((totalExpenses * 1.25) / 1000) * 1000);
  }, [totalExpenses]);

  const budgetSpentPercent = monthlyBudget > 0
    ? Math.min(100, Math.round((totalExpenses / monthlyBudget) * 100))
    : 0;
  const budgetRemaining = Math.max(0, monthlyBudget - totalExpenses);

  const daysRemaining = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(0, lastDay - now.getDate());
  }, []);

  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());
  }, []);

  const currentMonthShort = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date());
  }, []);

  // Top Category Breakdowns from real backend data
  const categorySummary = useMemo(() => {
    if (homeData?.topCategories && homeData.topCategories.length > 0) {
      return homeData.topCategories.map((c) => ({
        category: c.category,
        amount: c.amount,
        percentage: c.percentage,
        color: c.color,
      }));
    }
    return [];
  }, [homeData?.topCategories]);

  // Recent Activity from real backend data
  const recentTransactions = useMemo(() => {
    return (homeData?.recentTransactions ?? []).slice(0, 5);
  }, [homeData?.recentTransactions]);

  const hasFinancialData =
    (homeData?.accountSummary?.accountCount ?? 0) > 0 ||
    totalIncome > 0 ||
    totalExpenses > 0 ||
    recentTransactions.length > 0;

  // Selected Category Data for Drill-down
  const activeDrilldownCategory = useMemo(() => {
    if (!selectedCategoryDetail) return null;
    return (
      categorySummary.find((c) => c.category === selectedCategoryDetail) || {
        category: selectedCategoryDetail,
        amount: 0,
        percentage: 0,
        color: '#EA580C',
      }
    );
  }, [selectedCategoryDetail, categorySummary]);

  // Donut SVG Parameters
  const donutSize = 112;
  const donutStrokeWidth = 14;
  const donutRadius = (donutSize - donutStrokeWidth) / 2;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutCenter = donutSize / 2;

  let cumulativeOffsetPercent = 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.heroGradientStart, colors.bluePrimary]}
            tintColor={colors.bluePrimary}
          />
        }
      >
        {/* ======================================================== */}
        {/* 1. TOP HEADER: GREETING & NOTIFICATION                   */}
        {/* ======================================================== */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.logoCircle}
              activeOpacity={0.85}
              onPress={() => onNavigateToTab?.('Account')}
              accessibilityLabel="Artha Logo"
            >
              <Logo size={36} variant={isDark ? 'white' : 'navy'} animated={false} />
            </TouchableOpacity>

            <View style={styles.greetingBox}>
              <Text style={styles.greetingText}>{greeting}</Text>
              <Text style={styles.userNameText}>{displayName}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.notificationBtn}
            activeOpacity={0.8}
            onPress={() => setNotificationsModalVisible(true)}
            accessibilityLabel="Notifications"
          >
            <AppIcon name="Bell" size={20} color={isDark ? '#FFFFFF' : colors.navyPrimary} />
            {unreadCount > 0 && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* 2. TOP VIEW SWITCHER: OVERVIEW | INSIGHTS                */}
        {/* ======================================================== */}
        <View style={styles.topSwitcherWrapper}>
          <View
            style={[
              styles.topSwitcherPill,
              { width: SWITCHER_WIDTH, padding: SWITCHER_PADDING },
            ]}
          >
            {/* Animated Sliding Indicator Pill matching Bottom Navbar */}
            <Animated.View
              style={[
                styles.sliderIndicatorPill,
                {
                  width: SWITCHER_TAB_WIDTH,
                  transform: [{ translateX: switcherTranslateX }],
                },
              ]}
            />

            <TouchableOpacity
              style={[styles.switcherOption, { width: SWITCHER_TAB_WIDTH }]}
              onPress={() => setViewMode('overview')}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: viewMode === 'overview' }}
            >
              <Text
                style={[
                  styles.switcherOptionText,
                  viewMode === 'overview' && styles.switcherOptionTextActive,
                ]}
              >
                Overview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.switcherOption, { width: SWITCHER_TAB_WIDTH }]}
              onPress={() => setViewMode('insights')}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: viewMode === 'insights' }}
            >
              <Text
                style={[
                  styles.switcherOptionText,
                  viewMode === 'insights' && styles.switcherOptionTextActive,
                ]}
              >
                Insights
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 3. HORIZONTAL SLIDING PAGES TRACK: OVERVIEW ⇄ INSIGHTS    */}
        {/* ======================================================== */}
        <View style={{ width: windowWidth, overflow: 'hidden' }}>
          <Animated.View
            style={[
              styles.slidingPagesTrack,
              {
                width: windowWidth * 2,
                transform: [{ translateX: pageSlideTranslateX }],
              },
            ]}
          >
            {/* Page 1: Overview */}
            <View style={[styles.slidingPageItem, { width: windowWidth }]}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.bluePrimary} />
                  <Text style={styles.loadingText}>Loading your finances...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <AppIcon name="CircleAlert" size={36} color="#EF4444" />
                  <Text style={styles.errorTitle}>Unable to load financial data</Text>
                  <Text style={styles.errorSubtitle}>{error}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => loadHome(false)}>
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* B. TOTAL BALANCE CARD WITH YELLOW CIRCLE ACCENT */}
                  <View style={styles.balanceCard}>
                    {/* Reference yellow circular graphic in top-right */}
                    <View style={styles.accentCircleOuter}>
                      <View style={styles.accentCircleInner} />
                    </View>

                    <View style={styles.balanceTopRow}>
                      <View style={styles.balanceLabelGroup}>
                        <Text style={styles.balanceLabel}>Total balance</Text>
                        <TouchableOpacity
                          style={styles.eyeBtn}
                          onPress={() => setIsBalanceHidden((prev) => !prev)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Toggle Balance Visibility"
                        >
                          <AppIcon
                            name={isBalanceHidden ? 'EyeOff' : 'Eye'}
                            size={16}
                            color="rgba(255, 255, 255, 0.85)"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Large Hero Amount */}
                    <Text style={styles.balanceAmount}>
                      {isBalanceHidden ? '₹••••••••' : `₹${netBalance.toLocaleString('en-IN')}`}
                    </Text>

                    {/* Sub-Metric Badges Inside Card */}
                    <View style={styles.subMetricsContainer}>
                      {/* Income Pill */}
                      <View style={styles.subMetricPill}>
                        <View style={styles.subMetricIconCircleIncome}>
                          <AppIcon name="ArrowDown" size={13} color="#FFFFFF" strokeWidth={2.6} />
                        </View>
                        <View>
                          <Text style={styles.subMetricCaption}>Income • {currentMonthShort}</Text>
                          <Text style={styles.subMetricValue}>
                            {isBalanceHidden
                              ? '₹••••'
                              : `+₹${totalIncome.toLocaleString('en-IN')}`}
                          </Text>
                        </View>
                      </View>

                      {/* Expenses Pill */}
                      <View style={styles.subMetricPill}>
                        <View style={styles.subMetricIconCircleExpense}>
                          <AppIcon name="ArrowUp" size={13} color="#FFFFFF" strokeWidth={2.6} />
                        </View>
                        <View>
                          <Text style={styles.subMetricCaption}>Expenses • {currentMonthShort}</Text>
                          <Text style={styles.subMetricValue}>
                            {isBalanceHidden
                              ? '₹••••'
                              : `-₹${totalExpenses.toLocaleString('en-IN')}`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* C. 4 CIRCULAR ACTION BUTTONS DIRECTLY BELOW CARD */}
                  <View style={styles.actionCirclesRow}>
                    {/* Button 1: Add */}
                    <View style={styles.actionCircleItem}>
                      <TouchableOpacity
                        style={[styles.actionCircleBtn, styles.actionCirclePrimary]}
                        activeOpacity={0.8}
                        onPress={() => onOpenAddTransaction?.(TransactionType.EXPENSE)}
                      >
                        <AppIcon name="Plus" size={22} color="#FFFFFF" strokeWidth={2.4} />
                      </TouchableOpacity>
                      <Text style={styles.actionCircleLabel}>Add</Text>
                    </View>

                    {/* Button 2: Insights */}
                    <View style={styles.actionCircleItem}>
                      <TouchableOpacity
                        style={[styles.actionCircleBtn, styles.actionCircleLight]}
                        activeOpacity={0.8}
                        onPress={() => setViewMode('insights')}
                      >
                        <AppIcon
                          name="BarChart3"
                          size={20}
                          color={isDark ? '#F58A07' : colors.navyPrimary}
                          strokeWidth={2.2}
                        />
                      </TouchableOpacity>
                      <Text style={styles.actionCircleLabel}>Insights</Text>
                    </View>

                    {/* Button 3: Goals */}
                    <View style={styles.actionCircleItem}>
                      <TouchableOpacity
                        style={[styles.actionCircleBtn, styles.actionCircleLight]}
                        activeOpacity={0.8}
                        onPress={() => setGoalsModalVisible(true)}
                      >
                        <AppIcon
                          name="Flag"
                          size={19}
                          color={isDark ? '#F58A07' : colors.navyPrimary}
                          strokeWidth={2.2}
                        />
                      </TouchableOpacity>
                      <Text style={styles.actionCircleLabel}>Goals</Text>
                    </View>

                    {/* Button 4: Tracker */}
                    <View style={styles.actionCircleItem}>
                      <TouchableOpacity
                        style={[styles.actionCircleBtn, styles.actionCircleLight]}
                        activeOpacity={0.8}
                        onPress={() => onNavigateToTab?.('PE Tracker')}
                      >
                        <AppIcon
                          name="ReceiptText"
                          size={19}
                          color={isDark ? '#F58A07' : colors.navyPrimary}
                          strokeWidth={2.2}
                        />
                      </TouchableOpacity>
                      <Text style={styles.actionCircleLabel}>Tracker</Text>
                    </View>
                  </View>

                  {/* Meaningful Empty State Card when user has zero transactions */}
                  {!hasFinancialData && (
                    <View style={styles.emptyJourneyCard}>
                      <AppIcon name="ReceiptText" size={40} color={colors.bluePrimary} />
                      <Text style={styles.emptyJourneyTitle}>Your financial journey starts here</Text>
                      <Text style={styles.emptyJourneySubtitle}>
                        Add your first transaction to begin tracking your money, categories, and monthly flow.
                      </Text>
                      <TouchableOpacity
                        style={styles.firstTxBtn}
                        onPress={() => onOpenAddTransaction?.(TransactionType.EXPENSE)}
                        activeOpacity={0.85}
                      >
                        <AppIcon name="Plus" size={17} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.firstTxBtnText}>Record First Transaction</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* D. MONTHLY BUDGET CARD */}
                  <View style={styles.cardContainer}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardSectionTitle}>{currentMonthName} budget</Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setGoalsModalVisible(true)}
                      >
                        <Text style={styles.cardActionLink}>Details →</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.budgetRow}>
                      <Text style={styles.budgetBold}>₹{totalExpenses.toLocaleString('en-IN')}</Text>
                      <Text style={styles.budgetRegular}> of ₹{monthlyBudget.toLocaleString('en-IN')}</Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${budgetSpentPercent}%`,
                            backgroundColor:
                              budgetSpentPercent > 90 ? '#EF4444' : colors.bluePrimary,
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.budgetSubInfo}>
                      {todaySpent > 0 ? `Today: ₹${todaySpent.toLocaleString('en-IN')} · ` : ''}₹{budgetRemaining.toLocaleString('en-IN')} left · {daysRemaining} days to go
                    </Text>
                  </View>

                  {/* E. SPENDING BY CATEGORY (SEGMENTED BAR + CATEGORY CARDS) */}
                  <View style={styles.cardContainer}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardSectionTitle}>Spending by category</Text>
                      <TouchableOpacity
                        style={styles.dropdownBadge}
                        activeOpacity={0.7}
                        onPress={() => setViewMode('insights')}
                      >
                        <Text style={styles.dropdownBadgeText}>This month ▾</Text>
                      </TouchableOpacity>
                    </View>

                    {categorySummary.length > 0 ? (
                      <>
                        {/* Segmented Horizontal Progress Bar */}
                        <View style={styles.segmentedBarTrack}>
                          {categorySummary.map((cat, idx) => (
                            <View
                              key={cat.category}
                              style={[
                                styles.segmentedBarSegment,
                                {
                                  width: `${cat.percentage}%`,
                                  backgroundColor: cat.color,
                                  borderTopLeftRadius: idx === 0 ? 5 : 0,
                                  borderBottomLeftRadius: idx === 0 ? 5 : 0,
                                  borderTopRightRadius:
                                    idx === categorySummary.length - 1 ? 5 : 0,
                                  borderBottomRightRadius:
                                    idx === categorySummary.length - 1 ? 5 : 0,
                                },
                              ]}
                            />
                          ))}
                        </View>

                        {/* Category Cards below bar */}
                        <View style={styles.categoryCardRow}>
                          {categorySummary.slice(0, 2).map((cat) => (
                            <TouchableOpacity
                              key={cat.category}
                              style={styles.categoryCard}
                              activeOpacity={0.7}
                              onPress={() => setSelectedCategoryDetail(cat.category)}
                            >
                              <View style={styles.categoryCardTop}>
                                <View
                                  style={[styles.categoryDot, { backgroundColor: cat.color }]}
                                />
                                <Text style={styles.categoryCardTitle} numberOfLines={1}>
                                  {cat.category}
                                </Text>
                              </View>
                              <Text style={styles.categoryCardAmount}>
                                ₹{cat.amount.toLocaleString('en-IN')}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    ) : (
                      <View style={styles.emptySectionBox}>
                        <AppIcon name="BarChart3" size={28} color={isDark ? '#52525B' : '#94A3B8'} />
                        <Text style={styles.emptySectionText}>No category spending yet</Text>
                      </View>
                    )}
                  </View>

                  {/* F. RECENT ACTIVITY LIST */}
                  <View style={styles.cardContainer}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardSectionTitle}>Recent Activity</Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => onNavigateToTab?.('PE Tracker')}
                      >
                        <Text style={styles.cardActionLink}>View All</Text>
                      </TouchableOpacity>
                    </View>

                    {recentTransactions.length > 0 ? (
                      <View style={styles.activityList}>
                        {recentTransactions.map((tx, idx) => {
                          const isIncome =
                            tx.type === TransactionType.INCOME;
                          const catConfig = getCategoryIconConfig(tx.category || '', isDark);
                          const dateLabel = tx.incurredAt
                            ? formatTransactionTime(tx.incurredAt)
                            : 'Today';

                          return (
                            <TouchableOpacity
                              key={tx.id || idx}
                              activeOpacity={0.7}
                              onPress={() => onEditTransaction?.(tx)}
                              style={[
                                styles.activityRow,
                                idx < recentTransactions.length - 1 && styles.activityRowDivider,
                              ]}
                            >
                              <View style={styles.activityLeft}>
                                <View
                                  style={[
                                    styles.activityIconCircle,
                                    { backgroundColor: catConfig.backgroundColor },
                                  ]}
                                >
                                  <AppIcon
                                    name={catConfig.iconName}
                                    size={16}
                                    color={catConfig.iconColor}
                                  />
                                </View>
                                <View>
                                  <Text style={styles.activityMerchantText} numberOfLines={1}>
                                    {tx.merchant || tx.category}
                                  </Text>
                                  <Text style={styles.activityMetaText}>
                                    {dateLabel} · {tx.paymentMethod}
                                  </Text>
                                </View>
                              </View>

                              <Text
                                style={[
                                  styles.activityAmountText,
                                  {
                                    color: isIncome
                                      ? '#16A34A'
                                      : isDark
                                      ? '#FFFFFF'
                                      : '#0F172A',
                                  },
                                ]}
                              >
                                {isIncome ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.emptySectionBox}>
                        <AppIcon name="ReceiptText" size={28} color={isDark ? '#52525B' : '#94A3B8'} />
                        <Text style={styles.emptySectionText}>No transactions recorded</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
            {/* End Page 1: Overview */}

            {/* Page 2: Insights */}
            <View style={[styles.slidingPageItem, { width: windowWidth }]}>
              {/* ======================================================== */}
              {/* VIEW 2: INSIGHTS ("Where your money went" REFERENCE)     */}
              {/* ======================================================== */}
              {/* A. INSIGHTS HEADER */}
              <View style={styles.insightsHeader}>
                <View>
                  <Text style={styles.insightsTitle}>Insights</Text>
                  <Text style={styles.insightsSubtitle}>Where your money went</Text>
                </View>
                <TouchableOpacity
                  style={styles.filterBtn}
                  activeOpacity={0.8}
                  onPress={() => toast.info('Filters: Showing all accounts & categories', 'Insights Filter')}
                >
                  <AppIcon name="SlidersHorizontal" size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
                </TouchableOpacity>
              </View>

              {/* B. TIME RANGE SWITCHER PILLS (Week | Month | Year) */}
              <View style={styles.timeRangePillContainer}>
                {(['week', 'month', 'year'] as TimeRange[]).map((range) => {
                  const isActive = timeRange === range;
                  const label = range.charAt(0).toUpperCase() + range.slice(1);
                  return (
                    <TouchableOpacity
                      key={range}
                      style={[styles.timeRangeTab, isActive && styles.timeRangeTabActive]}
                      onPress={() => setTimeRange(range)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.timeRangeTabText,
                          isActive && styles.timeRangeTabTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* C. MONTH PAGINATION SELECTOR ( < November 2026 > ) */}
              <View style={styles.monthPaginationRow}>
                <TouchableOpacity
                  style={styles.monthNavArrow}
                  onPress={() => setInsightsMonth('October 2026')}
                  activeOpacity={0.7}
                >
                  <AppIcon name="ChevronLeft" size={20} color={isDark ? '#FFFFFF' : '#0F172A'} />
                </TouchableOpacity>
                <Text style={styles.monthPaginationText}>{insightsMonth}</Text>
                <TouchableOpacity
                  style={styles.monthNavArrow}
                  onPress={() => setInsightsMonth('December 2026')}
                  activeOpacity={0.7}
                >
                  <AppIcon name="ChevronRight" size={20} color={isDark ? '#FFFFFF' : '#0F172A'} />
                </TouchableOpacity>
              </View>

              {/* D. TOTAL SPENT HERO CARD */}
              <View style={styles.totalSpentCard}>
                <Text style={styles.totalSpentCaption}>Total spent in {currentMonthName}</Text>
                <Text style={styles.totalSpentAmount}>
                  ₹{(analyticsData?.expenses ?? totalExpenses).toLocaleString('en-IN')}
                </Text>

                <View style={styles.trendBadge}>
                  <AppIcon name="ArrowUp" size={13} color="#A7F3D0" strokeWidth={2.5} />
                  <Text style={styles.trendBadgeText}>Active tracking</Text>
                </View>

                <Text style={styles.dailyAverageText}>
                  About ₹{Math.round(analyticsData?.averageDailySpend ?? (totalExpenses / 20)).toLocaleString('en-IN')} a day · {analyticsData?.daysInPeriod ?? 20} days so far
                </Text>
              </View>

              {/* E. "BY CATEGORY" CARD WITH DONUT CHART & PERCENTAGES */}
              <View style={styles.cardContainer}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardSectionTitle}>By category</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      setInsightsCategoryView(insightsCategoryView === 'chart' ? 'list' : 'chart')
                    }
                  >
                    <Text style={styles.cardActionLink}>
                      {insightsCategoryView === 'chart' ? 'List view' : 'Chart view'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {categorySummary.length > 0 ? (
                  insightsCategoryView === 'chart' ? (
                    <View style={styles.donutSectionRow}>
                      {/* Left: Donut SVG Chart */}
                      <View style={styles.donutChartWrapper}>
                        <Svg
                          width={donutSize}
                          height={donutSize}
                          viewBox={`0 0 ${donutSize} ${donutSize}`}
                        >
                          <G rotation="-90" origin={`${donutCenter}, ${donutCenter}`}>
                            {categorySummary.map((cat, i) => {
                              const strokeDasharray = `${(cat.percentage / 100) * donutCircumference} ${donutCircumference}`;
                              const strokeDashoffset = -(
                                (cumulativeOffsetPercent / 100) *
                                donutCircumference
                              );
                              cumulativeOffsetPercent += cat.percentage;

                              return (
                                <Circle
                                  key={cat.category || i}
                                  cx={donutCenter}
                                  cy={donutCenter}
                                  r={donutRadius}
                                  stroke={cat.color}
                                  strokeWidth={donutStrokeWidth}
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                  strokeLinecap="butt"
                                  fill="transparent"
                                />
                              );
                            })}
                          </G>
                        </Svg>

                        {/* Donut Center Label */}
                        <View style={styles.donutCenterHole}>
                          <Text style={styles.donutCenterCount}>{categorySummary.length}</Text>
                          <Text style={styles.donutCenterLabel}>categories</Text>
                        </View>
                      </View>

                      {/* Right: Category Percentage Breakdown */}
                      <View style={styles.donutLegendList}>
                        {categorySummary.map((cat) => (
                          <TouchableOpacity
                            key={cat.category}
                            style={styles.donutLegendItem}
                            activeOpacity={0.7}
                            onPress={() => setSelectedCategoryDetail(cat.category)}
                          >
                            <View style={styles.donutLegendLeft}>
                              <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                              <Text style={styles.donutLegendName} numberOfLines={1}>
                                {cat.category}
                              </Text>
                            </View>
                            <Text style={styles.donutLegendPercent}>{cat.percentage}%</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ) : (
                    /* List View of Categories */
                    <View style={styles.insightsCategoryList}>
                      {categorySummary.map((cat) => (
                        <TouchableOpacity
                          key={cat.category}
                          style={styles.insightsCategoryListItem}
                          activeOpacity={0.7}
                          onPress={() => setSelectedCategoryDetail(cat.category)}
                        >
                          <View style={styles.insightsCatLeft}>
                            <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                            <Text style={styles.insightsCatName}>{cat.category}</Text>
                          </View>
                          <View style={styles.insightsCatRight}>
                            <Text style={styles.insightsCatAmount}>
                              ₹{cat.amount.toLocaleString('en-IN')}
                            </Text>
                            <Text style={styles.insightsCatPercent}>{cat.percentage}%</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )
                ) : (
                  <View style={styles.emptySectionBox}>
                    <AppIcon name="BarChart3" size={28} color={isDark ? '#52525B' : '#94A3B8'} />
                    <Text style={styles.emptySectionText}>No category spending yet</Text>
                  </View>
                )}
              </View>
            </View>
            {/* End Page 2: Insights */}
          </Animated.View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ======================================================== */}
      {/* CATEGORY DRILLDOWN MODAL                                 */}
      {/* ======================================================== */}
      <Modal
        visible={Boolean(selectedCategoryDetail)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCategoryDetail(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.drilldownSheet}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedCategoryDetail(null)}
              >
                <AppIcon name="ChevronLeft" size={22} color={isDark ? '#FFFFFF' : '#0F172A'} />
              </TouchableOpacity>
              <Text style={styles.drilldownSheetTitle}>
                {activeDrilldownCategory?.category || 'Category Details'}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            <View style={styles.drilldownHero}>
              <View
                style={[
                  styles.drilldownIconSquare,
                  { backgroundColor: activeDrilldownCategory?.color || '#EA580C' },
                ]}
              >
                <AppIcon name="Coffee" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.drilldownAmount}>
                ₹{(activeDrilldownCategory?.amount || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.drilldownTrend}>Active category</Text>
            </View>

            {/* Category Budget Card */}
            <View style={styles.drilldownBudgetCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.drilldownBudgetTitle}>Category budget</Text>
              </View>
              <Text style={styles.budgetText}>
                <Text style={styles.budgetBold}>
                  ₹{(activeDrilldownCategory?.amount || 0).toLocaleString('en-IN')}
                </Text>
              </Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, activeDrilldownCategory?.percentage || 0)}%`,
                      backgroundColor: activeDrilldownCategory?.color || '#EA580C',
                    },
                  ]}
                />
              </View>
              <Text style={styles.budgetSubInfo}>
                {activeDrilldownCategory?.percentage || 0}% of total monthly expenses
              </Text>
            </View>

            <TouchableOpacity
              style={styles.drilldownDoneBtn}
              onPress={() => setSelectedCategoryDetail(null)}
            >
              <Text style={styles.drilldownDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* GOALS / BUDGET DETAILS MODAL                             */}
      {/* ======================================================== */}
      <Modal
        visible={goalsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGoalsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.goalsSheet}>
            <Text style={styles.goalsTitle}>{currentMonthName} Budget Details</Text>
            <Text style={styles.goalsSubtitle}>
              You have a monthly budget of ₹{monthlyBudget.toLocaleString('en-IN')}. You've used ₹
              {totalExpenses.toLocaleString('en-IN')} ({budgetSpentPercent}%) with ₹
              {budgetRemaining.toLocaleString('en-IN')} remaining for the next {daysRemaining} days.
            </Text>

            <TouchableOpacity
              style={styles.drilldownDoneBtn}
              onPress={() => setGoalsModalVisible(false)}
            >
              <Text style={styles.drilldownDoneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* NOTIFICATIONS FULL-SCREEN MODAL                         */}
      {/* ======================================================== */}
      <NotificationsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onDeleteNotification={handleDeleteNotification}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onClearAll={handleClearAllNotifications}
      />
    </View>
  );
};

const createStyles = (themeColors: typeof colors, isDark: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: isDark ? '#000000' : '#F2F3F7',
    },
    scrollContent: {
      paddingTop: 12,
      paddingHorizontal: 0,
      paddingBottom: 40,
    },
    slidingPagesTrack: {
      flexDirection: 'row',
    },
    slidingPageItem: {
      paddingHorizontal: 16,
    },
    bottomSpacer: {
      height: 96,
    },

    // Loading / Error
    loadingContainer: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
      marginTop: 12,
    },
    errorContainer: {
      backgroundColor: isDark ? '#1C1917' : '#FEF2F2',
      borderRadius: 18,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
      marginBottom: 20,
    },
    errorTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#EF4444',
      marginTop: 8,
      marginBottom: 4,
    },
    errorSubtitle: {
      fontSize: 13,
      color: isDark ? '#A1A1AA' : '#64748B',
      textAlign: 'center',
      marginBottom: 16,
    },
    retryBtn: {
      backgroundColor: colors.bluePrimary,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 12,
    },
    retryBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 13.5,
    },

    // Empty Journey Card
    emptyJourneyCard: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderRadius: 20,
      padding: 22,
      marginBottom: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.04,
      shadowRadius: 8,
      elevation: isDark ? 0 : 2,
    },
    emptyJourneyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginTop: 10,
      marginBottom: 6,
      textAlign: 'center',
    },
    emptyJourneySubtitle: {
      fontSize: 13,
      color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B',
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 16,
      paddingHorizontal: 8,
    },
    firstTxBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.bluePrimary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 14,
    },
    firstTxBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    emptySectionBox: {
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    emptySectionText: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? 'rgba(255, 255, 255, 0.42)' : '#94A3B8',
    },

    // Top Segmented Switcher (Overview | Insights)
    topSwitcherWrapper: {
      alignItems: 'center',
      marginBottom: 14,
      paddingHorizontal: 16,
    },
    topSwitcherPill: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#000000' : '#E2E8F0',
      borderRadius: 22,
      position: 'relative',
      height: 40,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
    },
    sliderIndicatorPill: {
      position: 'absolute',
      left: SWITCHER_PADDING,
      top: SWITCHER_PADDING,
      bottom: SWITCHER_PADDING,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.9)',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.12,
      shadowRadius: 5,
      elevation: isDark ? 0 : 3,
    },
    switcherOption: {
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      zIndex: 2,
    },
    switcherOptionText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? 'rgba(255, 255, 255, 0.42)' : '#64748B',
    },
    switcherOptionTextActive: {
      color: isDark ? '#FFFFFF' : colors.textPrimary,
      fontWeight: '700',
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingHorizontal: 16,
      paddingTop: 2,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    logoCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      shadowColor: '#031D44',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.06,
      shadowRadius: 6,
      elevation: isDark ? 0 : 2,
    },
    greetingBox: {
      justifyContent: 'center',
      flex: 1,
    },
    greetingText: {
      fontFamily: Platform.select({
        ios: 'AvenirNextCondensed-Heavy',
        android: 'sans-serif-condensed',
        default: 'System',
      }),
      fontSize: 18,
      fontWeight: '900',
      color: isDark ? '#F58A07' : '#084887',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 1,
    },
    userNameText: {
      fontFamily: Platform.select({
        ios: 'AvenirNext-Heavy',
        android: 'sans-serif-black',
        default: 'System',
      }),
      fontSize: 20,
      fontWeight: '900',
      color: isDark ? '#FFFFFF' : '#031D44',
      letterSpacing: -0.4,
      textTransform: 'uppercase',
      lineHeight: 28,
    },
    notificationBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#031D44',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.05,
      shadowRadius: 6,
      elevation: isDark ? 0 : 1,
    },
    notificationDot: {
      position: 'absolute',
      top: 11,
      right: 12,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: '#EF4444',
    },

    // Total Balance Card
    balanceCard: {
      backgroundColor: isDark ? '#000000' : colors.navyDeep,
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? '#F58A07' : colors.liquidGlassPill,
      shadowColor: '#01151E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0 : 0.35,
      shadowRadius: 16,
      elevation: isDark ? 0 : 8,
    },
    accentCircleOuter: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: isDark ? 'rgba(245, 138, 7, 0.25)' : colors.bluePrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accentCircleInner: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: isDark ? '#000000' : colors.navyDeep,
    },
    balanceTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    balanceLabelGroup: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    balanceLabel: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.85)',
      fontWeight: '500',
      marginRight: 6,
    },
    eyeBtn: {
      padding: 2,
    },
    balanceAmount: {
      fontSize: 32,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.5,
      marginBottom: 18,
    },
    subMetricsContainer: {
      flexDirection: 'row',
      gap: 10,
    },
    subMetricPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.22)',
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 10,
    },
    subMetricIconCircleIncome: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#10B981',
      alignItems: 'center',
      justifyContent: 'center',
    },
    subMetricIconCircleExpense: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    subMetricCaption: {
      fontSize: 10.5,
      color: 'rgba(255, 255, 255, 0.75)',
      fontWeight: '500',
    },
    subMetricValue: {
      fontSize: 13.5,
      fontWeight: '700',
      color: '#FFFFFF',
      marginTop: 1,
    },

    // 4 Circular Action Buttons
    actionCirclesRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      marginBottom: 20,
      paddingHorizontal: 4,
    },
    actionCircleItem: {
      alignItems: 'center',
    },
    actionCircleBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    actionCirclePrimary: {
      backgroundColor: colors.bluePrimary,
      shadowColor: colors.bluePrimary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    actionCircleLight: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.05,
      shadowRadius: 6,
      elevation: isDark ? 0 : 2,
    },
    actionCircleLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#1E293B',
    },

    // Card Containers
    cardContainer: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.04,
      shadowRadius: 8,
      elevation: isDark ? 0 : 2,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardSectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
      letterSpacing: -0.2,
    },
    cardActionLink: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#F58A07' : colors.bluePrimary,
    },
    dropdownBadge: {
      backgroundColor: isDark ? '#000000' : '#F1F5F9',
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    dropdownBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#475569',
    },

    // Budget Card Elements
    budgetRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 10,
    },
    budgetText: {
      marginBottom: 10,
    },
    budgetBold: {
      fontSize: 20,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    budgetRegular: {
      fontSize: 15,
      fontWeight: '500',
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    progressBarTrack: {
      height: 8,
      backgroundColor: isDark ? '#262626' : '#E2E8F0',
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    budgetSubInfo: {
      fontSize: 12,
      color: isDark ? '#71717A' : '#64748B',
      fontWeight: '500',
    },

    // Segmented Bar Track
    segmentedBarTrack: {
      flexDirection: 'row',
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
      marginBottom: 14,
    },
    segmentedBarSegment: {
      height: '100%',
    },
    categoryCardRow: {
      flexDirection: 'row',
      gap: 12,
    },
    categoryCard: {
      flex: 1,
      backgroundColor: isDark ? '#161616' : '#F8FAFC',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? '#262626' : '#E2E8F0',
    },
    categoryCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      gap: 6,
    },
    categoryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    categoryCardTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#475569',
    },
    categoryCardAmount: {
      fontSize: 15,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },

    // Recent Activity
    activityList: {
      marginTop: 2,
    },
    activityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },
    activityRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#1E1E1E' : '#F1F5F9',
    },
    activityLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    activityIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityMerchantText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    activityMetaText: {
      fontSize: 11.5,
      color: isDark ? '#71717A' : '#64748B',
      marginTop: 2,
    },
    activityAmountText: {
      fontSize: 14.5,
      fontWeight: '700',
    },

    // ========================================================
    // INSIGHTS VIEW STYLES
    // ========================================================
    insightsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    insightsTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      letterSpacing: -0.4,
    },
    insightsSubtitle: {
      fontSize: 13,
      color: isDark ? '#A1A1AA' : '#64748B',
      fontWeight: '500',
      marginTop: 2,
    },
    filterBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeRangePillContainer: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#000000' : '#F1F5F9',
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
      borderRadius: 14,
      padding: 4,
      marginBottom: 16,
    },
    timeRangeTab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    timeRangeTabActive: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.1,
      shadowRadius: 3,
      elevation: isDark ? 0 : 2,
    },
    timeRangeTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? 'rgba(255, 255, 255, 0.42)' : '#64748B',
    },
    timeRangeTabTextActive: {
      color: isDark ? '#FFFFFF' : '#0F172A',
      fontWeight: '700',
    },
    monthPaginationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 8,
    },
    monthNavArrow: {
      padding: 6,
    },
    monthPaginationText: {
      fontSize: 15,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    totalSpentCard: {
      backgroundColor: isDark ? '#000000' : colors.navyPrimary,
      borderRadius: 24,
      padding: 22,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: isDark ? '#F58A07' : colors.liquidGlassPill,
      shadowColor: '#01151E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0 : 0.35,
      shadowRadius: 14,
      elevation: isDark ? 0 : 6,
    },
    totalSpentCaption: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.85)',
      fontWeight: '500',
      marginBottom: 6,
    },
    totalSpentAmount: {
      fontSize: 34,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.5,
      marginBottom: 12,
    },
    trendBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(33, 165, 236, 0.22)',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 4,
      marginBottom: 14,
    },
    trendBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#90D2F5',
    },
    dailyAverageText: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.75)',
      fontWeight: '500',
    },

    // Donut Section
    donutSectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingVertical: 6,
    },
    donutChartWrapper: {
      width: 112,
      height: 112,
      alignItems: 'center',
      justifyContent: 'center',
    },
    donutCenterHole: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    donutCenterCount: {
      fontSize: 20,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    donutCenterLabel: {
      fontSize: 9.5,
      fontWeight: '500',
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    donutLegendList: {
      flex: 1,
      gap: 8,
    },
    donutLegendItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    donutLegendLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    donutLegendName: {
      fontSize: 12.5,
      fontWeight: '600',
      color: isDark ? '#D4D4D8' : '#334155',
    },
    donutLegendPercent: {
      fontSize: 12.5,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },

    // Insights List View
    insightsCategoryList: {
      gap: 10,
      paddingVertical: 4,
    },
    insightsCategoryListItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    insightsCatLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    insightsCatName: {
      fontSize: 13.5,
      fontWeight: '600',
      color: isDark ? '#D4D4D8' : '#1E293B',
    },
    insightsCatRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    insightsCatAmount: {
      fontSize: 13.5,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    insightsCatPercent: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
      width: 32,
      textAlign: 'right',
    },

    // Drilldown Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    drilldownSheet: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderTopWidth: 1,
      borderLeftWidth: isDark ? 1 : 0,
      borderRightWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
      padding: 22,
      paddingBottom: 40,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalCloseBtn: {
      padding: 6,
    },
    drilldownSheetTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    drilldownHero: {
      alignItems: 'center',
      marginBottom: 20,
    },
    drilldownIconSquare: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    drilldownAmount: {
      fontSize: 30,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 4,
    },
    drilldownTrend: {
      fontSize: 13,
      color: '#EA580C',
      fontWeight: '600',
    },
    drilldownBudgetCard: {
      backgroundColor: isDark ? '#000000' : '#F8FAFC',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      marginBottom: 16,
    },
    drilldownBudgetTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    drilldownDoneBtn: {
      backgroundColor: isDark ? '#F58A07' : colors.bluePrimary,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
    drilldownDoneBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: isDark ? '#000000' : '#FFFFFF',
    },

    // Goals Modal
    goalsSheet: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderRadius: 24,
      padding: 24,
      marginHorizontal: 24,
      alignSelf: 'center',
      marginTop: 'auto',
      marginBottom: 'auto',
      width: '88%',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
    },
    goalsTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 10,
    },
    goalsSubtitle: {
      fontSize: 13.5,
      color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#475569',
      lineHeight: 20,
      marginBottom: 20,
    },
  });

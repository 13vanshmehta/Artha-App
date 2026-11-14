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
  PanResponder,
} from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import { AppIcon } from '../components/icons/AppIcon';
import { getCategoryIconConfig } from '../components/icons/categoryIcons';
import { ExpenseItem } from '../data/mockData';
import { colors } from '../theme/colors';
import { toast } from '../context/ToastContext';
import {
  NotificationsModal,
  NotificationItem,
  INITIAL_NOTIFICATIONS,
} from './NotificationsModal';

interface HomeScreenProps {
  userName?: string | null;
  expenses: ExpenseItem[];
  onRefresh?: () => Promise<void> | void;
  onReplaySplash?: () => void;
  onScrollingChange?: (isScrolling: boolean) => void;
  onNavigateToTab?: (tab: 'Home' | 'PE Tracker' | 'Groups' | 'Account') => void;
  onOpenAddTransaction?: (type?: 'expense' | 'income') => void;
}

type HomeViewMode = 'overview' | 'insights';
type TimeRange = 'week' | 'month' | 'year';

const SWITCHER_WIDTH = 224;
const SWITCHER_PADDING = 3.5;
const SWITCHER_TAB_WIDTH = (SWITCHER_WIDTH - SWITCHER_PADDING * 2) / 2;

export const HomeScreen: React.FC<HomeScreenProps> = ({
  userName,
  expenses,
  onRefresh,
  onReplaySplash,
  onScrollingChange,
  onNavigateToTab,
  onOpenAddTransaction,
}) => {
  const [viewMode, setViewMode] = useState<HomeViewMode>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [insightsMonth, setInsightsMonth] = useState('November 2026');
  const [refreshing, setRefreshing] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<string | null>(null);
  const [insightsCategoryView, setInsightsCategoryView] = useState<'chart' | 'list'>('chart');
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const handleMarkNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const handleDeleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleMarkAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleClearAllNotifications = useCallback(() => {
    setNotifications([]);
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
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBottomNav = useCallback(() => {
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    onScrollingChange?.(false);
  }, [onScrollingChange]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    showBottomNav();
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        setRefreshing(false);
      }, 500);
    }
  }, [onRefresh, showBottomNav]);

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
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }, []);

  const displayName = useMemo(() => {
    if (!userName || !userName.trim()) return 'Vansh';
    return userName.trim().split(' ')[0];
  }, [userName]);

  const userInitial = useMemo(() => {
    return displayName.charAt(0).toUpperCase();
  }, [displayName]);

  // Aggregate Real Financial Metrics
  const { totalIncome, totalExpenses, netBalance } = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;

    expenses.forEach((item) => {
      if (item.type === 'income') {
        incomeSum += item.amount;
      } else {
        expenseSum += item.amount;
      }
    });

    // Provide sensible default base balance matching reference if fresh
    const baselineIncome = incomeSum > 0 ? incomeSum : 120000;
    const baselineExpenses = expenseSum > 0 ? expenseSum : 35500;
    const net = baselineIncome - baselineExpenses; // ₹84,500

    return {
      totalIncome: baselineIncome,
      totalExpenses: baselineExpenses,
      netBalance: net,
    };
  }, [expenses]);

  // Monthly Budget Progress (November Budget ₹35,500 of ₹50,000 spent)
  const monthlyBudget = 50000;
  const budgetSpentPercent = Math.min(
    100,
    Math.round((totalExpenses / monthlyBudget) * 100),
  );
  const budgetRemaining = Math.max(0, monthlyBudget - totalExpenses);

  // Top Category Breakdowns
  const categorySummary = useMemo(() => {
    const map = new Map<string, number>();

    expenses.forEach((item) => {
      if (item.type !== 'income') {
        const cat = item.category || 'Other';
        map.set(cat, (map.get(cat) || 0) + item.amount);
      }
    });

    if (map.size === 0) {
      return [
        { category: 'Food', amount: 14200, percentage: 40, color: colors.bluePrimary },
        { category: 'Transport', amount: 6800, percentage: 19, color: '#F59E0B' },
        { category: 'Shopping', amount: 10300, percentage: 29, color: colors.navyPrimary },
        { category: 'Entertainment', amount: 4200, percentage: 12, color: '#8B5CF6' },
      ];
    }

    const colorPalette = [colors.bluePrimary, colors.navyPrimary, colors.blueLight, '#F59E0B', '#10B981', '#8B5CF6'];
    const items = Array.from(map.entries()).map(([category, amount], idx) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      color: colorPalette[idx % colorPalette.length],
    }));

    return items.sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [expenses, totalExpenses]);

  // Recent Activity Transactions
  const recentTransactions = useMemo(() => {
    if (expenses.length > 0) {
      return expenses.slice(0, 4);
    }

    return [
      {
        id: 'tx-1',
        merchant: 'Starbucks Coffee',
        category: 'Food & Dining',
        amount: 450,
        type: 'expense' as const,
        dateStr: 'Today',
        timeStr: '4:15 PM',
        dateGroup: 'Today' as const,
        paymentMethod: 'UPI',
      },
      {
        id: 'tx-2',
        merchant: 'Uber Trip',
        category: 'Transport',
        amount: 320,
        type: 'expense' as const,
        dateStr: 'Today',
        timeStr: '1:20 PM',
        dateGroup: 'Today' as const,
        paymentMethod: 'Card',
      },
      {
        id: 'tx-3',
        merchant: 'Swiggy Food Delivery',
        category: 'Food & Dining',
        amount: 620,
        type: 'expense' as const,
        dateStr: 'Yesterday',
        timeStr: '8:40 PM',
        dateGroup: 'Yesterday' as const,
        paymentMethod: 'UPI',
      },
      {
        id: 'tx-4',
        merchant: 'Monthly Payout / Salary',
        category: 'Income',
        amount: 85000,
        type: 'income' as const,
        dateStr: 'Nov 01',
        timeStr: '9:00 AM',
        dateGroup: 'Earlier' as const,
        paymentMethod: 'Bank',
      },
    ];
  }, [expenses]);

  // Selected Category Data for Drill-down
  const activeDrilldownCategory = useMemo(() => {
    if (!selectedCategoryDetail) return null;
    return categorySummary.find((c) => c.category === selectedCategoryDetail) || {
      category: selectedCategoryDetail,
      amount: 14200,
      percentage: 33,
      color: '#EA580C',
    };
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
        {/* TOP VIEW SWITCHER: OVERVIEW | INSIGHTS                  */}
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
        {/* HORIZONTAL SLIDING PAGES TRACK: OVERVIEW ⇄ INSIGHTS      */}
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
            {/* A. TOP HEADER: GREETING & NOTIFICATION */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  style={styles.avatarCircle}
                  activeOpacity={0.8}
                  onPress={onReplaySplash}
                  accessibilityLabel="Account Profile"
                >
                  <Text style={styles.avatarInitial}>{userInitial}</Text>
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
                <AppIcon name="Bell" size={20} color={colors.navyPrimary} />
                {unreadCount > 0 && <View style={styles.notificationDot} />}
              </TouchableOpacity>
            </View>

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
                    <Text style={styles.subMetricCaption}>Income • Nov</Text>
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
                    <Text style={styles.subMetricCaption}>Expenses • Nov</Text>
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
                  onPress={() => onOpenAddTransaction?.('expense')}
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
                  <AppIcon name="BarChart3" size={20} color={colors.navyPrimary} strokeWidth={2.2} />
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
                  <AppIcon name="Flag" size={19} color={colors.navyPrimary} strokeWidth={2.2} />
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
                  <AppIcon name="ReceiptText" size={19} color={colors.navyPrimary} strokeWidth={2.2} />
                </TouchableOpacity>
                <Text style={styles.actionCircleLabel}>Tracker</Text>
              </View>
            </View>

            {/* D. NOVEMBER BUDGET CARD */}
            <View style={styles.cardContainer}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTitle}>November budget</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setGoalsModalVisible(true)}
                >
                  <Text style={styles.cardActionLink}>Details →</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.budgetText}>
                <Text style={styles.budgetBold}>₹{totalExpenses.toLocaleString('en-IN')}</Text>
                {' of '}
                <Text style={styles.budgetRegular}>₹{monthlyBudget.toLocaleString('en-IN')}</Text>
              </Text>

              {/* Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${budgetSpentPercent}%`,
                      backgroundColor: budgetSpentPercent > 90 ? '#EF4444' : colors.bluePrimary,
                    },
                  ]}
                />
              </View>

              <Text style={styles.budgetSubInfo}>
                ₹{budgetRemaining.toLocaleString('en-IN')} left · 16 days to go
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
                        borderTopRightRadius: idx === categorySummary.length - 1 ? 5 : 0,
                        borderBottomRightRadius: idx === categorySummary.length - 1 ? 5 : 0,
                      },
                    ]}
                  />
                ))}
              </View>

              {/* Category Cards below bar */}
              <View style={styles.categoryCardRow}>
                <TouchableOpacity
                  style={styles.categoryCard}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCategoryDetail(categorySummary[0]?.category || 'Food & Dining')}
                >
                  <View style={styles.categoryCardTop}>
                    <View style={[styles.categoryDot, { backgroundColor: '#EA580C' }]} />
                    <Text style={styles.categoryCardTitle} numberOfLines={1}>
                      {categorySummary[0]?.category || 'Food'}
                    </Text>
                  </View>
                  <Text style={styles.categoryCardAmount}>
                    ₹{(categorySummary[0]?.amount || 14200).toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.categoryCard}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCategoryDetail(categorySummary[1]?.category || 'Shopping')}
                >
                  <View style={styles.categoryCardTop}>
                    <View style={[styles.categoryDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.categoryCardTitle} numberOfLines={1}>
                      {categorySummary[1]?.category || 'Shopping'}
                    </Text>
                  </View>
                  <Text style={styles.categoryCardAmount}>
                    ₹{(categorySummary[1]?.amount || 12400).toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              </View>
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

              <View style={styles.activityList}>
                {recentTransactions.map((tx, idx) => {
                  const isExpense = tx.type !== 'income';
                  const catConfig = getCategoryIconConfig(tx.category || '');
                  return (
                    <View
                      key={tx.id || idx}
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
                            {tx.merchant}
                          </Text>
                          <Text style={styles.activityMetaText}>
                            {tx.dateStr} · {tx.paymentMethod}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.activityAmountText,
                          { color: isExpense ? '#0F172A' : '#16A34A' },
                        ]}
                      >
                        {isExpense ? '-' : '+'}₹{tx.amount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* G. TOP INSIGHT CARD */}
            <View style={styles.topInsightCard}>
              <View style={styles.topInsightIconBox}>
                <AppIcon name="Lightbulb" size={20} color="#854D0E" />
              </View>
              <View style={styles.topInsightContent}>
                <Text style={styles.topInsightHeader}>TOP INSIGHT</Text>
                <Text style={styles.topInsightText}>
                  You spent 18% less on Food & Dining than last month. You're on track to save ₹22,500!
                </Text>
              </View>
            </View>
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
                <AppIcon name="SlidersHorizontal" size={18} color="#0F172A" />
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

            {/* C. MONTH PAGINATION SELECTOR ( < October 2026 > ) */}
            <View style={styles.monthPaginationRow}>
              <TouchableOpacity
                style={styles.monthNavArrow}
                onPress={() => setInsightsMonth('October 2026')}
                activeOpacity={0.7}
              >
                <AppIcon name="ChevronLeft" size={20} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.monthPaginationText}>{insightsMonth}</Text>
              <TouchableOpacity
                style={styles.monthNavArrow}
                onPress={() => setInsightsMonth('December 2026')}
                activeOpacity={0.7}
              >
                <AppIcon name="ChevronRight" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* D. TOTAL SPENT HERO CARD (GREEN/NAVY CARD) */}
            <View style={styles.totalSpentCard}>
              <Text style={styles.totalSpentCaption}>Total spent in November</Text>
              <Text style={styles.totalSpentAmount}>
                ₹{totalExpenses.toLocaleString('en-IN')}
              </Text>

              <View style={styles.trendBadge}>
                <AppIcon name="ArrowUp" size={13} color="#A7F3D0" strokeWidth={2.5} />
                <Text style={styles.trendBadgeText}>10% more than October</Text>
              </View>

              <Text style={styles.dailyAverageText}>
                About ₹{Math.round(totalExpenses / 20).toLocaleString('en-IN')} a day · 20 days so far
              </Text>
            </View>

            {/* E. "BY CATEGORY" CARD WITH DONUT CHART & PERCENTAGES */}
            <View style={styles.cardContainer}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTitle}>By category</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setInsightsCategoryView(insightsCategoryView === 'chart' ? 'list' : 'chart')}
                >
                  <Text style={styles.cardActionLink}>
                    {insightsCategoryView === 'chart' ? 'List view' : 'Chart view'}
                  </Text>
                </TouchableOpacity>
              </View>

              {insightsCategoryView === 'chart' ? (
                <View style={styles.donutSectionRow}>
                  {/* Left: Donut SVG Chart */}
                  <View style={styles.donutChartWrapper}>
                    <Svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`}>
                      <G rotation="-90" origin={`${donutCenter}, ${donutCenter}`}>
                        {categorySummary.map((cat, i) => {
                          const strokeDasharray = `${(cat.percentage / 100) * donutCircumference} ${donutCircumference}`;
                          const strokeDashoffset = -((cumulativeOffsetPercent / 100) * donutCircumference);
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

                    {/* Donut Center Label: 4 categories */}
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
                        <Text style={styles.insightsCatAmount}>₹{cat.amount.toLocaleString('en-IN')}</Text>
                        <Text style={styles.insightsCatPercent}>{cat.percentage}%</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* F. TOP INSIGHT CARD IN INSIGHTS VIEW */}
            <View style={styles.topInsightCard}>
              <View style={styles.topInsightIconBox}>
                <AppIcon name="Lightbulb" size={20} color="#854D0E" />
              </View>
              <View style={styles.topInsightContent}>
                <Text style={styles.topInsightHeader}>TOP INSIGHT</Text>
                <Text style={styles.topInsightText}>
                  You spent 18% more on Food & Dining than in October. Adjust your food budget to stay on track.
                </Text>
              </View>
            </View>
          </View>
          {/* End Page 2: Insights */}
        </Animated.View>
      </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ======================================================== */}
      {/* CATEGORY DRILLDOWN MODAL (Reference Screen 3)            */}
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
                <AppIcon name="ChevronLeft" size={22} color="#0F172A" />
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
                ₹{(activeDrilldownCategory?.amount || 14200).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.drilldownTrend}>↑ 18% more than October</Text>
            </View>

            {/* Category Budget Card */}
            <View style={styles.drilldownBudgetCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.drilldownBudgetTitle}>Category budget</Text>
                <Text style={styles.cardActionLink}>Edit</Text>
              </View>
              <Text style={styles.budgetText}>
                <Text style={styles.budgetBold}>
                  ₹{(activeDrilldownCategory?.amount || 14200).toLocaleString('en-IN')}
                </Text>
                {' of ₹18,000'}
              </Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: '78%', backgroundColor: activeDrilldownCategory?.color || '#EA580C' },
                  ]}
                />
              </View>
              <Text style={styles.budgetSubInfo}>78% used · ₹3,800 left for 16 days</Text>
            </View>

            {/* 3 Metric Cards */}
            <View style={styles.drilldownMetricsRow}>
              <View style={styles.drilldownMetricBox}>
                <Text style={styles.drilldownMetricLabel}>Transactions</Text>
                <Text style={styles.drilldownMetricValue}>14</Text>
              </View>
              <View style={styles.drilldownMetricBox}>
                <Text style={styles.drilldownMetricLabel}>Average</Text>
                <Text style={styles.drilldownMetricValue}>₹1,014</Text>
              </View>
              <View style={styles.drilldownMetricBox}>
                <Text style={styles.drilldownMetricLabel}>Biggest</Text>
                <Text style={styles.drilldownMetricValue}>₹4,200</Text>
              </View>
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
            <Text style={styles.goalsTitle}>November Budget Details</Text>
            <Text style={styles.goalsSubtitle}>
              You have set a monthly cap of ₹65,000. You've used ₹{totalExpenses.toLocaleString('en-IN')}{' '}
              ({budgetSpentPercent}%) with ₹{budgetRemaining.toLocaleString('en-IN')} remaining.
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F2F3F7',
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

  // Top Segmented Switcher (Overview | Insights)
  topSwitcherWrapper: {
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  topSwitcherPill: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 22,
    position: 'relative',
    height: 40,
    alignItems: 'center',
  },
  sliderIndicatorPill: {
    position: 'absolute',
    left: SWITCHER_PADDING,
    top: SWITCHER_PADDING,
    bottom: SWITCHER_PADDING,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
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
    color: '#64748B',
  },
  switcherOptionTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blueBadge,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.bluePrimary,
  },
  greetingBox: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
    backgroundColor: colors.navyDeep,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: colors.liquidGlassPill,
    shadowColor: '#01151E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  accentCircleOuter: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.bluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentCircleInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.navyDeep,
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
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 4,
  },
  actionCircleLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  actionCircleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },

  // Card Containers
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardActionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.bluePrimary,
  },
  dropdownBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dropdownBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  // Budget Card Elements
  budgetText: {
    marginBottom: 10,
  },
  budgetBold: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  budgetRegular: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
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
    color: '#64748B',
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
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#475569',
  },
  categoryCardAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
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
    borderBottomColor: '#F1F5F9',
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
    color: '#0F172A',
  },
  activityMetaText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  activityAmountText: {
    fontSize: 14.5,
    fontWeight: '700',
  },

  // Top Insight Card
  topInsightCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  topInsightIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topInsightContent: {
    flex: 1,
  },
  topInsightHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#854D0E',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  topInsightText: {
    fontSize: 13,
    color: '#713F12',
    lineHeight: 18,
    fontWeight: '500',
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
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  insightsSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRangePillContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  timeRangeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  timeRangeTabTextActive: {
    color: '#0F172A',
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
    color: '#0F172A',
  },
  totalSpentCard: {
    backgroundColor: colors.navyPrimary,
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1.2,
    borderColor: colors.liquidGlassPill,
    shadowColor: '#01151E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
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
    color: '#0F172A',
  },
  donutCenterLabel: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#64748B',
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
    color: '#334155',
  },
  donutLegendPercent: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
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
    color: '#1E293B',
  },
  insightsCatRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightsCatAmount: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  insightsCatPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    width: 32,
    textAlign: 'right',
  },

  // Drilldown Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  drilldownSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    color: '#0F172A',
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
    color: '#0F172A',
    marginBottom: 4,
  },
  drilldownTrend: {
    fontSize: 13,
    color: '#EA580C',
    fontWeight: '600',
  },
  drilldownBudgetCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  drilldownBudgetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  drilldownMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  drilldownMetricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  drilldownMetricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  drilldownMetricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  drilldownDoneBtn: {
    backgroundColor: colors.bluePrimary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  drilldownDoneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Goals Modal
  goalsSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 24,
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    width: '88%',
  },
  goalsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  goalsSubtitle: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 20,
  },
});

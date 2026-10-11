import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { colors } from '../theme/colors';
import { HomeHeader } from '../components/home/HomeHeader';
import {
  TotalExpensesHeroCard,
  ExpensePeriod,
} from '../components/home/TotalExpensesHeroCard';
import { RecentExpensesCard } from '../components/home/RecentExpensesCard';
import { SpendingOverviewCard } from '../components/home/SpendingOverviewCard';
import { AddExpenseModal } from '../components/expenses/AddExpenseModal';
import { ExpenseItem, mockMonthlyTrends } from '../data/mockData';
import { toast } from '../context/ToastContext';

interface HomeScreenProps {
  expenses: ExpenseItem[];
  userName?: string | null;
  onAddExpense?: (expense: Omit<ExpenseItem, 'id'>) => void;
  onOpenAddExpense?: () => void;
  onReplaySplash?: () => void;
  onScrollingChange?: (isScrolling: boolean) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  expenses,
  userName,
  onAddExpense,
  onOpenAddExpense,
  onReplaySplash,
  onScrollingChange,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ExpensePeriod>('This month');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const overviewCardYRef = useRef(0);
  const lastOffsetY = useRef(0);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic Total Spending calculated from actual expense records
  const totalSpent = useMemo(() => {
    return expenses
      .filter((e) => e.type === 'expense')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [expenses]);

  // Derived Monthly Trend Data with current month dynamically matched to total spending
  const dynamicMonthlyTrends = useMemo(() => {
    return mockMonthlyTrends.map((item, index) => {
      if (index === mockMonthlyTrends.length - 1) {
        return {
          ...item,
          amount: totalSpent > 0 ? totalSpent : item.amount,
          isCurrent: true,
        };
      }
      return item;
    });
  }, [totalSpent]);

  // Displayed recent transactions (top 5 by default, or all if toggled)
  const displayedExpenses = useMemo(() => {
    if (showAllExpenses) {
      return expenses;
    }
    return expenses.slice(0, 5);
  }, [expenses, showAllExpenses]);

  // Period cycle handler
  const handleCyclePeriod = useCallback(() => {
    setSelectedPeriod((prev) => {
      if (prev === 'This month') return 'This week';
      if (prev === 'This week') return 'All time';
      return 'This month';
    });
  }, []);

  const showBottomNav = useCallback(() => {
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    onScrollingChange?.(false);
  }, [onScrollingChange]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    showBottomNav();
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [showBottomNav]);

  React.useEffect(() => {
    return () => {
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const currentY = contentOffset.y;
    const diff = currentY - lastOffsetY.current;

    // Top / Pull-to-refresh zone: Keep bottom bar 100% visible
    if (currentY <= 20) {
      showBottomNav();
      lastOffsetY.current = currentY;
      return;
    }

    // Bottom reached: Make bottom bar visible
    const isAtBottom = currentY + layoutMeasurement.height >= contentSize.height - 40;
    if (isAtBottom) {
      showBottomNav();
      lastOffsetY.current = currentY;
      return;
    }

    // Scrolling down (towards top): Appear immediately
    if (diff < -6) {
      showBottomNav();
    }
    // Scrolling up: hide while scrolling, but reappear as soon as scroll finishes
    else if (diff > 8 && currentY > 50) {
      onScrollingChange?.(true);

      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = setTimeout(() => {
        onScrollingChange?.(false);
      }, 350);
    }

    lastOffsetY.current = currentY;
  };

  const handleScrollEndDrag = () => {
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    scrollIdleTimer.current = setTimeout(() => {
      onScrollingChange?.(false);
    }, 200);
  };

  const handleMomentumScrollEnd = () => {
    showBottomNav();
  };

  // Open Add Expense modal sheet
  const handleOpenAddExpense = useCallback(() => {
    setIsAddModalVisible(true);
  }, []);

  // Save new expense
  const handleSaveExpense = useCallback((newExpense: Omit<ExpenseItem, 'id'>) => {
    if (onAddExpense) {
      onAddExpense(newExpense);
    } else if (onOpenAddExpense) {
      onOpenAddExpense();
    }
  }, [onAddExpense, onOpenAddExpense]);

  // Scroll smoothly down to the Spending Overview chart
  const handleScrollToBreakdown = useCallback(() => {
    if (overviewCardYRef.current > 0) {
      scrollViewRef.current?.scrollTo({
        y: overviewCardYRef.current - 20,
        animated: true,
      });
    } else {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, []);

  const handleExportOrFilter = useCallback(() => {
    toast.info('Export report generated for current period.', 'Export Expenses');
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.navyPrimary, colors.bluePrimary]}
            tintColor={colors.navyPrimary}
          />
        }
      >
        {/* 1. Header: Artha logo, greeting, and notification/menu circular buttons */}
        <HomeHeader
          userName={userName}
          onLogoPress={onReplaySplash}
          onNotificationPress={() => toast.info('No new notifications.', 'Notifications')}
          onMenuPress={() => toast.info('Options menu coming soon.', 'Options')}
        />

        {/* 2. Main Balance Card (Hero Total Expenses Card with Radial Glow) */}
        <TotalExpensesHeroCard
          totalSpent={totalSpent}
          selectedPeriod={selectedPeriod}
          onPeriodPress={handleCyclePeriod}
          changePercent={-8.4}
          changeAmountDiff={-1286}
          onAddExpense={handleOpenAddExpense}
          onBreakdownPress={handleScrollToBreakdown}
          onExportPress={handleExportOrFilter}
        />

        {/* 3. Recent Transactions Section (Top Holdings inspired by Reference) */}
        <RecentExpensesCard
          expenses={displayedExpenses}
          onSeeAllPress={() => setShowAllExpenses((prev) => !prev)}
          onAddExpensePress={handleOpenAddExpense}
          onItemPress={(item) =>
            toast.info(
              `${item.merchant} • ₹${item.amount} via ${item.paymentMethod}`,
              item.category,
            )
          }
        />

        {/* 4. Spending Overview Dual-Tone Stacked Bar Chart */}
        <View
          onLayout={(event) => {
            overviewCardYRef.current = event.nativeEvent.layout.y;
          }}
        >
          <SpendingOverviewCard
            data={dynamicMonthlyTrends}
            title="Spending Overview"
            subtitle="Monthly breakdown"
          />
        </View>

        {/* Bottom spacer for floating navigation bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Lightweight Functional Expense Entry Flow Bottom Sheet */}
      <AddExpenseModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSave={handleSaveExpense}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bottomSpacer: {
    height: 100,
  },
});

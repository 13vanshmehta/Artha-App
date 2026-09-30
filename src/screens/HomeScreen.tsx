import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { AppHeader } from '../components/common/AppHeader';
import { HeroCard } from '../components/cards/HeroCard';
import { SummarySection } from '../components/cards/SummaryStatCard';
import { QuickActionsBar } from '../components/cards/QuickActionsBar';
import { DonutChart } from '../components/charts/DonutChart';
import { BarChart } from '../components/charts/BarChart';
import { DualToneExpenseCard } from '../components/cards/DualToneExpenseCard';
import { RecentExpensesContainer } from '../components/cards/RecentExpenseItem';
import { GroupsSection } from '../components/cards/GroupCard';
import {
  mockSummary,
  mockCategories,
  mockGroups,
  mockMonthlyTrends,
  ExpenseItem,
} from '../data/mockData';

interface HomeScreenProps {
  expenses: ExpenseItem[];
  onOpenAddExpense?: () => void;
  onReplaySplash?: () => void;
  onScrollingChange?: (isScrolling: boolean) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  expenses,
  onOpenAddExpense,
  onReplaySplash,
  onScrollingChange,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const lastOffsetY = useRef(0);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const featuredDualToneExpenses = expenses.slice(0, 2);
  const recentListExpenses = expenses.slice(0, 5);

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

    // Top / Pull-to-refresh zone: Keep bottom bar 100% sticky
    if (currentY <= 20) {
      showBottomNav();
      lastOffsetY.current = currentY;
      return;
    }

    // Scrolled to bottom: Immediately appear and stay visible
    const isAtBottom = currentY + layoutMeasurement.height >= contentSize.height - 40;
    if (isAtBottom) {
      showBottomNav();
      lastOffsetY.current = currentY;
      return;
    }

    // Scrolling down (towards top): Appear immediately and STICK!
    if (diff < -6) {
      showBottomNav();
    }
    // Scrolling up: hide while in active motion, but reappear as soon as scroll up is done
    else if (diff > 8 && currentY > 50) {
      onScrollingChange?.(true);

      // Reappear as soon as scrolling up finishes
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

  return (
    <View style={styles.screen}>
      <ScrollView
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
        {/* App Header: scrolls with content (not sticky), never blocks pull-to-refresh */}
        <AppHeader onLogoPress={onReplaySplash} />

        {/* 1. Hero Card */}
        <HeroCard
          totalSpent={mockSummary.totalSpent}
          periodLabel={mockSummary.periodLabel}
          changePercent={mockSummary.spentChangePercent}
          onAddExpense={onOpenAddExpense}
        />

        {/* 2. Monthly Summary Section */}
        <SummarySection
          income={mockSummary.income}
          expenses={mockSummary.expenses}
          remaining={mockSummary.remaining}
        />

        {/* 3. Quick Actions */}
        <QuickActionsBar onAddExpense={onOpenAddExpense} />

        {/* 4. Spending Breakdown Donut Chart */}
        <DonutChart
          categories={mockCategories}
          totalSpent={mockSummary.totalSpent}
        />

        {/* 5. Featured Dual-Tone Expense Cards */}
        <View style={styles.featuredSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Featured Transactions</Text>
              <Text style={styles.sectionSubtitle}>
                Recent high-impact expenses
              </Text>
            </View>
          </View>

          {featuredDualToneExpenses.map((exp) => (
            <DualToneExpenseCard key={exp.id} item={exp} />
          ))}
        </View>

        {/* 6. Recent Expenses List Container */}
        <RecentExpensesContainer expenses={recentListExpenses} />

        {/* 7. Collaborative Shared Groups */}
        <GroupsSection groups={mockGroups} />

        {/* 8. Monthly Trends Bar Chart */}
        <BarChart
          data={mockMonthlyTrends}
          title="Spending Trend"
          subtitle="Monthly analytics view"
          isDarkTheme={true}
        />

        {/* Bottom spacer for floating navigation bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  featuredSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navyPrimary,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  bottomSpacer: {
    height: 100,
  },
});

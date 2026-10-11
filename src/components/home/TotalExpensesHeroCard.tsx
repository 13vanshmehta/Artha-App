import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { Icon } from '../common/Icon';

export type ExpensePeriod = 'This month' | 'This week' | 'All time';

interface TotalExpensesHeroCardProps {
  totalSpent: number;
  selectedPeriod: ExpensePeriod;
  onPeriodPress?: () => void;
  changePercent?: number;
  changeAmountDiff?: number;
  onAddExpense?: () => void;
  onBreakdownPress?: () => void;
  onExportPress?: () => void;
}

export const TotalExpensesHeroCard: React.FC<TotalExpensesHeroCardProps> = React.memo(({
  totalSpent,
  selectedPeriod,
  onPeriodPress,
  changePercent = -8.4,
  changeAmountDiff = -1286,
  onAddExpense,
  onBreakdownPress,
  onExportPress,
}) => {
  const isDecrease = changePercent <= 0;
  const isZero = totalSpent === 0;

  // Split integer and decimals for reference styling
  const formattedWhole = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.floor(totalSpent));

  const diffWhole = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.abs(changeAmountDiff));

  return (
    <View style={styles.cardContainer}>
      {/* Reference radial electric-blue glow */}
      <View style={styles.radialGlowTopRight} />
      <View style={styles.radialGlowBottomLeft} />

      <View style={styles.innerContent}>
        {/* Header Row: Label & Period Selector */}
        <View style={styles.headerRow}>
          <Text style={styles.label}>Total Expenses</Text>
          <TouchableOpacity
            style={styles.periodPill}
            activeOpacity={0.75}
            onPress={onPeriodPress}
            accessibilityRole="button"
            accessibilityLabel={`Selected Period: ${selectedPeriod}`}
          >
            <Text style={styles.periodPillText}>{selectedPeriod}</Text>
            <Icon name="arrowDown" size={10} color={colors.textLightMuted} />
          </TouchableOpacity>
        </View>

        {/* Big Balance Amount Typography */}
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <Text style={styles.amountNumber}>{formattedWhole}</Text>
          <Text style={styles.amountDecimals}>.00</Text>
        </View>

        {/* Badges / Comparison Row matching Reference */}
        {!isZero ? (
          <View style={styles.pillsRow}>
            {/* Trend percentage badge */}
            <View
              style={[
                styles.badgePill,
                isDecrease ? styles.badgePositive : styles.badgeNegative,
              ]}
            >
              <Icon
                name={isDecrease ? 'trendDown' : 'trendUp'}
                size={12}
                color={isDecrease ? colors.positive : '#F87171'}
              />
              <Text
                style={[
                  styles.badgeText,
                  { color: isDecrease ? colors.positive : '#F87171' },
                ]}
              >
                {isDecrease ? '' : '+'}
                {changePercent.toFixed(1)}%
              </Text>
            </View>

            {/* Compared with previous period badge */}
            <View style={[styles.badgePill, styles.badgeNeutral]}>
              <Text style={styles.comparisonText}>
                {changeAmountDiff >= 0 ? `+₹${diffWhole}` : `-₹${diffWhole}`} vs last month
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.pillsRow}>
            <View style={[styles.badgePill, styles.badgeNeutral]}>
              <Text style={styles.comparisonText}>No expenses recorded yet</Text>
            </View>
          </View>
        )}

        {/* 3 Translucent Frosted Glass Quick Action Buttons */}
        <View style={styles.actionsRow}>
          {/* Action 1: Add Expense */}
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={onAddExpense}
            accessibilityRole="button"
            accessibilityLabel="Add Expense"
          >
            <View style={styles.actionIconCircle}>
              <Icon name="plus" size={15} color={colors.white} />
            </View>
            <Text style={styles.actionLabel}>Add Expense</Text>
          </TouchableOpacity>

          {/* Action 2: Categories / Breakdown */}
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={onBreakdownPress}
            accessibilityRole="button"
            accessibilityLabel="Spending Breakdown"
          >
            <View style={styles.actionIconCircle}>
              <Icon name="analytics" size={15} color={colors.white} />
            </View>
            <Text style={styles.actionLabel}>Breakdown</Text>
          </TouchableOpacity>

          {/* Action 3: Export / Filter */}
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={onExportPress}
            accessibilityRole="button"
            accessibilityLabel="Filter or Export"
          >
            <View style={styles.actionIconCircle}>
              <Icon name="arrowDown" size={15} color={colors.white} />
            </View>
            <Text style={styles.actionLabel}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    borderRadius: 28,
    backgroundColor: colors.navyDeep,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.22)',
    ...shadows.card,
  },
  radialGlowTopRight: {
    position: 'absolute',
    top: -55,
    right: -35,
    width: 220,
    height: 190,
    borderRadius: 110,
    backgroundColor: 'rgba(47, 109, 181, 0.45)',
  },
  radialGlowBottomLeft: {
    position: 'absolute',
    bottom: -45,
    left: -25,
    width: 150,
    height: 130,
    borderRadius: 75,
    backgroundColor: 'rgba(111, 181, 238, 0.12)',
  },
  innerContent: {
    padding: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 13.5,
    color: colors.textLightMuted,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  periodPillText: {
    fontSize: 11.5,
    color: colors.textLightMuted,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  currencySymbol: {
    fontSize: 27,
    fontWeight: '700',
    color: colors.blueBright,
    marginRight: 2,
  },
  amountNumber: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -1,
  },
  amountDecimals: {
    fontSize: 21,
    fontWeight: '600',
    color: colors.textLightSubtle,
    marginLeft: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: borderRadius.round,
    borderWidth: 1,
  },
  badgePositive: {
    backgroundColor: 'rgba(22, 163, 74, 0.18)',
    borderColor: 'rgba(22, 163, 74, 0.35)',
  },
  badgeNegative: {
    backgroundColor: 'rgba(220, 38, 38, 0.18)',
    borderColor: 'rgba(220, 38, 38, 0.35)',
  },
  badgeNeutral: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLightMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  actionIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(111, 181, 238, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 0.1,
  },
});

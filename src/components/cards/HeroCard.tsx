import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { Icon } from '../common/Icon';

interface HeroCardProps {
  totalSpent: number;
  periodLabel?: string;
  changePercent?: number;
  onAddExpense?: () => void;
  onScanReceipt?: () => void;
  onSplitExpense?: () => void;
}

const HeroCardComponent: React.FC<HeroCardProps> = ({
  totalSpent,
  periodLabel = 'This Month',
  changePercent = -8.4,
  onAddExpense,
  onScanReceipt,
  onSplitExpense,
}) => {
  const isDecrease = changePercent < 0;
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(totalSpent);

  return (
    <View style={styles.cardContainer}>
      {/* Background glow decorative shapes */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <View style={styles.content}>
        {/* Subtitle */}
        <Text style={styles.subtitle}>Total Spent</Text>

        {/* Amount */}
        <View style={styles.amountRow}>
          <Text style={styles.currencySymbol}>₹</Text>
          <Text style={styles.amountNumber}>{formattedAmount}</Text>
          <Text style={styles.amountDecimals}>.00</Text>
        </View>

        {/* Comparison Pills */}
        <View style={styles.pillsRow}>
          <View style={styles.trendPill}>
            <Icon
              name={isDecrease ? 'trendDown' : 'trendUp'}
              size={14}
              color={colors.positive}
            />
            <Text style={styles.trendText}>
              {Math.abs(changePercent)}% vs last month
            </Text>
          </View>

          <View style={styles.periodPill}>
            <Text style={styles.periodText}>{periodLabel}</Text>
          </View>
        </View>

        {/* Action Buttons row (inspired by Invest / Add Fund / Withdraw) */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={onAddExpense}
          >
            <View style={styles.actionIconWrapper}>
              <Icon name="plus" size={16} color={colors.white} />
            </View>
            <Text style={styles.actionText}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={onScanReceipt}
          >
            <View style={styles.actionIconWrapper}>
              <Icon name="scan" size={16} color={colors.white} />
            </View>
            <Text style={styles.actionText}>Scan Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={onSplitExpense}
          >
            <View style={styles.actionIconWrapper}>
              <Icon name="split" size={16} color={colors.white} />
            </View>
            <Text style={styles.actionText}>Split Expense</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.xxl,
    backgroundColor: colors.navyPrimary,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.25)',
    ...shadows.card,
  },
  glowTopRight: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 180,
    borderRadius: 100,
    backgroundColor: 'rgba(111, 181, 238, 0.35)',
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 160,
    height: 140,
    borderRadius: 80,
    backgroundColor: 'rgba(79, 158, 232, 0.15)',
  },
  content: {
    padding: spacing.xl,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLightMuted,
    fontWeight: '500',
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  currencySymbol: {
    fontSize: 28,
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
    fontSize: 22,
    fontWeight: '600',
    color: colors.textLightSubtle,
    marginLeft: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.round,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.positive,
  },
  periodPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLightMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  actionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(111, 181, 238, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },
});

export const HeroCard = React.memo(HeroCardComponent);

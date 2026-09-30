import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { formatCurrency } from '../../data/mockData';

interface SummarySectionProps {
  income: number;
  expenses: number;
  remaining: number;
}

const SummarySectionComponent: React.FC<SummarySectionProps> = ({
  income,
  expenses,
  remaining,
}) => {
  return (
    <View style={styles.container}>
      {/* Income Card */}
      <View style={[styles.card, styles.incomeCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
            <Icon name="arrowDown" size={12} color={colors.positive} />
          </View>
          <Text style={styles.cardLabel}>Income</Text>
        </View>
        <Text style={styles.amountText} numberOfLines={1} adjustsFontSizeToFit>
          {formatCurrency(income)}
        </Text>
      </View>

      {/* Expenses Card */}
      <View style={[styles.card, styles.expenseCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Icon name="arrowUp" size={12} color={colors.negative} />
          </View>
          <Text style={styles.cardLabel}>Expenses</Text>
        </View>
        <Text style={styles.amountText} numberOfLines={1} adjustsFontSizeToFit>
          {formatCurrency(expenses)}
        </Text>
      </View>

      {/* Remaining Card */}
      <View style={[styles.card, styles.remainingCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(111, 181, 238, 0.25)' }]}>
            <Icon name="wallet" size={12} color={colors.navyPrimary} />
          </View>
          <Text style={[styles.cardLabel, { color: colors.navyPrimary }]}>Remaining</Text>
        </View>
        <Text
          style={[styles.amountText, { color: colors.navyDeep, fontWeight: '800' }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatCurrency(remaining)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.xl,
    justifyContent: 'space-between',
    minHeight: 88,
    ...shadows.subtle,
  },
  incomeCard: {
    backgroundColor: colors.navyPrimary,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.2)',
  },
  expenseCard: {
    backgroundColor: colors.navySecondary,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.2)',
  },
  remainingCard: {
    backgroundColor: colors.blueLight,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLightMuted,
    letterSpacing: 0.2,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.3,
  },
});

export const SummarySection = React.memo(SummarySectionComponent);

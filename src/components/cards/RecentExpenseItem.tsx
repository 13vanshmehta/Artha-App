import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { ExpenseItem, formatCurrency } from '../../data/mockData';

interface RecentExpensesContainerProps {
  expenses: ExpenseItem[];
  onSeeAllPress?: () => void;
  onItemPress?: (item: ExpenseItem) => void;
}

const RecentExpensesContainerComponent: React.FC<RecentExpensesContainerProps> = ({
  expenses,
  onSeeAllPress,
  onItemPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Recent Expenses</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={onSeeAllPress}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <View style={styles.list}>
        {expenses.map((item, index) => {
          const isLast = index === expenses.length - 1;
          const initials = item.merchant
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          const isIncome = item.type === 'income';

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.itemRow, !isLast && styles.itemBorder]}
              activeOpacity={0.7}
              onPress={() => onItemPress?.(item)}
            >
              {/* Initials Avatar */}
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              {/* Merchant & Category */}
              <View style={styles.centerCol}>
                <Text style={styles.merchantText} numberOfLines={1}>
                  {item.merchant}
                </Text>
                <Text style={styles.categorySubText}>
                  {item.category} • {item.dateStr}
                </Text>
              </View>

              {/* Amount & Time */}
              <View style={styles.rightCol}>
                <Text
                  style={[
                    styles.amountText,
                    isIncome && { color: colors.positive },
                  ]}
                >
                  {isIncome ? '+' : '-'}
                  {formatCurrency(item.amount)}
                </Text>
                <Text style={styles.timeText}>{item.timeStr}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    backgroundColor: colors.navyPrimary,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(111, 181, 238, 0.35)',
    shadowColor: colors.navyDeep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.blueBright,
  },
  list: {
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(111, 181, 238, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.35)',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  centerCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  merchantText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  categorySubText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLightMuted,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textLightSubtle,
  },
});

export const RecentExpensesContainer = React.memo(RecentExpensesContainerComponent);


import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, shadows } from '../../theme/spacing';
import { ExpenseItem, formatCurrency } from '../../data/mockData';
import { Icon } from '../common/Icon';

interface RecentExpensesCardProps {
  expenses: ExpenseItem[];
  onSeeAllPress?: () => void;
  onItemPress?: (item: ExpenseItem) => void;
  onAddExpensePress?: () => void;
}

export const RecentExpensesCard: React.FC<RecentExpensesCardProps> = React.memo(({
  expenses,
  onSeeAllPress,
  onItemPress,
  onAddExpensePress,
}) => {
  const displayExpenses = expenses.slice(0, 5);
  const isEmpty = displayExpenses.length === 0;

  return (
    <View style={styles.cardContainer}>
      {/* Header Row matching Reference 'Top Holdings' */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Recent Expenses</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onSeeAllPress}
          accessibilityRole="button"
          accessibilityLabel="See All Expenses"
        >
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      {/* Expenses List */}
      {!isEmpty ? (
        <View style={styles.listContainer}>
          {displayExpenses.map((item, index) => {
            const isLast = index === displayExpenses.length - 1;

            // Generate 2-character uppercase initials for avatar circle
            const words = item.merchant.trim().split(/\s+/);
            const initials =
              words.length >= 2
                ? (words[0][0] + words[1][0]).toUpperCase()
                : item.merchant.slice(0, 2).toUpperCase();

            const isIncome = item.type === 'income';

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemRow, !isLast && styles.itemDivider]}
                activeOpacity={0.75}
                onPress={() => onItemPress?.(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.merchant}, ${item.amount} rupees`}
              >
                {/* Avatar Initial Circle */}
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>

                {/* Merchant & Category Info */}
                <View style={styles.merchantCol}>
                  <Text style={styles.merchantName} numberOfLines={1}>
                    {item.merchant.toUpperCase()}
                  </Text>
                  <Text style={styles.categorySubText} numberOfLines={1}>
                    {item.category.toUpperCase()} • {item.dateStr.toUpperCase()}
                  </Text>
                </View>

                {/* Amount & Subtitle Badge */}
                <View style={styles.amountCol}>
                  <Text
                    style={[
                      styles.amountText,
                      isIncome && styles.incomeAmountText,
                    ]}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(item.amount)}
                  </Text>

                  {/* Payment method or subtle green pill badge matching reference */}
                  <View style={styles.subBadgeRow}>
                    <Icon name="trendUp" size={10} color="#4ADE80" />
                    <Text style={styles.subBadgeText} numberOfLines={1}>
                      {item.paymentMethod.split('·')[0].trim()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Icon name="receipt" size={24} color={colors.textLightSubtle} />
          </View>
          <Text style={styles.emptyTitle}>No expenses recorded yet</Text>
          <Text style={styles.emptySubtitle}>
            Your recent transactions will appear here as you log spending.
          </Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            activeOpacity={0.8}
            onPress={onAddExpensePress}
            accessibilityRole="button"
            accessibilityLabel="Add Expense"
          >
            <Icon name="plus" size={14} color={colors.white} />
            <Text style={styles.emptyAddBtnText}>Add Expense</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    backgroundColor: colors.navyDeep,
    borderRadius: 26,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.22)',
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.blueBright,
  },
  listContainer: {
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(111, 181, 238, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitials: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.blueBright,
    letterSpacing: 0.5,
  },
  merchantCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  merchantName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  categorySubText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textLightSubtle,
    letterSpacing: 0.3,
  },
  amountCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  incomeAmountText: {
    color: colors.positive,
  },
  subBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  subBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#4ADE80',
    letterSpacing: 0.1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textLightSubtle,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: spacing.lg,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(111, 181, 238, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.45)',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  emptyAddBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.white,
  },
});

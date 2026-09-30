import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { ExpenseItem, formatCurrency } from '../../data/mockData';
import { Icon } from '../common/Icon';

interface DualToneExpenseCardProps {
  item: ExpenseItem;
  onPress?: () => void;
}

const DualToneExpenseCardComponent: React.FC<DualToneExpenseCardProps> = ({
  item,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.outerContainer}
      activeOpacity={0.88}
      onPress={onPress}
    >
      {/* Dark Navy Header Strip */}
      <View style={styles.headerStrip}>
        <View style={styles.headerLeft}>
          <Text style={styles.categoryTitle}>{item.category.toUpperCase()}</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.metaItem}>
            <Icon name="history" size={12} color={colors.textLightMuted} />
            <Text style={styles.metaText}>{item.timeStr}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{item.dateStr}</Text>
          </View>
        </View>
      </View>

      {/* Light Blue Card Body */}
      <View style={styles.innerBody}>
        {/* Merchant Name & Amount */}
        <View style={styles.merchantRow}>
          <Text style={styles.merchantName} numberOfLines={1}>
            {item.merchant}
          </Text>
          <Text style={styles.amountDisplay}>
            {formatCurrency(item.amount)}
          </Text>
        </View>

        {/* Chips & Tags */}
        <View style={styles.chipsRow}>
          <View style={styles.paymentChip}>
            <Text style={styles.paymentText}>{item.paymentMethod}</Text>
          </View>

          {item.notes ? (
            <View style={styles.notesChip}>
              <Text style={styles.notesText} numberOfLines={1}>
                {item.notes}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Card Footer Line */}
        <View style={styles.cardFooter}>
          <Text style={styles.footerLabel}>
            Category: <Text style={styles.footerValue}>{item.category}</Text>
          </Text>
          {item.group ? (
            <View style={styles.groupBadge}>
              <Text style={styles.groupText}>{item.group}</Text>
            </View>
          ) : (
            <Text style={styles.footerStatus}>Verified</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.navyPrimary,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.25)',
    ...shadows.card,
  },
  headerStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.blueBright,
    letterSpacing: 0.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaDot: {
    color: colors.textLightMuted,
    fontSize: 12,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textLightMuted,
  },
  innerBody: {
    backgroundColor: colors.blueSoftCard,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  merchantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navyDeep,
    flex: 1,
    marginRight: spacing.md,
    letterSpacing: -0.3,
  },
  amountDisplay: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.navyDeep,
    letterSpacing: -0.4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  paymentChip: {
    backgroundColor: 'rgba(7, 31, 70, 0.08)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(7, 31, 70, 0.1)',
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navyPrimary,
  },
  notesChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    maxWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  notesText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navyDeep,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(10, 40, 85, 0.08)',
  },
  footerLabel: {
    fontSize: 12,
    color: colors.navySecondary,
    fontWeight: '500',
  },
  footerValue: {
    fontWeight: '700',
    color: colors.navyDeep,
  },
  groupBadge: {
    backgroundColor: colors.navyPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs + 2,
  },
  groupText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  footerStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navyPrimary,
  },
});

export const DualToneExpenseCard = React.memo(DualToneExpenseCardComponent);


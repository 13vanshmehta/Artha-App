import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { CategoryBreakdown, formatCurrency } from '../../data/mockData';
import { Icon, IconName } from '../common/Icon';

interface DonutChartProps {
  categories: CategoryBreakdown[];
  totalSpent: number;
}

const DonutChartComponent: React.FC<DonutChartProps> = ({
  categories,
  totalSpent,
}) => {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const activeCategory = selectedCatId
    ? categories.find((c) => c.id === selectedCatId)
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Spending Breakdown</Text>
        <Text style={styles.periodBadge}>This Month</Text>
      </View>

      {/* Category Filter Pills on Top (inspired by Phone 2 in reference) */}
      <View style={styles.pillsScroll}>
        {categories.map((cat) => {
          const isSelected = selectedCatId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryPill,
                isSelected && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCatId(isSelected ? null : cat.id)}
              activeOpacity={0.7}
            >
              <Icon
                name={cat.iconName as IconName}
                size={14}
                color={isSelected ? colors.white : colors.navyPrimary}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  isSelected && styles.categoryPillTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Donut Visualization */}
      <View style={styles.chartWrapper}>
        <View style={styles.donutOuterRing}>
          {/* Segment 1: Bills (Navy Dark) */}
          <View style={[styles.ringSegment, styles.segmentNavy]} />
          {/* Segment 2: Food (Medium Blue) */}
          <View style={[styles.ringSegment, styles.segmentMediumBlue]} />
          {/* Segment 3: Shopping (Bright Blue) */}
          <View style={[styles.ringSegment, styles.segmentBrightBlue]} />
          {/* Segment 4: Other / Travel (Light Blue) */}
          <View style={[styles.ringSegment, styles.segmentLightBlue]} />

          {/* Inner Hole */}
          <View style={styles.donutInnerHole}>
            <Text style={styles.centerAmount}>
              {activeCategory
                ? formatCurrency(activeCategory.amount)
                : formatCurrency(totalSpent)}
            </Text>
            <Text style={styles.centerLabel}>
              {activeCategory ? activeCategory.name : 'Total Spent'}
            </Text>
            {activeCategory && (
              <View style={styles.percentBadge}>
                <Text style={styles.percentText}>{activeCategory.percentage}%</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Category List Cards below */}
      <View style={styles.breakdownList}>
        {categories.map((cat) => {
          const isSelected = selectedCatId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.breakdownRow,
                isSelected && styles.breakdownRowActive,
              ]}
              onPress={() => setSelectedCatId(isSelected ? null : cat.id)}
              activeOpacity={0.7}
            >
              <View style={styles.leftInfo}>
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: cat.color },
                  ]}
                />
                <Text style={styles.catName}>{cat.name}</Text>
              </View>

              <View style={styles.rightInfo}>
                <Text style={styles.catAmount}>{formatCurrency(cat.amount)}</Text>
                <Text style={styles.catPercent}>{cat.percentage}%</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const RING_SIZE = 190;
const HOLE_SIZE = 126;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.25)',
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navyPrimary,
    letterSpacing: -0.3,
  },
  periodBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  pillsScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.round,
    gap: 4,
  },
  categoryPillActive: {
    backgroundColor: colors.navyPrimary,
    borderColor: colors.navyPrimary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navyPrimary,
  },
  categoryPillTextActive: {
    color: colors.white,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  donutOuterRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.bluePale,
  },
  ringSegment: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
  },
  segmentNavy: {
    backgroundColor: colors.navyPrimary,
    transform: [{ rotate: '0deg' }],
  },
  segmentMediumBlue: {
    backgroundColor: colors.bluePrimary,
    width: RING_SIZE * 0.75,
    height: RING_SIZE * 0.75,
    top: -10,
    right: -10,
    borderRadius: (RING_SIZE * 0.75) / 2,
  },
  segmentBrightBlue: {
    backgroundColor: colors.blueBright,
    width: RING_SIZE * 0.55,
    height: RING_SIZE * 0.55,
    bottom: -10,
    left: -10,
    borderRadius: (RING_SIZE * 0.55) / 2,
  },
  segmentLightBlue: {
    backgroundColor: colors.blueLight,
    width: RING_SIZE * 0.45,
    height: RING_SIZE * 0.45,
    top: 20,
    left: -5,
    borderRadius: (RING_SIZE * 0.45) / 2,
  },
  donutInnerHole: {
    width: HOLE_SIZE,
    height: HOLE_SIZE,
    borderRadius: HOLE_SIZE / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: colors.navyDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  centerAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navyPrimary,
    letterSpacing: -0.5,
  },
  centerLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
  },
  percentBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
    marginTop: 4,
  },
  percentText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.bluePrimary,
  },
  breakdownList: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  breakdownRowActive: {
    backgroundColor: colors.background,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navyPrimary,
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  catAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  catPercent: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    width: 32,
    textAlign: 'right',
  },
});

export const DonutChart = React.memo(DonutChartComponent);


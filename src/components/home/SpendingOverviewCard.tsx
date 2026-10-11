import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, shadows } from '../../theme/spacing';
import { MonthlyBarData } from '../../data/mockData';

interface SpendingOverviewCardProps {
  data: MonthlyBarData[];
  title?: string;
  subtitle?: string;
}

export const SpendingOverviewCard: React.FC<SpendingOverviewCardProps> = React.memo(({
  data,
  title = 'Spending Overview',
  subtitle,
}) => {
  const hasData = data.length > 0 && data.some((d) => d.amount > 0);
  const maxAmount = Math.max(...data.map((d) => d.amount), 50000);
  const avgAmount = hasData
    ? Math.round(data.reduce((sum, d) => sum + d.amount, 0) / data.length)
    : 0;

  // Format amount in 'k' notation for axis ticks
  const formatK = (val: number) => {
    if (val >= 1000) {
      return `₹${(val / 1000).toFixed(0)}k`;
    }
    return `₹${val}`;
  };

  const tick1 = Math.round(maxAmount);
  const tick2 = Math.round(maxAmount * 0.66);
  const tick3 = Math.round(maxAmount * 0.33);

  const displayBars = data.slice(-6);

  return (
    <View style={styles.cardContainer}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {hasData && (
          <View style={styles.avgBadge}>
            <Text style={styles.avgBadgeText}>Avg {formatK(avgAmount)}</Text>
          </View>
        )}
      </View>

      {/* Chart Layout: Bars track + Right Y-axis scale */}
      <View style={styles.chartWrapper}>
        {/* Horizontal Dotted Gridlines matching Reference */}
        <View style={styles.gridLinesContainer}>
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
        </View>

        {/* Right Y-Axis Scale Labels */}
        <View style={styles.yAxisScale}>
          <Text style={styles.scaleText}>{formatK(tick1)}</Text>
          <Text style={styles.scaleText}>{formatK(tick2)}</Text>
          <Text style={styles.scaleText}>{formatK(tick3)}</Text>
          <Text style={styles.scaleText}>₹0</Text>
        </View>

        {/* Bars Container */}
        <View style={styles.barsContainer}>
          {hasData ? (
            displayBars.map((item, index) => {
              const totalRatio = Math.min(1, item.amount / maxAmount);
              const barHeightPct = Math.max(8, Math.round(totalRatio * 100));

              // Dual-tone split ratio: Lower primary solid blue, upper translucent slate
              const isCurrent = item.isCurrent || index === displayBars.length - 1;
              const primaryHeightRatio = 0.65; // 65% solid blue, 35% translucent slate cap

              return (
                <View key={item.month} style={styles.barCol}>
                  <View style={styles.trackArea}>
                    <View
                      style={[
                        styles.stackedBar,
                        { height: `${barHeightPct}%` },
                      ]}
                    >
                      {/* Upper translucent slate portion */}
                      <View style={styles.barUpperSlate} />

                      {/* Lower vibrant cyan/blue portion */}
                      <View
                        style={[
                          styles.barLowerCyan,
                          {
                            height: `${primaryHeightRatio * 100}%`,
                            backgroundColor: isCurrent ? colors.blueBright : '#3B8FD9',
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Month Label */}
                  <Text
                    style={[
                      styles.monthLabel,
                      isCurrent && styles.monthLabelActive,
                    ]}
                  >
                    {item.month.toUpperCase()}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyChartState}>
              <Text style={styles.emptyChartText}>
                No spending trend data yet
              </Text>
              <Text style={styles.emptyChartSubText}>
                Transactions will populate this monthly breakdown
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    borderRadius: 26,
    backgroundColor: colors.navyDeep,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.22)',
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textLightSubtle,
    marginTop: 2,
  },
  avgBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  avgBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textLightMuted,
  },
  chartWrapper: {
    height: 165,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  gridLinesContainer: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 48,
    bottom: 24,
    justifyContent: 'space-between',
  },
  gridLine: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    borderStyle: 'dashed',
  },
  yAxisScale: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 24,
    width: 44,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  scaleText: {
    fontSize: 10,
    color: colors.textLightSubtle,
    fontWeight: '500',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginRight: 50,
    height: '100%',
    alignItems: 'flex-end',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  trackArea: {
    height: 130,
    width: 22,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  stackedBar: {
    width: 18,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'flex-end',
  },
  barUpperSlate: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  barLowerCyan: {
    width: '100%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  monthLabel: {
    fontSize: 10.5,
    color: colors.textLightSubtle,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  monthLabelActive: {
    color: colors.blueBright,
    fontWeight: '700',
  },
  emptyChartState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  emptyChartText: {
    fontSize: 13,
    color: colors.textLightMuted,
    fontWeight: '600',
  },
  emptyChartSubText: {
    fontSize: 11,
    color: colors.textLightSubtle,
    marginTop: 4,
  },
});

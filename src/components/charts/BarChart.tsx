import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { MonthlyBarData } from '../../data/mockData';

interface BarChartProps {
  data: MonthlyBarData[];
  title?: string;
  subtitle?: string;
  isDarkTheme?: boolean;
}

const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  title = 'Monthly Spending',
  subtitle = 'Last 6-9 months',
  isDarkTheme = true,
}) => {
  const maxAmount = Math.max(...data.map((d) => d.amount), 55000);
  const cardBg = isDarkTheme ? colors.navyPrimary : colors.white;
  const textColor = isDarkTheme ? colors.white : colors.navyPrimary;
  const subtitleColor = isDarkTheme ? colors.textLightMuted : colors.textMuted;
  const gridLineColor = isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(10, 40, 85, 0.06)';

  return (
    <View style={[styles.container, { backgroundColor: cardBg }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Avg ₹43.2k</Text>
        </View>
      </View>

      {/* Grid Lines + Chart Area */}
      <View style={styles.chartArea}>
        {/* Horizontal grid lines */}
        <View style={styles.gridLinesContainer}>
          <View style={[styles.gridLine, { borderColor: gridLineColor }]} />
          <View style={[styles.gridLine, { borderColor: gridLineColor }]} />
          <View style={[styles.gridLine, { borderColor: gridLineColor }]} />
        </View>

        {/* Bars Container */}
        <View style={styles.barsRow}>
          {data.slice(-7).map((item, index) => {
            const heightPercent = Math.min(100, Math.round((item.amount / maxAmount) * 100));
            const isCurrent = item.isCurrent || index === data.slice(-7).length - 1;

            return (
              <View key={item.month} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${heightPercent}%`,
                        backgroundColor: isCurrent ? colors.blueBright : 'rgba(111, 181, 238, 0.45)',
                      },
                    ]}
                  >
                    {/* Top highlight cap */}
                    <View
                      style={[
                        styles.barTopCap,
                        { backgroundColor: isCurrent ? colors.white : colors.blueLight },
                      ]}
                    />
                  </View>
                </View>
                <Text
                  style={[
                    styles.monthLabel,
                    {
                      color: isCurrent ? colors.blueBright : subtitleColor,
                      fontWeight: isCurrent ? '700' : '500',
                    },
                  ]}
                >
                  {item.month.toUpperCase()}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.25)',
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'rgba(111, 181, 238, 0.2)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.3)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.blueBright,
  },
  chartArea: {
    height: 150,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  gridLinesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 24,
    justifyContent: 'space-between',
  },
  gridLine: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    width: '100%',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    paddingBottom: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: 22,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  barTopCap: {
    height: 3,
    width: '100%',
  },
  monthLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

export const BarChart = React.memo(BarChartComponent);


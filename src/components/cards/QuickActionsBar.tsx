import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { Icon, IconName } from '../common/Icon';

interface QuickActionItem {
  id: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  accentColor?: string;
}

interface QuickActionsBarProps {
  onAddExpense?: () => void;
  onScanReceipt?: () => void;
  onAddIncome?: () => void;
  onTransfer?: () => void;
  onSplitBill?: () => void;
}

const QuickActionsBarComponent: React.FC<QuickActionsBarProps> = ({
  onAddExpense,
  onScanReceipt,
  onAddIncome,
  onTransfer,
  onSplitBill,
}) => {
  const actions: QuickActionItem[] = [
    { id: '1', label: 'Add Expense', icon: 'plus', onPress: () => onAddExpense?.(), accentColor: colors.blueBright },
    { id: '2', label: 'Scan Receipt', icon: 'scan', onPress: () => onScanReceipt?.(), accentColor: colors.bluePrimary },
    { id: '3', label: 'Add Income', icon: 'income', onPress: () => onAddIncome?.(), accentColor: colors.positive },
    { id: '4', label: 'Transfer', icon: 'wallet', onPress: () => onTransfer?.(), accentColor: colors.blueSoftCard },
    { id: '5', label: 'Split Bill', icon: 'split', onPress: () => onSplitBill?.(), accentColor: colors.warning },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {actions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.actionCard}
            activeOpacity={0.75}
            onPress={item.onPress}
          >
            <View style={[styles.iconWrapper, { backgroundColor: colors.navyPrimary }]}>
              <Icon name={item.icon} size={18} color={item.accentColor || colors.white} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navyPrimary,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    width: 96,
    borderWidth: 1.2,
    borderColor: 'rgba(111, 181, 238, 0.28)',
    shadowColor: colors.navyDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    shadowColor: colors.navyDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.navyDeep,
    textAlign: 'center',
  },
});

export const QuickActionsBar = React.memo(QuickActionsBarComponent);


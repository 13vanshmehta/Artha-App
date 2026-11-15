import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { AppIcon } from '../components/icons/AppIcon';
import { getCategoryIconConfig } from '../components/icons/categoryIcons';
import { ExpenseItem } from '../data/mockData';
import { colors } from '../theme/colors';
import { toast } from '../context/ToastContext';
import { alert } from '../context/AlertContext';
import { useTheme } from '../context/ThemeContext';

interface TrackerScreenProps {
  expenses: ExpenseItem[];
  onRefresh?: () => Promise<void> | void;
  onScrollingChange?: (isScrolling: boolean) => void;
  onOpenAddTransaction?: (type?: 'expense' | 'income') => void;
  onEditTransaction?: (item: ExpenseItem) => void;
  onDeleteTransaction?: (id: string) => Promise<void> | void;
}

const FILTER_TAGS = [
  'All',
  'Expenses',
  'Income',
  'Food & Dining',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health & Wellness',
];

export const TrackerScreen: React.FC<TrackerScreenProps> = ({
  expenses,
  onRefresh,
  onScrollingChange,
  onOpenAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const { isDark, colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors, isDark), [themeColors, isDark]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentMonth] = useState('November 2026');

  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOffsetY = useRef(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBottomNav = useCallback(() => {
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    onScrollingChange?.(false);
  }, [onScrollingChange]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    showBottomNav();
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        setRefreshing(false);
      }, 500);
    }
  }, [onRefresh, showBottomNav]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const currentY = contentOffset.y;
    const diff = currentY - lastOffsetY.current;

    if (currentY <= 20) {
      showBottomNav();
      lastOffsetY.current = currentY;
      return;
    }

    if (diff < -6) {
      showBottomNav();
    } else if (diff > 8 && currentY > 50) {
      onScrollingChange?.(true);
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = setTimeout(() => {
        onScrollingChange?.(false);
      }, 350);
    }

    lastOffsetY.current = currentY;
  };

  // Calculate Overview Totals
  const { totalIncome, totalExpenses, netSavings } = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;

    expenses.forEach((item) => {
      if (item.type === 'income') {
        incomeSum += item.amount;
      } else {
        expenseSum += item.amount;
      }
    });

    const baselineIncome = incomeSum > 0 ? incomeSum : 120000;
    const baselineExpenses = expenseSum > 0 ? expenseSum : 35500;

    return {
      totalIncome: baselineIncome,
      totalExpenses: baselineExpenses,
      netSavings: baselineIncome - baselineExpenses, // ₹84,500
    };
  }, [expenses]);

  // Filter & Search Transactions
  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return expenses.filter((item) => {
      // Filter by Type / Category tag
      if (activeFilter === 'Expenses' && item.type !== 'expense') return false;
      if (activeFilter === 'Income' && item.type !== 'income') return false;
      if (
        activeFilter !== 'All' &&
        activeFilter !== 'Expenses' &&
        activeFilter !== 'Income' &&
        item.category !== activeFilter
      ) {
        return false;
      }

      // Filter by Search Query
      if (query.length > 0) {
        const matchMerchant = (item.merchant || '').toLowerCase().includes(query);
        const matchCategory = (item.category || '').toLowerCase().includes(query);
        const matchNotes = (item.notes || '').toLowerCase().includes(query);
        return matchMerchant || matchCategory || matchNotes;
      }

      return true;
    });
  }, [expenses, activeFilter, searchQuery]);

  // Group by Date
  const groupedTransactions = useMemo(() => {
    const groups: { title: string; data: ExpenseItem[] }[] = [];
    const map = new Map<string, ExpenseItem[]>();

    filteredTransactions.forEach((item) => {
      const groupKey = item.dateGroup || item.dateStr || 'Recent';
      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(item);
    });

    map.forEach((items, key) => {
      groups.push({ title: key, data: items });
    });

    return groups;
  }, [filteredTransactions]);

  const handleDelete = async (id: string, merchant: string) => {
    const confirmed = await alert.confirm({
      title: 'Delete Transaction',
      message: `Are you sure you want to delete the transaction for "${merchant}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'Trash2',
    });
    if (!confirmed) return;
    if (onDeleteTransaction) {
      await onDeleteTransaction(id);
    } else {
      toast.info(`Deleted ${merchant}.`, 'Transaction Removed');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.heroGradientStart, colors.bluePrimary]}
            tintColor={colors.bluePrimary}
          />
        }
      >
        {/* ======================================================== */}
        {/* 1. TOP HEADER & MONTH SELECTOR                           */}
        {/* ======================================================== */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerCaption}>PERSONAL FINANCE</Text>
            <Text style={styles.headerTitle}>PE Tracker</Text>
          </View>

          <View style={styles.monthPill}>
            <Text style={styles.monthPillText}>{currentMonth}</Text>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 2. OVERVIEW FINANCIAL SUMMARY STRIP                      */}
        {/* ======================================================== */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
              +₹{totalIncome.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={[styles.summaryValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
              -₹{totalExpenses.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>Net Savings</Text>
            <Text style={[styles.summaryValue, { color: colors.bluePrimary }]}>
              ₹{netSavings.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 3. SEARCH BAR & ADD TRANSACTION BUTTON                   */}
        {/* ======================================================== */}
        <View style={styles.actionRow}>
          <View style={styles.searchBar}>
            <AppIcon name="Search" size={17} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search merchant, category, notes..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppIcon name="X" size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.85}
            onPress={() => onOpenAddTransaction?.('expense')}
          >
            <AppIcon name="Plus" size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* 4. FILTER PILLS CAROUSEL                                 */}
        {/* ======================================================== */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {FILTER_TAGS.map((tag) => {
            const isSelected = activeFilter === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillSelected,
                ]}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(tag)}
              >
                <Text
                  style={[
                    styles.filterText,
                    isSelected && styles.filterTextSelected,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ======================================================== */}
        {/* 5. TRANSACTIONS GROUPED LIST                             */}
        {/* ======================================================== */}
        {groupedTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="ReceiptText" size={28} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No transactions found</Text>
            <Text style={styles.emptySub}>
              {searchQuery.length > 0 || activeFilter !== 'All'
                ? 'Try adjusting your search terms or filters.'
                : 'Start tracking your expenses and understand where your money goes.'}
            </Text>

            <TouchableOpacity
              style={styles.emptyActionBtn}
              activeOpacity={0.85}
              onPress={() => onOpenAddTransaction?.('expense')}
            >
              <Text style={styles.emptyActionBtnText}>Log First Expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.groupsContainer}>
            {groupedTransactions.map((group) => (
              <View key={group.title} style={styles.dateGroupCard}>
                <Text style={styles.dateGroupTitle}>{group.title}</Text>

                {group.data.map((item, idx) => {
                  const catConfig = getCategoryIconConfig(item.category, isDark);
                  const isIncome = item.type === 'income';

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.transactionRow,
                        idx === group.data.length - 1 && { borderBottomWidth: 0 },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => onEditTransaction?.(item)}
                    >
                      <View
                        style={[
                          styles.catIconCircle,
                          { backgroundColor: catConfig.backgroundColor },
                        ]}
                      >
                        <AppIcon
                          name={catConfig.iconName}
                          size={18}
                          color={catConfig.iconColor}
                        />
                      </View>

                      <View style={styles.txMain}>
                        <Text style={styles.txMerchant}>{item.merchant}</Text>
                        <Text style={styles.txMeta}>
                          {item.timeStr} · {item.paymentMethod}
                          {item.notes ? ` · "${item.notes}"` : ''}
                        </Text>
                      </View>

                      <View style={styles.txRight}>
                        <Text
                          style={[
                            styles.txAmount,
                            isIncome ? styles.txAmountIncome : styles.txAmountExpense,
                          ]}
                        >
                          {isIncome
                            ? `+₹${item.amount.toLocaleString('en-IN')}`
                            : `-₹${item.amount.toLocaleString('en-IN')}`}
                        </Text>
                        <TouchableOpacity
                          style={styles.trashBtn}
                          onPress={() => handleDelete(item.id, item.merchant)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <AppIcon name="Trash2" size={13} color="#94A3B8" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const createStyles = (themeColors: typeof colors, isDark: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: isDark ? '#000000' : '#F2F3F7',
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerCaption: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#A1A1AA' : colors.textSecondary,
      letterSpacing: 1.1,
      marginBottom: 3,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '900',
      color: isDark ? '#FFFFFF' : '#0F172A',
      letterSpacing: -0.6,
    },
    monthPill: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    monthPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : colors.textSecondary,
    },
    summaryCard: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      marginBottom: 16,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.04,
      shadowRadius: 6,
      elevation: isDark ? 0 : 2,
    },
    summaryColumn: {
      flex: 1,
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B',
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 14.5,
      fontWeight: '800',
    },
    summaryDivider: {
      width: 1,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#F1F5F9',
      marginVertical: 4,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderRadius: 16,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      gap: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 13,
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bluePrimary,
      paddingHorizontal: 16,
      borderRadius: 16,
      gap: 6,
    },
    addBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#000000' : '#FFFFFF',
    },
    filtersScroll: {
      gap: 8,
      paddingBottom: 16,
    },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 14,
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    },
    filterPillSelected: {
      backgroundColor: isDark ? '#F58A07' : colors.navyPrimary,
      borderColor: isDark ? '#F58A07' : colors.navyPrimary,
    },
    filterText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B',
    },
    filterTextSelected: {
      color: isDark ? '#000000' : '#FFFFFF',
      fontWeight: '700',
    },
    groupsContainer: {
      gap: 14,
    },
    dateGroupCard: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.03,
      shadowRadius: 6,
      elevation: isDark ? 0 : 1,
    },
    dateGroupTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    transactionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
    },
    catIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    txMain: {
      flex: 1,
      marginLeft: 12,
    },
    txMerchant: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    txMeta: {
      fontSize: 11.5,
      color: isDark ? 'rgba(255, 255, 255, 0.42)' : '#64748B',
      marginTop: 2,
    },
    txRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    txAmount: {
      fontSize: 14.5,
      fontWeight: '800',
    },
    txAmountIncome: {
      color: '#16A34A',
    },
    txAmountExpense: {
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    trashBtn: {
      padding: 2,
    },
    emptyContainer: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderRadius: 20,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      marginTop: 10,
    },
    emptyIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: isDark ? '#000000' : '#F1F5F9',
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 6,
    },
    emptySub: {
      fontSize: 13,
      color: isDark ? '#A1A1AA' : '#64748B',
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 20,
    },
    emptyActionBtn: {
      backgroundColor: colors.bluePrimary,
      paddingHorizontal: 22,
      paddingVertical: 11,
      borderRadius: 16,
    },
    emptyActionBtnText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    bottomSpacer: {
      height: 100,
    },
  });

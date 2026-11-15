import React, { useState, useMemo, useCallback, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { AppIcon } from '../components/icons/AppIcon';
import { getCategoryIconConfig } from '../components/icons/categoryIcons';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { toast } from '../context/ToastContext';
import { alert } from '../context/AlertContext';
import {
  Account,
  AnalyticsPeriod,
  Transaction,
  TransactionFilters,
  TransactionType,
} from '../api/types';
import { transactionsApi } from '../api/transactions';
import { analyticsApi } from '../api/analytics';
import { accountsApi } from '../api/accounts';
import { queryClient } from '../state/queryClient';
import { formatTransactionTime, getIndianFinancialYear } from '../utils/date';

interface HistoryScreenProps {
  onClose?: () => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onDuplicateTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string, merchant?: string) => Promise<void> | void;
}

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: AnalyticsPeriod.DAY, label: 'Day' },
  { key: AnalyticsPeriod.WEEK, label: 'Week' },
  { key: AnalyticsPeriod.MONTH, label: 'Month' },
  { key: AnalyticsPeriod.QUARTER, label: 'Quarter' },
  { key: AnalyticsPeriod.HALF_YEAR, label: 'Half-Year' },
  { key: AnalyticsPeriod.YEAR, label: 'Year' },
  { key: AnalyticsPeriod.CUSTOM, label: 'Custom' },
];

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onClose,
  onEditTransaction,
  onDuplicateTransaction,
  onDeleteTransaction,
}) => {
  const { isDark, colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors, isDark), [themeColors, isDark]);
  const insets = useContext(SafeAreaInsetsContext);
  const topPadding = Math.max(insets?.top ?? 0, Platform.OS === 'ios' ? 44 : 24);

  // Tab: 'history' vs 'insights'
  const [activeTab, setActiveTab] = useState<'history' | 'insights'>('history');

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | undefined>(undefined);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>(undefined);
  const [selectedSort, setSelectedSort] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Accounts list for filters
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Period / Date State for Insights
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>(AnalyticsPeriod.MONTH);
  const [periodDateOffset, setPeriodDateOffset] = useState<number>(0);

  // Transactions State (Cursor Pagination)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Analytics State
  const [summaryData, setSummaryData] = useState<any>(null);
  const [chartsData, setChartsData] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Search Debouncing
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(text.trim());
    }, 350);
  };

  // Fetch Accounts for filter options
  useEffect(() => {
    accountsApi.getAccounts().then(setAccounts).catch(() => {});
  }, []);

  // Fetch Transactions List (Initial or Filter Change)
  const fetchTransactionsList = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoadingInitial(true);
      }
      setTxError(null);

      try {
        const filters: TransactionFilters = {
          limit: 20,
          search: debouncedSearch || undefined,
          type: selectedType,
          accountId: selectedAccountId,
          paymentMethod: selectedPaymentMethod,
          sort: selectedSort,
        };

        const res = await transactionsApi.getTransactions(filters);
        setTransactions(res.items || []);
        setNextCursor(res.nextCursor || null);
        setHasMore(Boolean(res.hasMore));
      } catch (err: any) {
        setTxError(err.message || 'Unable to load transactions.');
      } finally {
        setIsLoadingInitial(false);
        setIsRefreshing(false);
      }
    },
    [debouncedSearch, selectedType, selectedAccountId, selectedPaymentMethod, selectedSort],
  );

  // Reset & re-fetch when filters change
  useEffect(() => {
    fetchTransactionsList();
  }, [fetchTransactionsList]);

  // Load Next Page (Cursor Pagination)
  const handleLoadMore = async () => {
    if (!hasMore || !nextCursor || isLoadingMore || isLoadingInitial) return;

    setIsLoadingMore(true);
    try {
      const filters: TransactionFilters = {
        limit: 20,
        cursor: nextCursor,
        search: debouncedSearch || undefined,
        type: selectedType,
        accountId: selectedAccountId,
        paymentMethod: selectedPaymentMethod,
        sort: selectedSort,
      };

      const res = await transactionsApi.getTransactions(filters);
      setTransactions((prev) => {
        // Prevent duplicate items
        const existingIds = new Set(prev.map((t) => t.id));
        const newItems = (res.items || []).filter((t) => !existingIds.has(t.id));
        return [...prev, ...newItems];
      });
      setNextCursor(res.nextCursor || null);
      setHasMore(Boolean(res.hasMore));
    } catch {
      // Keep existing items intact
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch Analytics Data
  const fetchAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      // Calculate target date based on offset
      const targetDate = new Date();
      if (selectedPeriod === AnalyticsPeriod.MONTH) {
        targetDate.setMonth(targetDate.getMonth() + periodDateOffset);
      } else if (selectedPeriod === AnalyticsPeriod.YEAR) {
        targetDate.setFullYear(targetDate.getFullYear() + periodDateOffset);
      } else if (selectedPeriod === AnalyticsPeriod.WEEK) {
        targetDate.setDate(targetDate.getDate() + periodDateOffset * 7);
      } else if (selectedPeriod === AnalyticsPeriod.DAY) {
        targetDate.setDate(targetDate.getDate() + periodDateOffset);
      }

      const dateStr = targetDate.toISOString().split('T')[0];
      const [sumRes, chartRes] = await Promise.allSettled([
        analyticsApi.getSummary({ period: selectedPeriod, date: dateStr }),
        analyticsApi.getCharts({ period: selectedPeriod, date: dateStr }),
      ]);

      if (sumRes.status === 'fulfilled') {
        setSummaryData(sumRes.value);
      }
      if (chartRes.status === 'fulfilled') {
        setChartsData(chartRes.value);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [selectedPeriod, periodDateOffset]);

  useEffect(() => {
    if (activeTab === 'insights') {
      fetchAnalytics();
    }
  }, [activeTab, fetchAnalytics]);

  // Delete transaction with UNDO toast
  const handleDelete = async (tx: Transaction) => {
    const confirmed = await alert.confirm({
      title: 'Delete Transaction',
      message: `Delete ${tx.merchant || tx.category} (₹${tx.amount.toLocaleString('en-IN')})? This will update account balances.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'Trash2',
    });
    if (!confirmed) return;

    try {
      if (onDeleteTransaction) {
        await onDeleteTransaction(tx.id, tx.merchant || undefined);
      } else {
        await transactionsApi.deleteTransaction(tx.id);
        queryClient.invalidateQueries(['transactions']);
        queryClient.invalidateQueries(['home']);
      }

      // Optimistically remove from list
      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));

      // Show Undo Toast
      toast.action(
        `Deleted ₹${tx.amount.toLocaleString('en-IN')}`,
        'UNDO',
        async () => {
          try {
            await transactionsApi.restoreTransaction(tx.id);
            queryClient.invalidateQueries(['transactions']);
            queryClient.invalidateQueries(['home']);
            fetchTransactionsList(true);
            toast.success('Transaction restored.', 'Restored');
          } catch {
            toast.error('Unable to restore transaction.', 'Restore Failed');
          }
        },
        'Transaction Deleted',
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete transaction.', 'Error');
    }
  };

  // Active filters list for removable chips
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];
    if (debouncedSearch) {
      chips.push({
        id: 'search',
        label: `"${debouncedSearch}"`,
        onRemove: () => {
          setSearchQuery('');
          setDebouncedSearch('');
        },
      });
    }
    if (selectedType) {
      chips.push({
        id: 'type',
        label: `Type: ${selectedType}`,
        onRemove: () => setSelectedType(undefined),
      });
    }
    if (selectedAccountId) {
      const acc = accounts.find((a) => a.id === selectedAccountId);
      chips.push({
        id: 'account',
        label: `Account: ${acc?.name || 'Selected'}`,
        onRemove: () => setSelectedAccountId(undefined),
      });
    }
    if (selectedPaymentMethod) {
      chips.push({
        id: 'paymentMethod',
        label: `Method: ${selectedPaymentMethod}`,
        onRemove: () => setSelectedPaymentMethod(undefined),
      });
    }
    if (selectedSort !== 'date_desc') {
      chips.push({
        id: 'sort',
        label: selectedSort === 'amount_desc' ? 'Amount: High to Low' : selectedSort === 'amount_asc' ? 'Amount: Low to High' : 'Oldest First',
        onRemove: () => setSelectedSort('date_desc'),
      });
    }
    return chips;
  }, [debouncedSearch, selectedType, selectedAccountId, selectedPaymentMethod, selectedSort, accounts]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* 1. Header Bar with Safe Top Padding */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        {/* Top Navigation Row */}
        <View style={styles.topNavRow}>
          <View style={styles.headerLeft}>
            {onClose && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <AppIcon name="ChevronLeft" size={22} color={isDark ? '#FFFFFF' : '#0F172A'} />
              </TouchableOpacity>
            )}
            <View style={styles.headerTitleBlock}>
              <Text style={styles.headerCaption}>PERSONAL FINANCE</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                History & Insights
              </Text>
            </View>
          </View>

          {onClose && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <AppIcon name="X" size={18} color={isDark ? '#A1A1AA' : '#64748B'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Switcher: Full-width Segmented Control */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <AppIcon
              name="Calendar"
              size={14}
              color={activeTab === 'history' ? (isDark ? '#FFFFFF' : '#0F172A') : isDark ? '#A1A1AA' : '#64748B'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
              History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'insights' && styles.tabBtnActive]}
            onPress={() => setActiveTab('insights')}
            activeOpacity={0.8}
          >
            <AppIcon
              name="BarChart3"
              size={14}
              color={activeTab === 'insights' ? (isDark ? '#FFFFFF' : '#0F172A') : isDark ? '#A1A1AA' : '#64748B'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'insights' && styles.tabBtnTextActive]}>
              Insights
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ======================================================== */}
      {/* VIEW A: TRANSACTIONS HISTORY                             */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <View style={{ flex: 1 }}>
          {/* Search + Filter Row */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <AppIcon name="Search" size={17} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search history by merchant, notes..."
                placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
                value={searchQuery}
                onChangeText={handleSearchChange}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearchChange('')}>
                  <AppIcon name="X" size={15} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.filterToggleBtn,
                (showFilterDrawer || activeFilterChips.length > 0) && styles.filterToggleBtnActive,
              ]}
              onPress={() => setShowFilterDrawer((prev) => !prev)}
            >
              <AppIcon
                name="SlidersHorizontal"
                size={18}
                color={showFilterDrawer || activeFilterChips.length > 0 ? '#FFFFFF' : isDark ? '#FFFFFF' : '#0F172A'}
              />
            </TouchableOpacity>
          </View>

          {/* Filter Drawer if open */}
          {showFilterDrawer && (
            <View style={styles.filterDrawer}>
              <Text style={styles.drawerSectionTitle}>Transaction Type</Text>
              <View style={styles.drawerChipsRow}>
                {[undefined, TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER, TransactionType.REFUND, TransactionType.ADJUSTMENT].map((t) => (
                  <TouchableOpacity
                    key={t || 'ALL'}
                    style={[styles.drawerChip, selectedType === t && styles.drawerChipActive]}
                    onPress={() => setSelectedType(t)}
                  >
                    <Text style={[styles.drawerChipText, selectedType === t && styles.drawerChipTextActive]}>
                      {t ? t : 'All Types'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.drawerSectionTitle}>Sort Order</Text>
              <View style={styles.drawerChipsRow}>
                {[
                  { key: 'date_desc', label: 'Newest First' },
                  { key: 'date_asc', label: 'Oldest First' },
                  { key: 'amount_desc', label: 'Amount: High to Low' },
                  { key: 'amount_asc', label: 'Amount: Low to High' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.drawerChip, selectedSort === s.key && styles.drawerChipActive]}
                    onPress={() => setSelectedSort(s.key as any)}
                  >
                    <Text style={[styles.drawerChipText, selectedSort === s.key && styles.drawerChipTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Removable Active Filter Chips (Non-conflicting wrap) */}
          {activeFilterChips.length > 0 && (
            <View style={styles.activeChipsWrap}>
              {activeFilterChips.map((chip) => (
                <View key={chip.id} style={styles.removableChip}>
                  <Text style={styles.removableChipText}>{chip.label}</Text>
                  <TouchableOpacity onPress={chip.onRemove} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <AppIcon name="X" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setDebouncedSearch('');
                  setSelectedType(undefined);
                  setSelectedAccountId(undefined);
                  setSelectedPaymentMethod(undefined);
                  setSelectedSort('date_desc');
                }}
              >
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Transactions List */}
          {isLoadingInitial ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.bluePrimary} />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : txError ? (
            <View style={styles.centerContainer}>
              <AppIcon name="CircleAlert" size={36} color="#EF4444" />
              <Text style={styles.errorTitle}>Unable to load transactions</Text>
              <Text style={styles.errorSubtitle}>{txError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchTransactionsList()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.centerContainer}>
              <AppIcon name="ReceiptText" size={42} color={isDark ? '#3F3F46' : '#CBD5E1'} />
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptySubtitle}>
                {debouncedSearch || selectedType
                  ? 'No records match your active search or filters.'
                  : 'Your financial journey starts here. Add your first transaction to begin tracking.'}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => fetchTransactionsList(true)}
                  tintColor={colors.bluePrimary}
                />
              }
            >
              {transactions.map((tx) => {
                const iconCfg = getCategoryIconConfig(tx.category, isDark);
                const isIncome = tx.type === TransactionType.INCOME || tx.type === TransactionType.REFUND;
                const isTransfer = tx.type === TransactionType.TRANSFER;

                return (
                  <TouchableOpacity
                    key={tx.id}
                    style={styles.txCard}
                    activeOpacity={0.7}
                    onPress={() => onEditTransaction?.(tx)}
                  >
                    <View style={[styles.catIconCircle, { backgroundColor: iconCfg.backgroundColor }]}>
                      <AppIcon name={iconCfg.iconName} size={18} color={iconCfg.iconColor} />
                    </View>

                    <View style={styles.txInfo}>
                      <Text style={styles.txMerchant} numberOfLines={1}>
                        {tx.merchant || tx.category}
                      </Text>
                      <Text style={styles.txMeta} numberOfLines={1}>
                        {tx.accountName ? `${tx.accountName} · ` : ''}
                        {tx.paymentMethod}
                        {tx.notes ? ` · "${tx.notes}"` : ''}
                      </Text>
                    </View>

                    <View style={styles.txRight}>
                      <Text
                        style={[
                          styles.txAmount,
                          isIncome
                            ? styles.txAmountIncome
                            : isTransfer
                            ? styles.txAmountTransfer
                            : styles.txAmountExpense,
                        ]}
                      >
                        {isIncome
                          ? `+₹${tx.amount.toLocaleString('en-IN')}`
                          : isTransfer
                          ? `₹${tx.amount.toLocaleString('en-IN')}`
                          : `-₹${tx.amount.toLocaleString('en-IN')}`}
                      </Text>

                      <View style={styles.txActionsRow}>
                        {onDuplicateTransaction && (
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => onDuplicateTransaction(tx)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <AppIcon name="Plus" size={13} color="#94A3B8" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleDelete(tx)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <AppIcon name="Trash2" size={13} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Cursor Load More Trigger */}
              {hasMore && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color={colors.bluePrimary} />
                  ) : (
                    <Text style={styles.loadMoreBtnText}>Load More Transactions</Text>
                  )}
                </TouchableOpacity>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      )}

      {/* ======================================================== */}
      {/* VIEW B: INSIGHTS & ANALYTICS                             */}
      {/* ======================================================== */}
      {activeTab === 'insights' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.insightsScroll}>
          {/* Period Selector Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodTabsScroll}>
            {PERIODS.map((p) => {
              const isSelected = selectedPeriod === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.periodTab, isSelected && styles.periodTabActive]}
                  onPress={() => {
                    setSelectedPeriod(p.key);
                    setPeriodDateOffset(0);
                  }}
                >
                  <Text style={[styles.periodTabText, isSelected && styles.periodTabTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Period Navigator (Prev, Current, Next + Indian FY notice) */}
          <View style={styles.periodNavigator}>
            <TouchableOpacity
              style={styles.navArrow}
              onPress={() => setPeriodDateOffset((prev) => prev - 1)}
            >
              <AppIcon name="ChevronLeft" size={20} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={styles.periodNavigatorText}>
                {summaryData?.periodLabel || (selectedPeriod === AnalyticsPeriod.YEAR ? getIndianFinancialYear() : 'Current Period')}
              </Text>
              {selectedPeriod === AnalyticsPeriod.YEAR && (
                <Text style={styles.fySubtext}>Indian Financial Year (Apr - Mar)</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.navArrow}
              disabled={periodDateOffset >= 0}
              onPress={() => setPeriodDateOffset((prev) => prev + 1)}
            >
              <AppIcon
                name="ChevronRight"
                size={20}
                color={periodDateOffset >= 0 ? '#94A3B8' : isDark ? '#FFFFFF' : '#0F172A'}
              />
            </TouchableOpacity>
          </View>

          {isLoadingAnalytics ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.bluePrimary} />
              <Text style={styles.loadingText}>Calculating metrics...</Text>
            </View>
          ) : (
            <>
              {/* Summary Metrics Grid */}
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Income</Text>
                  <Text style={[styles.summaryAmount, { color: '#16A34A' }]}>
                    +₹{(summaryData?.income || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Expenses</Text>
                  <Text style={[styles.summaryAmount, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    -₹{(summaryData?.expenses || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Net Flow</Text>
                  <Text
                    style={[
                      styles.summaryAmount,
                      { color: (summaryData?.netFlow || 0) >= 0 ? colors.bluePrimary : '#EF4444' },
                    ]}
                  >
                    ₹{(summaryData?.netFlow || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Daily Average</Text>
                  <Text style={styles.summaryAmount}>
                    ₹{(summaryData?.averageDailySpend || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              {/* Category Spending Breakdown (Horizontal Bar Chart) */}
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Category Spending</Text>
                {chartsData?.categoryBreakdown && chartsData.categoryBreakdown.length > 0 ? (
                  chartsData.categoryBreakdown.map((cat: any) => (
                    <View key={cat.category} style={styles.barItem}>
                      <View style={styles.barLabelRow}>
                        <Text style={styles.barCategoryName}>{cat.category}</Text>
                        <Text style={styles.barAmount}>₹{cat.amount.toLocaleString('en-IN')} ({cat.percentage}%)</Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: cat.color || colors.bluePrimary },
                          ]}
                        />
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.chartEmpty}>
                    <Text style={styles.chartEmptyText}>No spending recorded in this period.</Text>
                  </View>
                )}
              </View>

              {/* Spending Trend */}
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Spending Activity</Text>
                {chartsData?.spendingTrend && chartsData.spendingTrend.length > 0 ? (
                  <View style={styles.trendList}>
                    {chartsData.spendingTrend.map((point: any, idx: number) => (
                      <View key={idx} style={styles.trendRow}>
                        <Text style={styles.trendLabel}>{point.label}</Text>
                        <View style={styles.trendBarFill}>
                          <View
                            style={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: colors.bluePrimary,
                              width: `${Math.min(100, Math.max(10, (point.amount / 5000) * 100))}%`,
                            }}
                          />
                        </View>
                        <Text style={styles.trendValue}>₹{point.amount.toLocaleString('en-IN')}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.chartEmpty}>
                    <Text style={styles.chartEmptyText}>No trend activity available for this period.</Text>
                  </View>
                )}
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (themeColors: typeof colors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000000' : '#F2F3F7',
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 14,
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    topNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
      marginLeft: 10,
    },
    headerTitleBlock: {
      flex: 1,
    },
    headerCaption: {
      fontSize: 10.5,
      fontWeight: '700',
      color: isDark ? '#A1A1AA' : colors.textSecondary,
      letterSpacing: 1.1,
      marginBottom: 2,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: isDark ? '#FFFFFF' : '#0F172A',
      letterSpacing: -0.5,
    },
    tabSwitcher: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
      borderRadius: 12,
      padding: 3,
      gap: 4,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 10,
      gap: 6,
    },
    tabBtnActive: {
      backgroundColor: isDark ? '#27272A' : '#FFFFFF',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    tabBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    tabBtnTextActive: {
      color: isDark ? '#FFFFFF' : '#0F172A',
      fontWeight: '700',
    },
    searchRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingTop: 14,
      gap: 10,
      marginBottom: 10,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      height: 48,
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 14,
      paddingHorizontal: 14,
      gap: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    searchInput: {
      flex: 1,
      fontSize: 13.5,
      color: isDark ? '#FFFFFF' : '#0F172A',
      padding: 0,
    },
    filterToggleBtn: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    filterToggleBtnActive: {
      backgroundColor: colors.bluePrimary,
      borderColor: colors.bluePrimary,
    },
    filterDrawer: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      marginHorizontal: 20,
      padding: 14,
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    drawerSectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#A1A1AA' : '#64748B',
      marginBottom: 6,
    },
    drawerChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12,
    },
    drawerChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: isDark ? '#27272A' : '#F1F5F9',
    },
    drawerChipActive: {
      backgroundColor: colors.bluePrimary,
    },
    drawerChipText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: isDark ? '#D4D4D8' : '#334155',
    },
    drawerChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    activeChipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 20,
      gap: 6,
      marginBottom: 10,
      alignItems: 'center',
    },
    removableChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.bluePrimary,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
    },
    removableChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    clearAllText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.bluePrimary,
      marginLeft: 4,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 4,
    },
    txCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 16,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
    },
    catIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    txInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    txMerchant: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 2,
    },
    txMeta: {
      fontSize: 11.5,
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    txRight: {
      alignItems: 'flex-end',
      marginLeft: 8,
    },
    txAmount: {
      fontSize: 14.5,
      fontWeight: '800',
      marginBottom: 4,
    },
    txAmountExpense: {
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    txAmountIncome: {
      color: '#16A34A',
    },
    txAmountTransfer: {
      color: colors.bluePrimary,
    },
    txActionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      padding: 3,
    },
    loadMoreBtn: {
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      alignItems: 'center',
      marginTop: 8,
    },
    loadMoreBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.bluePrimary,
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 13,
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    errorTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginTop: 12,
      marginBottom: 4,
    },
    errorSubtitle: {
      fontSize: 12.5,
      color: isDark ? '#A1A1AA' : '#64748B',
      textAlign: 'center',
      marginBottom: 16,
    },
    retryBtn: {
      backgroundColor: colors.bluePrimary,
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 12,
    },
    retryBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginTop: 12,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 12.5,
      color: isDark ? '#A1A1AA' : '#64748B',
      textAlign: 'center',
      lineHeight: 18,
    },
    insightsScroll: {
      paddingHorizontal: 20,
      paddingTop: 14,
    },
    periodTabsScroll: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    periodTab: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    periodTabActive: {
      backgroundColor: colors.bluePrimary,
      borderColor: colors.bluePrimary,
    },
    periodTabText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    periodTabTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    periodNavigator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    navArrow: {
      padding: 6,
    },
    periodNavigatorText: {
      fontSize: 14,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    fySubtext: {
      fontSize: 10,
      color: isDark ? '#A1A1AA' : '#64748B',
      marginTop: 2,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    summaryCard: {
      width: '48%',
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    summaryLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
      marginBottom: 6,
    },
    summaryAmount: {
      fontSize: 16,
      fontWeight: '900',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    chartCard: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    chartTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginBottom: 14,
    },
    barItem: {
      marginBottom: 12,
    },
    barLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    barCategoryName: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    barAmount: {
      fontSize: 11.5,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    barTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? '#27272A' : '#F1F5F9',
      overflow: 'hidden',
    },
    barFill: {
      height: 8,
      borderRadius: 4,
    },
    trendList: {
      gap: 10,
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    trendLabel: {
      width: 50,
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    trendBarFill: {
      flex: 1,
      height: 6,
      backgroundColor: isDark ? '#27272A' : '#F1F5F9',
      borderRadius: 3,
    },
    trendValue: {
      width: 60,
      textAlign: 'right',
      fontSize: 11.5,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    chartEmpty: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    chartEmptyText: {
      fontSize: 12.5,
      color: isDark ? '#A1A1AA' : '#64748B',
    },
  });

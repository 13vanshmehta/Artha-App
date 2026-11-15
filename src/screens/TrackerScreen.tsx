import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { AppIcon } from '../components/icons/AppIcon';
import { getCategoryIconConfig } from '../components/icons/categoryIcons';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { RecentDayGroup, Transaction, TransactionType } from '../api/types';
import { transactionsApi } from '../api/transactions';
import { queryClient } from '../state/queryClient';
import { formatCurrentHeaderDate, formatTransactionTime } from '../utils/date';
import { HistoryScreen } from './HistoryScreen';

interface TrackerScreenProps {
  onScrollingChange?: (isScrolling: boolean) => void;
  onOpenAddTransaction?: (type?: TransactionType) => void;
  onEditTransaction?: (item: Transaction) => void;
  onDuplicateTransaction?: (item: Transaction) => void;
  onDeleteTransaction?: (id: string, merchant?: string) => Promise<void> | void;
}

export const TrackerScreen: React.FC<TrackerScreenProps> = ({
  onScrollingChange,
  onOpenAddTransaction,
  onEditTransaction,
  onDuplicateTransaction,
  onDeleteTransaction,
}) => {
  const { isDark, colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors, isDark), [themeColors, isDark]);

  // Dynamic Current Date for Header (Refreshes past midnight)
  const [currentDateHeader, setCurrentDateHeader] = useState(() => formatCurrentHeaderDate());

  useEffect(() => {
    // Check every minute if the calendar day rolled over
    const timer = setInterval(() => {
      const formatted = formatCurrentHeaderDate();
      setCurrentDateHeader((prev) => (prev !== formatted ? formatted : prev));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Server state: 3-day recent groups
  const [dayGroups, setDayGroups] = useState<RecentDayGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search input state (debounced, local to 3-day dataset)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // History & Insights Full Modal state
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Scroll idle timers for BottomTabBar auto-hide/show
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOffsetY = useRef(0);

  const showBottomNav = useCallback(() => {
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    onScrollingChange?.(false);
  }, [onScrollingChange]);

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

  // Fetch recent 3-day transactions
  const fetchRecent = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await transactionsApi.getRecentTransactions();
      if (res && Array.isArray(res.days)) {
        setDayGroups(res.days);
      } else {
        setDayGroups([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load recent transactions.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecent();

    // Subscribe to queryClient cache invalidations on ['transactions']
    const unsubscribe = queryClient.subscribe(['transactions'], () => {
      fetchRecent(true);
    });
    return () => unsubscribe();
  }, [fetchRecent]);

  const handleRefresh = useCallback(() => {
    fetchRecent(true);
  }, [fetchRecent]);

  // Debounced search handler
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(text.trim().toLowerCase());
    }, 250);
  };

  // Filter 3-day groups locally by search query
  const filteredDayGroups = useMemo(() => {
    if (!debouncedSearch) return dayGroups;

    return dayGroups
      .map((group) => {
        const matchingTx = group.transactions.filter((tx) => {
          const matchMerchant = (tx.merchant || '').toLowerCase().includes(debouncedSearch);
          const matchCategory = (tx.category || '').toLowerCase().includes(debouncedSearch);
          const matchNotes = (tx.notes || '').toLowerCase().includes(debouncedSearch);
          const matchAccount = (tx.accountName || '').toLowerCase().includes(debouncedSearch);
          return matchMerchant || matchCategory || matchNotes || matchAccount;
        });

        return {
          ...group,
          transactions: matchingTx,
        };
      })
      .filter((group) => group.transactions.length > 0);
  }, [dayGroups, debouncedSearch]);

  // 3-Day Overview Totals (Real calculations only)
  const { totalSpent, totalIncome, net3Day } = useMemo(() => {
    let spent = 0;
    let income = 0;

    dayGroups.forEach((day) => {
      spent += day.spentTotal || 0;
      income += day.incomeTotal || 0;
    });

    return {
      totalSpent: spent,
      totalIncome: income,
      net3Day: income - spent,
    };
  }, [dayGroups]);

  const totalTransactionCount = useMemo(() => {
    return dayGroups.reduce((acc, d) => acc + (d.transactions?.length || 0), 0);
  }, [dayGroups]);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.heroGradientStart, colors.bluePrimary]}
            tintColor={colors.bluePrimary}
          />
        }
      >
        {/* ======================================================== */}
        {/* 1. TOP HEADER WITH REAL DYNAMIC CURRENT DATE             */}
        {/* ======================================================== */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerCaption}>PERSONAL FINANCE</Text>
            <Text style={styles.headerTitle}>PE Tracker</Text>
          </View>

          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{currentDateHeader}</Text>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 2. OVERVIEW FINANCIAL SUMMARY STRIP (REAL 3-DAY DATA)    */}
        {/* ======================================================== */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>3-Day Spending</Text>
            <Text style={[styles.summaryValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
              ₹{totalSpent.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>3-Day Income</Text>
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
              +₹{totalIncome.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>Net Flow</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: net3Day >= 0 ? colors.bluePrimary : '#EF4444' },
              ]}
            >
              {net3Day >= 0 ? '+' : ''}₹{net3Day.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 3. SEARCH BAR & BALANCED COMPACT ADD BUTTON              */}
        {/* ======================================================== */}
        <View style={styles.actionRow}>
          <View style={styles.searchBar}>
            <AppIcon name="Search" size={17} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search recent 3 days..."
              placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearchChange('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppIcon name="X" size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.85}
            onPress={() => onOpenAddTransaction?.(TransactionType.EXPENSE)}
            accessibilityLabel="Add transaction"
          >
            <AppIcon name="Plus" size={22} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* 4. RECENT 3-DAY TRANSACTIONS LIST                        */}
        {/* ======================================================== */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.bluePrimary} />
            <Text style={styles.loadingText}>Loading recent transactions...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <AppIcon name="CircleAlert" size={36} color="#EF4444" />
            <Text style={styles.errorTitle}>Unable to load transactions</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRecent(false)}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : totalTransactionCount === 0 ? (
          <View style={styles.emptyContainer}>
            <AppIcon name="ReceiptText" size={44} color={isDark ? '#3F3F46' : '#CBD5E1'} />
            <Text style={styles.emptyTitle}>No recent transactions</Text>
            <Text style={styles.emptySubtitle}>
              Tap the "+" button above to log your first expense or income.
            </Text>
          </View>
        ) : filteredDayGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AppIcon name="Search" size={38} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>
              No recent transactions match "{debouncedSearch}".
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsContainer}>
            {filteredDayGroups.map((group) => (
              <View key={group.date || group.dateLabel} style={styles.daySection}>
                {/* Daily Header Summary */}
                <View style={styles.dayHeaderRow}>
                  <Text style={styles.dayLabel}>{group.dateLabel}</Text>
                  <Text style={styles.daySpentTotal}>
                    {group.spentTotal > 0
                      ? `₹${group.spentTotal.toLocaleString('en-IN')} spent`
                      : group.incomeTotal > 0
                      ? `+₹${group.incomeTotal.toLocaleString('en-IN')} income`
                      : '₹0'}
                  </Text>
                </View>

                {/* Day's Transactions Card */}
                <View style={styles.dayCard}>
                  {group.transactions.map((tx, idx) => {
                    const catConfig = getCategoryIconConfig(tx.category, isDark);
                    const isIncome =
                      tx.type === TransactionType.INCOME || tx.type === TransactionType.REFUND;
                    const isTransfer = tx.type === TransactionType.TRANSFER;

                    return (
                      <TouchableOpacity
                        key={tx.id}
                        style={[
                          styles.transactionRow,
                          idx === group.transactions.length - 1 && { borderBottomWidth: 0 },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => onEditTransaction?.(tx)}
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
                          <Text style={styles.txMerchant} numberOfLines={1}>
                            {tx.merchant || tx.category}
                          </Text>
                          <Text style={styles.txMeta} numberOfLines={1}>
                            {formatTransactionTime(tx.incurredAt)} · {tx.accountName || 'Cash'} · {tx.paymentMethod}
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
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <AppIcon name="Plus" size={13} color="#94A3B8" />
                              </TouchableOpacity>
                            )}
                            {onDeleteTransaction && (
                              <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => onDeleteTransaction(tx.id, tx.merchant || undefined)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <AppIcon name="Trash2" size={13} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* View All History & Insights Link */}
            <TouchableOpacity
              style={styles.viewAllRow}
              activeOpacity={0.75}
              onPress={() => setHistoryModalVisible(true)}
            >
              <Text style={styles.viewAllText}>View All History & Insights</Text>
              <AppIcon name="ArrowRight" size={16} color={colors.bluePrimary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Dedicated History & Insights Full Modal */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <HistoryScreen
          onClose={() => setHistoryModalVisible(false)}
          onEditTransaction={(tx) => {
            setHistoryModalVisible(false);
            onEditTransaction?.(tx);
          }}
          onDuplicateTransaction={(tx) => {
            setHistoryModalVisible(false);
            onDuplicateTransaction?.(tx);
          }}
          onDeleteTransaction={onDeleteTransaction}
        />
      </Modal>
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
    datePill: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    datePillText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : colors.textSecondary,
    },
    summaryCard: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      marginBottom: 16,
    },
    summaryColumn: {
      flex: 1,
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 14.5,
      fontWeight: '800',
    },
    summaryDivider: {
      width: 1,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9',
      marginVertical: 4,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
      alignItems: 'center',
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 16,
      paddingHorizontal: 14,
      height: 48,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13.5,
      color: isDark ? '#FFFFFF' : '#0F172A',
      padding: 0,
    },
    addBtn: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.bluePrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    transactionsContainer: {
      marginTop: 4,
    },
    daySection: {
      marginBottom: 18,
    },
    dayHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    dayLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    daySpentTotal: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    dayCard: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      overflow: 'hidden',
    },
    transactionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
    },
    catIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    txMain: {
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
      padding: 2,
    },
    viewAllRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      marginTop: 8,
    },
    viewAllText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.bluePrimary,
    },
    centerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 50,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 13,
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    errorTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginTop: 10,
      marginBottom: 4,
    },
    errorSubtitle: {
      fontSize: 12,
      color: isDark ? '#A1A1AA' : '#64748B',
      marginBottom: 12,
    },
    retryBtn: {
      backgroundColor: colors.bluePrimary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
    },
    retryBtnText: {
      color: '#FFFFFF',
      fontSize: 12.5,
      fontWeight: '700',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 30,
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
    bottomSpacer: {
      height: 60,
    },
  });

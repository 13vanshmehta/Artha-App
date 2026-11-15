import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { AppIcon } from '../components/icons/AppIcon';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import {
  mockGroups,
  mockPendingSettlements,
  mockGroupsSummary,
  MockGroupItem,
} from '../mock';
import { toast } from '../context/ToastContext';
import { alert } from '../context/AlertContext';

interface GroupsScreenProps {
  onScrollingChange?: (isScrolling: boolean) => void;
}

export const GroupsScreen: React.FC<GroupsScreenProps> = ({
  onScrollingChange,
}) => {
  const { isDark, colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors, isDark), [themeColors, isDark]);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<MockGroupItem[]>(mockGroups);
  const [selectedGroup, setSelectedGroup] = useState<MockGroupItem | null>(null);
  const [pendingSettlements, setPendingSettlements] = useState(mockPendingSettlements);
  const [groupDetailsTab, setGroupDetailsTab] = useState<'expenses' | 'members' | 'balances'>('expenses');

  // Create Group Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Add Group Expense Modal
  const [addExpenseModalVisible, setAddExpenseModalVisible] = useState(false);
  const [groupExpenseDesc, setGroupExpenseDesc] = useState('');
  const [groupExpenseAmount, setGroupExpenseAmount] = useState('');

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
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      setRefreshing(false);
      toast.info('Groups updated with latest mock data.', 'Refreshed');
    }, 450);
  }, [showBottomNav]);

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

  const handleCreateGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      toast.error('Please enter a group name.', 'Missing Name');
      return;
    }

    const newGroup: MockGroupItem = {
      id: `grp_${Date.now()}`,
      name: trimmed,
      currency: 'INR',
      membersCount: 1,
      totalSpent: 0,
      userBalance: { status: 'settled', amount: 0 },
      members: [
        { id: 'm1', name: 'Vansh Mehta (You)', email: 'vansh@example.com', isCurrentUser: true },
      ],
      expenses: [],
      balances: [],
      settlements: [],
    };

    setGroups((prev) => [newGroup, ...prev]);
    setCreateModalVisible(false);
    setNewGroupName('');
    toast.success(`Group "${trimmed}" created!`, 'Group Created');
  };

  const handleAddGroupExpense = () => {
    const amt = parseFloat(groupExpenseAmount);
    if (isNaN(amt) || amt <= 0 || !groupExpenseDesc.trim()) {
      toast.error('Please enter a valid description and amount.', 'Invalid Expense');
      return;
    }

    if (selectedGroup) {
      const newExp = {
        id: `ge_${Date.now()}`,
        title: groupExpenseDesc.trim(),
        amount: amt,
        paidBy: 'You',
        dateStr: 'Today',
      };
      const updated: MockGroupItem = {
        ...selectedGroup,
        totalSpent: selectedGroup.totalSpent + amt,
        expenses: [newExp, ...selectedGroup.expenses],
      };
      setSelectedGroup(updated);
      setGroups((prev) =>
        prev.map((g) => (g.id === updated.id ? updated : g)),
      );
    }

    toast.success(
      `Added ₹${amt} for ${groupExpenseDesc}. Split equally among members.`,
      'Expense Logged',
    );
    setAddExpenseModalVisible(false);
    setGroupExpenseDesc('');
    setGroupExpenseAmount('');
  };

  const handleSettleUp = async (personName: string, amt: number) => {
    const confirmed = await alert.confirm({
      title: 'Settle Balance',
      message: `Record a payment of ₹${amt} to ${personName} and mark this balance as settled?`,
      confirmText: 'Settle Balance',
      cancelText: 'Cancel',
      type: 'info',
      icon: 'Check',
    });
    if (!confirmed) return;
    setPendingSettlements((prev) => prev.filter((p) => p.personName !== personName));
    toast.success(`Settled ₹${amt} with ${personName}!`, 'Settled Up');
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
        {/* 1. TOP HEADER & NEW GROUP ACTION                         */}
        {/* ======================================================== */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerCaption}>SHARED EXPENSES</Text>
            <Text style={styles.headerTitle}>Groups</Text>
          </View>

          <TouchableOpacity
            style={styles.newGroupBtn}
            activeOpacity={0.85}
            onPress={() => setCreateModalVisible(true)}
          >
            <AppIcon name="Plus" size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.newGroupBtnText}>New Group</Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* 2. OVERALL BALANCE SUMMARY (YOU OWE / YOU ARE OWED)      */}
        {/* ======================================================== */}
        <View style={styles.balanceSummaryCard}>
          <View style={styles.balanceCol}>
            <Text style={styles.balanceLabel}>You are owed</Text>
            <Text style={[styles.balanceValue, { color: '#16A34A' }]}>
              +₹{mockGroupsSummary.youAreOwed.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.balanceSub}>Across 2 groups</Text>
          </View>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceCol}>
            <Text style={styles.balanceLabel}>You owe</Text>
            <Text style={[styles.balanceValue, { color: '#EA580C' }]}>
              -₹{mockGroupsSummary.youOwe.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.balanceSub}>
              {pendingSettlements.length > 0
                ? `${pendingSettlements.length} pending settlement`
                : 'All clear'}
            </Text>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 3. SETTLEMENT SUGGESTIONS CARDS                          */}
        {/* ======================================================== */}
        {pendingSettlements.length > 0 && (
          <View style={styles.settlementSection}>
            <Text style={styles.sectionTitle}>
              Pending Settlements ({pendingSettlements.length})
            </Text>

            {pendingSettlements.map((item) => {
              const isIncoming = item.type === 'incoming';
              return (
                <View key={item.id} style={styles.settlementCard}>
                  <View
                    style={[
                      styles.settlementIconCircle,
                      !isIncoming && { backgroundColor: '#FFEDD5' },
                    ]}
                  >
                    <AppIcon
                      name={isIncoming ? 'ArrowDownLeft' : 'ArrowUpRight'}
                      size={16}
                      color={isIncoming ? '#16A34A' : '#EA580C'}
                    />
                  </View>
                  <View style={styles.settlementMain}>
                    <Text style={styles.settlementTitle}>{item.title}</Text>
                    <Text style={styles.settlementSub}>{item.subtitle}</Text>
                  </View>
                  {isIncoming ? (
                    <TouchableOpacity
                      style={styles.remindBtn}
                      activeOpacity={0.8}
                      onPress={() =>
                        toast.info(
                          `WhatsApp settlement reminder sent to ${item.personName}.`,
                          'Reminder Sent',
                        )
                      }
                    >
                      <Text style={styles.remindBtnText}>Remind</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.payBtn}
                      activeOpacity={0.8}
                      onPress={() => handleSettleUp(item.personName, item.amount)}
                    >
                      <Text style={styles.payBtnText}>Settle</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ======================================================== */}
        {/* 4. ACTIVE GROUPS LIST                                    */}
        {/* ======================================================== */}
        <View style={styles.groupsSection}>
          <Text style={styles.sectionTitle}>Your Groups ({groups.length})</Text>

          {groups.map((group) => {
            const memberCount = group.members?.length || group.membersCount || 1;
            const expenseCount = group.expenses?.length || 0;
            const isOwed = group.userBalance.status === 'owed';
            const isOwes = group.userBalance.status === 'owes';

            return (
              <TouchableOpacity
                key={group.id}
                style={styles.groupCard}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedGroup(group);
                  setGroupDetailsTab('expenses');
                }}
              >
                <View style={styles.groupCardTop}>
                  <View style={styles.groupAvatarCircle}>
                    <AppIcon name="Users" size={20} color={isDark ? '#F58A07' : colors.navyPrimary} />
                  </View>

                  <View style={styles.groupMain}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupMeta}>
                      {memberCount} members · {expenseCount} expenses
                    </Text>
                  </View>

                  <AppIcon name="ChevronRight" size={18} color={isDark ? '#71717A' : '#94A3B8'} />
                </View>

                <View style={styles.groupCardDivider} />

                <View style={styles.groupCardBottom}>
                  <Text
                    style={[
                      styles.groupStatusText,
                      isOwed && { color: '#16A34A' },
                      isOwes && { color: '#EA580C' },
                    ]}
                  >
                    {isOwed
                      ? `You are owed ₹${group.userBalance.amount.toLocaleString('en-IN')}`
                      : isOwes
                        ? `You owe ₹${group.userBalance.amount.toLocaleString('en-IN')}`
                        : 'All balances settled'}
                  </Text>
                  <Text style={styles.groupActionText}>View Details →</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ======================================================== */}
      {/* MODAL 1: CREATE NEW GROUP                                */}
      {/* ======================================================== */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Group</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <AppIcon name="X" size={20} color={isDark ? '#A1A1AA' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Group Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Manali Roadtrip 🏔️, Flat 402 🏠"
                placeholderTextColor="#94A3B8"
                value={newGroupName}
                onChangeText={setNewGroupName}
                autoFocus
              />

              <TouchableOpacity
                style={styles.modalActionBtn}
                activeOpacity={0.85}
                onPress={handleCreateGroup}
              >
                <Text style={styles.modalActionBtnText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: GROUP DETAILS & SPLITS                          */}
      {/* ======================================================== */}
      {selectedGroup && (
        <Modal
          visible={Boolean(selectedGroup)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedGroup(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { maxHeight: '88%' }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{selectedGroup.name}</Text>
                  <Text style={styles.groupDetailsSub}>
                    {selectedGroup.members.length} members · Collaborative split
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedGroup(null)}>
                  <AppIcon name="X" size={20} color={isDark ? '#A1A1AA' : '#64748B'} />
                </TouchableOpacity>
              </View>

              {/* Detail Tabs */}
              <View style={styles.tabBarRow}>
                <TouchableOpacity
                  style={[
                    styles.tabBarBtn,
                    groupDetailsTab === 'expenses' && styles.tabBarBtnActive,
                  ]}
                  onPress={() => setGroupDetailsTab('expenses')}
                >
                  <Text
                    style={[
                      styles.tabBarBtnText,
                      groupDetailsTab === 'expenses' && styles.tabBarBtnTextActive,
                    ]}
                  >
                    Expenses ({selectedGroup.expenses.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabBarBtn,
                    groupDetailsTab === 'balances' && styles.tabBarBtnActive,
                  ]}
                  onPress={() => setGroupDetailsTab('balances')}
                >
                  <Text
                    style={[
                      styles.tabBarBtnText,
                      groupDetailsTab === 'balances' && styles.tabBarBtnTextActive,
                    ]}
                  >
                    Balances
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabBarBtn,
                    groupDetailsTab === 'members' && styles.tabBarBtnActive,
                  ]}
                  onPress={() => setGroupDetailsTab('members')}
                >
                  <Text
                    style={[
                      styles.tabBarBtnText,
                      groupDetailsTab === 'members' && styles.tabBarBtnTextActive,
                    ]}
                  >
                    Members ({selectedGroup.members.length})
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.detailsScroll}>
                {/* Group KPI Bar */}
                <View style={styles.groupKpiBar}>
                  <View style={styles.groupKpiItem}>
                    <Text style={styles.groupKpiLabel}>Total Spent</Text>
                    <Text style={styles.groupKpiValue}>
                      ₹{selectedGroup.totalSpent.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.groupKpiItem}>
                    <Text style={styles.groupKpiLabel}>Your Share</Text>
                    <Text style={styles.groupKpiValue}>
                      ₹
                      {Math.round(
                        selectedGroup.totalSpent /
                          Math.max(1, selectedGroup.members.length),
                      ).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.groupKpiItem}>
                    <Text style={styles.groupKpiLabel}>Your Balance</Text>
                    <Text
                      style={[
                        styles.groupKpiValue,
                        selectedGroup.userBalance.status === 'owed' && {
                          color: '#16A34A',
                        },
                        selectedGroup.userBalance.status === 'owes' && {
                          color: '#EA580C',
                        },
                      ]}
                    >
                      {selectedGroup.userBalance.status === 'owed'
                        ? `+₹${selectedGroup.userBalance.amount.toLocaleString('en-IN')}`
                        : selectedGroup.userBalance.status === 'owes'
                          ? `-₹${selectedGroup.userBalance.amount.toLocaleString('en-IN')}`
                          : 'Settled'}
                    </Text>
                  </View>
                </View>

                {/* Settle Up Action Banner if applicable */}
                {selectedGroup.settlements.length > 0 && (
                  <View style={styles.actionBanner}>
                    <Text style={styles.actionBannerText}>
                      {selectedGroup.settlements[0].from} owes{' '}
                      {selectedGroup.settlements[0].to} ₹
                      {selectedGroup.settlements[0].amount}
                    </Text>
                    <TouchableOpacity
                      style={styles.bannerBtn}
                      onPress={() =>
                        toast.success(
                          `Recorded payment of ₹${selectedGroup.settlements[0].amount} (Demo).`,
                          'Settled',
                        )
                      }
                    >
                      <Text style={styles.bannerBtnText}>Mark Paid</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* TAB 1: EXPENSES */}
                {groupDetailsTab === 'expenses' && (
                  <View>
                    <Text style={styles.sectionTitle}>
                      Group Expenses ({selectedGroup.expenses.length})
                    </Text>
                    {selectedGroup.expenses.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>
                          No expenses logged yet in this group.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.expenseFeed}>
                        {selectedGroup.expenses.map((exp) => (
                          <View key={exp.id} style={styles.expenseItemRow}>
                            <View style={styles.expenseDot} />
                            <View style={styles.expenseMain}>
                              <Text style={styles.expenseItemTitle}>
                                {exp.title}
                              </Text>
                              <Text style={styles.expenseItemPayer}>
                                Paid by {exp.paidBy} · {exp.dateStr}
                              </Text>
                            </View>
                            <Text style={styles.expenseItemAmount}>
                              ₹{exp.amount.toLocaleString('en-IN')}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.addGroupExpenseBtn}
                      activeOpacity={0.85}
                      onPress={() => setAddExpenseModalVisible(true)}
                    >
                      <AppIcon
                        name="Plus"
                        size={16}
                        color="#FFFFFF"
                        strokeWidth={2.5}
                      />
                      <Text style={styles.addGroupExpenseBtnText}>
                        Add Group Expense
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* TAB 2: BALANCES & SETTLEMENTS */}
                {groupDetailsTab === 'balances' && (
                  <View>
                    <Text style={styles.sectionTitle}>Member Balances</Text>
                    <View style={styles.expenseFeed}>
                      {selectedGroup.balances.map((b, idx) => (
                        <View key={idx} style={styles.expenseItemRow}>
                          <View
                            style={[
                              styles.expenseDot,
                              b.type === 'owed' && { backgroundColor: '#16A34A' },
                              b.type === 'owes' && { backgroundColor: '#EA580C' },
                            ]}
                          />
                          <View style={styles.expenseMain}>
                            <Text style={styles.expenseItemTitle}>
                              {b.memberName}
                            </Text>
                            <Text style={styles.expenseItemPayer}>
                              {b.type === 'owed'
                                ? 'Gets back'
                                : b.type === 'owes'
                                  ? 'Owes group'
                                  : 'All settled'}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.expenseItemAmount,
                              b.type === 'owed' && { color: '#16A34A' },
                              b.type === 'owes' && { color: '#EA580C' },
                            ]}
                          >
                            {b.amount === 0
                              ? '₹0'
                              : `${b.type === 'owed' ? '+' : '-'}₹${b.amount.toLocaleString('en-IN')}`}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
                      Suggested Settlements
                    </Text>
                    {selectedGroup.settlements.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>
                          No pending settlements in this group!
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.expenseFeed}>
                        {selectedGroup.settlements.map((s, idx) => (
                          <View key={idx} style={styles.expenseItemRow}>
                            <View style={styles.settlementIconSmall}>
                              <AppIcon
                                name="ArrowRight"
                                size={14}
                                color={colors.bluePrimary}
                              />
                            </View>
                            <View style={styles.expenseMain}>
                              <Text style={styles.expenseItemTitle}>
                                {s.from} → {s.to}
                              </Text>
                              <Text style={styles.expenseItemPayer}>
                                Direct balance settlement
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.expenseItemAmount,
                                { color: colors.navyPrimary },
                              ]}
                            >
                              ₹{s.amount.toLocaleString('en-IN')}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* TAB 3: MEMBERS */}
                {groupDetailsTab === 'members' && (
                  <View>
                    <Text style={styles.sectionTitle}>
                      Group Members ({selectedGroup.members.length})
                    </Text>
                    <View style={styles.expenseFeed}>
                      {selectedGroup.members.map((m) => (
                        <View key={m.id} style={styles.expenseItemRow}>
                          <View style={styles.memberAvatarCircle}>
                            <Text style={styles.memberAvatarInitial}>
                              {m.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.expenseMain}>
                            <Text style={styles.expenseItemTitle}>{m.name}</Text>
                            <Text style={styles.expenseItemPayer}>{m.email}</Text>
                          </View>
                          {m.isCurrentUser && (
                            <View style={styles.youBadge}>
                              <Text style={styles.youBadgeText}>You</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD GROUP EXPENSE                               */}
      {/* ======================================================== */}
      <Modal
        visible={addExpenseModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddExpenseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Group Expense</Text>
              <TouchableOpacity
                onPress={() => setAddExpenseModalVisible(false)}
              >
                <AppIcon name="X" size={20} color={isDark ? '#A1A1AA' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Expense Description</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Dinner, Fuel, Airbnb"
                placeholderTextColor="#94A3B8"
                value={groupExpenseDesc}
                onChangeText={setGroupExpenseDesc}
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                Amount (₹)
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={groupExpenseAmount}
                onChangeText={setGroupExpenseAmount}
              />

              <TouchableOpacity
                style={styles.modalActionBtn}
                activeOpacity={0.85}
                onPress={handleAddGroupExpense}
              >
                <Text style={styles.modalActionBtnText}>Split Equally</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    newGroupBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bluePrimary,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 8,
      gap: 6,
    },
    newGroupBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    balanceSummaryCard: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#000000' : colors.navyDeep,
      borderRadius: 22,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: isDark ? '#F58A07' : 'rgba(144, 210, 245, 0.22)',
      shadowColor: '#01151E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0 : 0.3,
      shadowRadius: 14,
      elevation: isDark ? 0 : 6,
    },
    balanceCol: {
      flex: 1,
      alignItems: 'center',
    },
    balanceLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.75)',
      marginBottom: 6,
    },
    balanceValue: {
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    balanceSub: {
      fontSize: 11,
      color: 'rgba(255, 255, 255, 0.55)',
    },
    balanceDivider: {
      width: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      marginVertical: 4,
    },
    settlementSection: {
      marginBottom: 22,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : colors.textPrimary,
      marginBottom: 10,
      letterSpacing: -0.2,
    },
    settlementCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderRadius: 18,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.04,
      shadowRadius: 6,
      elevation: isDark ? 0 : 2,
    },
    settlementIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    settlementMain: {
      flex: 1,
      marginRight: 10,
    },
    settlementTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : colors.textPrimary,
    },
    settlementSub: {
      fontSize: 11.5,
      color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B',
      marginTop: 2,
    },
    remindBtn: {
      backgroundColor: isDark ? '#000000' : '#EFF6FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#BFDBFE',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    remindBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#F58A07' : colors.bluePrimary,
    },
    payBtn: {
      backgroundColor: '#EA580C',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 12,
    },
    payBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    groupsSection: {
      marginBottom: 20,
    },
    groupCard: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.04,
      shadowRadius: 8,
      elevation: isDark ? 0 : 2,
    },
    groupCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    groupAvatarCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: isDark ? 'rgba(245, 138, 7, 0.22)' : colors.blueBadge,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    groupMain: {
      flex: 1,
    },
    groupName: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : colors.textPrimary,
    },
    groupMeta: {
      fontSize: 12,
      color: isDark ? '#A1A1AA' : '#64748B',
      marginTop: 2,
    },
    groupCardDivider: {
      height: 1,
      backgroundColor: isDark ? '#1E1E1E' : '#F1F5F9',
      marginVertical: 12,
    },
    groupCardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    groupStatusText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: isDark ? '#F9AB55' : colors.navyPrimary,
    },
    groupActionText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#F58A07' : colors.bluePrimary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderTopWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
      paddingTop: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 22,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#F1F5F9',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : colors.textPrimary,
    },
    groupDetailsSub: {
      fontSize: 12,
      color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B',
      marginTop: 2,
    },
    tabBarRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      backgroundColor: isDark ? '#000000' : '#F8FAFC',
    },
    tabBarBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    tabBarBtnActive: {
      borderBottomWidth: 2.5,
      borderBottomColor: isDark ? '#F58A07' : colors.bluePrimary,
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
    },
    tabBarBtnText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: isDark ? 'rgba(255, 255, 255, 0.42)' : '#64748B',
    },
    tabBarBtnTextActive: {
      color: isDark ? '#F58A07' : colors.bluePrimary,
      fontWeight: '800',
    },
    modalBody: {
      padding: 22,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    textInput: {
      backgroundColor: isDark ? '#000000' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: isDark ? '#FFFFFF' : colors.textPrimary,
    },
    modalActionBtn: {
      backgroundColor: colors.bluePrimary,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 20,
      shadowColor: colors.bluePrimary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    modalActionBtnText: {
      fontSize: 14.5,
      fontWeight: '700',
      color: isDark ? '#000000' : '#FFFFFF',
    },
    detailsScroll: {
      padding: 22,
    },
    groupKpiBar: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#000000' : '#F8FAFC',
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
    },
    groupKpiItem: {
      flex: 1,
      alignItems: 'center',
    },
    groupKpiLabel: {
      fontSize: 11,
      color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B',
      marginBottom: 4,
    },
    groupKpiValue: {
      fontSize: 15,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : colors.textPrimary,
    },
    actionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#000000' : colors.blueBadge,
      borderRadius: 14,
      padding: 12,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: isDark ? '#F58A07' : 'rgba(144, 210, 245, 0.3)',
    },
    actionBannerText: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#F9AB55' : colors.navyPrimary,
      flex: 1,
      marginRight: 8,
    },
    bannerBtn: {
      backgroundColor: colors.bluePrimary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    bannerBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#000000' : '#FFFFFF',
    },
    expenseFeed: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      marginBottom: 16,
    },
    expenseItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
    },
    expenseDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.bluePrimary,
      marginRight: 10,
    },
    settlementIconSmall: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: isDark ? '#000000' : '#EFF6FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    memberAvatarCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? '#000000' : colors.navyPrimary,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    memberAvatarInitial: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    youBadge: {
      backgroundColor: isDark ? 'rgba(245, 138, 7, 0.2)' : '#EFF6FF',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    youBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#F58A07' : colors.bluePrimary,
    },
    emptyStateBox: {
      padding: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#000000' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
      borderRadius: 14,
      marginBottom: 14,
    },
    emptyStateText: {
      fontSize: 13,
      color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B',
    },
    expenseMain: {
      flex: 1,
    },
    expenseItemTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : colors.textPrimary,
    },
    expenseItemPayer: {
      fontSize: 11.5,
      color: isDark ? '#A1A1AA' : '#64748B',
      marginTop: 1,
    },
    expenseItemAmount: {
      fontSize: 14,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : colors.textPrimary,
    },
    addGroupExpenseBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bluePrimary,
      borderRadius: 16,
      paddingVertical: 14,
      gap: 8,
      shadowColor: colors.bluePrimary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    addGroupExpenseBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    bottomSpacer: {
      height: 100,
    },
  });

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { AppIcon } from '../icons/AppIcon';
import { getCategoryIconConfig } from '../icons/categoryIcons';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { toast } from '../../context/ToastContext';
import { alert } from '../../context/AlertContext';
import {
  Account,
  AccountType,
  AdjustmentDirection,
  Category,
  CreateTransactionDto,
  PaymentMethod,
  Transaction,
  TransactionType,
  UpdateTransactionDto,
} from '../../api/types';
import { accountsApi } from '../../api/accounts';
import { categoriesApi } from '../../api/categories';
import { queryClient } from '../../state/queryClient';
import { generateClientTransactionId } from '../../utils/idempotency';
import { decimalInputToPaiseMinor } from '../../utils/money';
import { notificationService } from '../../services/notificationService';

export interface TransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    dto: CreateTransactionDto | UpdateTransactionDto,
    existingId?: string,
  ) => Promise<void> | void;
  onDelete?: (id: string, merchant?: string) => Promise<void> | void;
  initialData?: Transaction | null;
  defaultType?: TransactionType;
}

export const PAYMENT_METHOD_OPTIONS: { key: string; label: string }[] = [
  { key: 'UPI', label: 'UPI' },
  { key: 'CASH', label: 'Cash' },
  { key: 'DEBIT_CARD', label: 'Debit Card' },
  { key: 'CREDIT_CARD', label: 'Credit Card' },
  { key: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { key: 'WALLET', label: 'Wallet' },
  { key: 'OTHER', label: 'Other' },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health & Wellness',
  'Travel',
  'Education',
  'Groceries',
  'Other',
];

const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Investments',
  'Freelance',
  'Gift',
  'Refund',
  'Other',
];

const DEFAULT_FALLBACK_ACCOUNTS: Account[] = [
  {
    id: 'acc-cash',
    name: 'Cash',
    type: AccountType.CASH,
    balance: 0,
    currency: 'INR',
    isDefault: true,
  },
  {
    id: 'acc-bank',
    name: 'Primary Bank Account',
    type: AccountType.BANK,
    balance: 0,
    currency: 'INR',
    isDefault: false,
  },
];

export const getAccountEmoji = (type: AccountType | string) => {
  switch (type) {
    case AccountType.CASH:
      return '💵';
    case AccountType.BANK:
      return '🏦';
    case AccountType.WALLET:
      return '👛';
    case AccountType.CREDIT_CARD:
      return '💳';
    default:
      return '💰';
  }
};

export const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  initialData,
  defaultType = TransactionType.EXPENSE,
}) => {
  const { isDark, colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors, isDark), [themeColors, isDark]);

  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [accountId, setAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [adjustmentDirection, setAdjustmentDirection] = useState<AdjustmentDirection>(
    AdjustmentDirection.DECREASE,
  );
  const [originalTransactionId, setOriginalTransactionId] = useState('');

  // Accounts & Categories list
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_FALLBACK_ACCOUNTS);
  const [categories, setCategories] = useState<Category[]>([]);

  // New Category inline creation state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategoryLoading, setCreatingCategoryLoading] = useState(false);

  // Add Account Modal State
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [addAccountTarget, setAddAccountTarget] = useState<'source' | 'destination'>('source');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<AccountType>(AccountType.BANK);
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [addingAccountLoading, setAddingAccountLoading] = useState(false);

  // Submitting state and idempotency key
  const [submitting, setSubmitting] = useState(false);
  const clientTxIdRef = useRef<string>(generateClientTransactionId());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load accounts and categories from backend
  const loadMetadata = useCallback(async () => {
    try {
      const [fetchedAccounts, fetchedCategories] = await Promise.allSettled([
        accountsApi.getAccounts(),
        categoriesApi.getCategories(),
      ]);

      if (!isMountedRef.current) return;

      if (fetchedAccounts.status === 'fulfilled' && fetchedAccounts.value.length > 0) {
        setAccounts(fetchedAccounts.value);
        setAccountId((curr) => {
          if (curr) return curr;
          const defaultAcc =
            fetchedAccounts.value.find((a) => a.isDefault) || fetchedAccounts.value[0];
          return defaultAcc.id;
        });
      } else {
        setAccounts(DEFAULT_FALLBACK_ACCOUNTS);
        setAccountId((curr) => curr || DEFAULT_FALLBACK_ACCOUNTS[0].id);
      }

      if (fetchedCategories.status === 'fulfilled' && fetchedCategories.value.length > 0) {
        setCategories(fetchedCategories.value);
      }
    } catch {
      // Fallback defaults in place
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadMetadata();
    }
  }, [visible, loadMetadata]);

  // Sync initialData or reset on open
  useEffect(() => {
    if (!visible) return;

    if (initialData) {
      const initType = initialData.type || TransactionType.EXPENSE;
      setType(initType);
      setAmount(initialData.amount ? String(initialData.amount) : '');
      setMerchant(initialData.merchant || '');
      setCategory(initialData.category || 'Food & Dining');
      setCategoryId(initialData.categoryId || undefined);

      const fallbackAccId = accounts[0]?.id || '';
      if (initType === TransactionType.TRANSFER) {
        setAccountId(initialData.accountId || fallbackAccId);
        setDestinationAccountId(initialData.destinationAccountId || '');
      } else if (initType === TransactionType.INCOME || initType === TransactionType.REFUND) {
        setAccountId(initialData.destinationAccountId || initialData.accountId || fallbackAccId);
        setDestinationAccountId('');
      } else if (initType === TransactionType.ADJUSTMENT) {
        setAccountId(initialData.accountId || fallbackAccId);
        setAdjustmentDirection(initialData.adjustmentDirection || AdjustmentDirection.DECREASE);
      } else {
        setAccountId(initialData.accountId || fallbackAccId);
      }

      setPaymentMethod(initialData.paymentMethod || 'UPI');
      setNotes(initialData.notes || '');
      setReason(initialData.notes || '');
      setOriginalTransactionId(initialData.originalTransactionId || '');
    } else {
      setType(defaultType);
      setAmount('');
      setMerchant('');

      const isIncome = defaultType === TransactionType.INCOME;
      const initialCatName =
        isIncome
          ? 'Salary'
          : defaultType === TransactionType.REFUND
          ? 'Refund'
          : 'Food & Dining';
      setCategory(initialCatName);
      const catMatch = categories.find(
        (c) =>
          c.name.toLowerCase() === initialCatName.toLowerCase() &&
          (isIncome ? c.type === 'INCOME' : c.type === 'EXPENSE'),
      );
      setCategoryId(catMatch?.id);

      setAccountId((curr) => {
        if (curr && accounts.some((a) => a.id === curr)) return curr;
        const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
        return defaultAcc?.id || '';
      });
      setDestinationAccountId('');
      setPaymentMethod('UPI');
      setNotes('');
      setReason('');
      setAdjustmentDirection(AdjustmentDirection.DECREASE);
      setOriginalTransactionId('');
      // Fresh idempotency key for new transaction
      clientTxIdRef.current = generateClientTransactionId();
    }
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setIsAddingAccount(false);
    setNewAccountName('');
  }, [initialData, defaultType, visible]);

  const handleTypeSelect = (selected: TransactionType) => {
    setType(selected);
    const isIncome = selected === TransactionType.INCOME;
    const catName =
      isIncome
        ? 'Salary'
        : selected === TransactionType.REFUND
        ? 'Refund'
        : selected === TransactionType.TRANSFER
        ? 'Transfer'
        : selected === TransactionType.ADJUSTMENT
        ? 'Adjustment'
        : 'Food & Dining';
    setCategory(catName);
    const match = categories.find(
      (c) =>
        c.name.toLowerCase() === catName.toLowerCase() &&
        (isIncome ? c.type === 'INCOME' : c.type === 'EXPENSE'),
    );
    setCategoryId(match?.id);
  };

  const availableCategories = useMemo(() => {
    const isIncomeType = type === TransactionType.INCOME || type === TransactionType.REFUND;
    const backendMatching = categories.filter((c) =>
      isIncomeType ? c.type === 'INCOME' || c.type === 'ALL' : c.type === 'EXPENSE' || c.type === 'ALL',
    );

    if (backendMatching.length > 0) {
      return backendMatching.map((c) => ({ id: c.id, name: c.name, isCustom: c.isCustom }));
    }

    const defaultNames = isIncomeType ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
    return defaultNames.map((name) => ({ id: `default-${name}`, name, isCustom: false }));
  }, [categories, type]);

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast.error('Please enter a category name.', 'Category Required');
      return;
    }

    setCreatingCategoryLoading(true);
    try {
      const created = await categoriesApi.createCategory({
        name: trimmed,
        icon: 'Tag',
        color: colors.bluePrimary,
        type: type === TransactionType.INCOME ? 'INCOME' : 'EXPENSE',
      });
      setCategories((prev) => [...prev, created]);
      setCategory(created.name);
      setCategoryId(created.id);
      setIsCreatingCategory(false);
      setNewCategoryName('');
      toast.success(`Category "${created.name}" created.`, 'Category Added');
    } catch {
      // Local fallback if offline
      setCategory(trimmed);
      setIsCreatingCategory(false);
      setNewCategoryName('');
      toast.info(`Selected "${trimmed}".`, 'Category Set');
    } finally {
      setCreatingCategoryLoading(false);
    }
  };

  const handleOpenAddAccount = (target: 'source' | 'destination') => {
    setAddAccountTarget(target);
    setNewAccountName('');
    setNewAccountType(AccountType.BANK);
    setNewAccountBalance('');
    setIsAddingAccount(true);
  };

  const handleCreateAccount = async () => {
    const trimmedName = newAccountName.trim();
    if (!trimmedName) {
      toast.error('Please enter an account name.', 'Account Name Required');
      return;
    }

    setAddingAccountLoading(true);
    try {
      const initBal = parseFloat(newAccountBalance.trim());
      const newAcc = await accountsApi.createAccount({
        name: trimmedName,
        type: newAccountType,
        initialBalance: isNaN(initBal) ? 0 : initBal,
      });

      queryClient.invalidateQueries(['accounts']);
      queryClient.invalidateQueries(['home']);

      setAccounts((prev) => [...prev, newAcc]);
      if (addAccountTarget === 'destination') {
        setDestinationAccountId(newAcc.id);
      } else {
        setAccountId(newAcc.id);
      }

      setIsAddingAccount(false);
      toast.success(`Account "${newAcc.name}" created.`, 'Account Added');
      notificationService.addNotification({
        title: 'Account Linked',
        message: `New account "${newAcc.name}" has been created.`,
        iconName: 'Wallet',
        iconColor: '#084887',
        iconBg: '#E0F2FE',
        payload: { accountId: newAcc.id },
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create account.', 'Error');
    } finally {
      setAddingAccountLoading(false);
    }
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount.trim());
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0.', 'Invalid Amount');
      return;
    }

    if (!accountId) {
      const accountLabel =
        type === TransactionType.INCOME || type === TransactionType.REFUND
          ? 'Received Into'
          : type === TransactionType.EXPENSE
          ? 'Paid From'
          : type === TransactionType.TRANSFER
          ? 'Transfer From'
          : 'Account';
      toast.error(`Please select an account for ${accountLabel}.`, 'Account Required');
      return;
    }

    if (type === TransactionType.EXPENSE) {
      if (!category) {
        toast.error('Please select a category.', 'Category Required');
        return;
      }
      if (!paymentMethod) {
        toast.error('Please select a payment method.', 'Payment Method Required');
        return;
      }
    } else if (type === TransactionType.INCOME) {
      if (!category) {
        toast.error('Please select a category.', 'Category Required');
        return;
      }
    } else if (type === TransactionType.TRANSFER) {
      if (!destinationAccountId) {
        toast.error('Please select a destination account for the transfer.', 'Transfer Destination');
        return;
      }
      if (destinationAccountId === accountId) {
        toast.error('Source and destination accounts cannot be the same.', 'Invalid Transfer');
        return;
      }
    } else if (type === TransactionType.REFUND) {
      // Amount and Received Into already validated
    } else if (type === TransactionType.ADJUSTMENT) {
      if (!reason.trim()) {
        toast.error('Please provide a reason for the adjustment.', 'Reason Required');
        return;
      }
    }

    let defaultTitle = category;
    if (type === TransactionType.EXPENSE) {
      defaultTitle = merchant.trim() || category;
    } else if (type === TransactionType.INCOME) {
      defaultTitle = merchant.trim() || 'Income Deposit';
    } else if (type === TransactionType.TRANSFER) {
      const fromAcc = accounts.find((a) => a.id === accountId)?.name || 'Account';
      const toAcc = accounts.find((a) => a.id === destinationAccountId)?.name || 'Account';
      defaultTitle = `Transfer: ${fromAcc} → ${toAcc}`;
    } else if (type === TransactionType.REFUND) {
      defaultTitle = merchant.trim() || 'Refund Received';
    } else if (type === TransactionType.ADJUSTMENT) {
      defaultTitle = `Balance Adjustment (${adjustmentDirection === AdjustmentDirection.INCREASE ? '+' : '-'})`;
    }

    const payload: CreateTransactionDto = {
      clientTransactionId: clientTxIdRef.current,
      type,
      amount: Math.round(numAmount * 100) / 100,
      amountMinor: decimalInputToPaiseMinor(amount.trim()),
      category: type === TransactionType.TRANSFER || type === TransactionType.ADJUSTMENT ? '' : category,
      categoryId: type === TransactionType.TRANSFER || type === TransactionType.ADJUSTMENT ? undefined : categoryId,
      accountId,
      destinationAccountId:
        type === TransactionType.TRANSFER
          ? destinationAccountId
          : type === TransactionType.INCOME || type === TransactionType.REFUND
          ? accountId
          : undefined,
      paymentMethod: type === TransactionType.EXPENSE ? paymentMethod : undefined,
      merchant: merchant.trim() || defaultTitle,
      notes: type === TransactionType.ADJUSTMENT ? reason.trim() : (notes.trim() || undefined),
      reason: type === TransactionType.ADJUSTMENT ? reason.trim() : undefined,
      adjustmentDirection: type === TransactionType.ADJUSTMENT ? adjustmentDirection : undefined,
      originalTransactionId: type === TransactionType.REFUND && originalTransactionId.trim() ? originalTransactionId.trim() : undefined,
      incurredAt: initialData?.incurredAt || new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      await onSave(payload, initialData?.id);
      onClose();
    } catch {
      // Retain clientTxIdRef on error for idempotent retry!
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !onDelete) return;
    const confirmed = await alert.confirm({
      title: 'Delete Transaction',
      message: `Are you sure you want to delete this ${initialData.amount ? `₹${initialData.amount} ` : ''}transaction? This will reverse any account balance changes.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'Trash2',
    });
    if (!confirmed) return;

    try {
      await onDelete(initialData.id, initialData.merchant || undefined);
      onClose();
    } catch {}
  };

  const isEditing = Boolean(initialData);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          {/* Handle indicator */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {isEditing ? 'Edit Transaction' : 'Record Transaction'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeBtn}
            >
              <AppIcon name="X" size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Transaction Type Selector Tabs */}
            {!isEditing && (
              <View style={styles.typeTabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeTabsScroll}>
                  {[
                    { key: TransactionType.EXPENSE, label: 'Expense', icon: 'ArrowDown' },
                    { key: TransactionType.INCOME, label: 'Income', icon: 'ArrowUp' },
                    { key: TransactionType.TRANSFER, label: 'Transfer', icon: 'ArrowRight' },
                    { key: TransactionType.REFUND, label: 'Refund', icon: 'ArrowDownLeft' },
                    { key: TransactionType.ADJUSTMENT, label: 'Adjustment', icon: 'SlidersHorizontal' },
                  ].map((tab) => {
                    const isSelected = type === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[
                          styles.typeTab,
                          isSelected && styles.typeTabActive,
                          isSelected && tab.key === TransactionType.EXPENSE && styles.typeTabExpense,
                          isSelected && tab.key === TransactionType.INCOME && styles.typeTabIncome,
                          isSelected && tab.key === TransactionType.TRANSFER && styles.typeTabTransfer,
                          isSelected && tab.key === TransactionType.REFUND && styles.typeTabRefund,
                          isSelected && tab.key === TransactionType.ADJUSTMENT && styles.typeTabAdjustment,
                        ]}
                        onPress={() => handleTypeSelect(tab.key)}
                        activeOpacity={0.8}
                      >
                        <AppIcon
                          name={tab.icon as any}
                          size={14}
                          color={isSelected ? '#FFFFFF' : isDark ? '#A1A1AA' : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.typeTabText,
                            isSelected && styles.typeTabTextActive,
                          ]}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* 2. Amount-First Fast Entry */}
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>AMOUNT</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  autoFocus={!isEditing}
                />
              </View>
            </View>

            {/* 3. Type-Specific Form Sections */}

            {/* ======================================================== */}
            {/* 1. EXPENSE FORM                                          */}
            {/* ======================================================== */}
            {type === TransactionType.EXPENSE && (
              <>
                {/* Category (Required) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <View style={styles.categoryPillsWrap}>
                    {availableCategories.map((cat) => {
                      const isSelected = category === cat.name;
                      const iconCfg = getCategoryIconConfig(cat.name, isDark);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                          onPress={() => {
                            setCategory(cat.name);
                            setCategoryId(cat.id.startsWith('default-') ? undefined : cat.id);
                          }}
                        >
                          <AppIcon
                            name={iconCfg.iconName}
                            size={13}
                            color={isSelected ? '#FFFFFF' : iconCfg.iconColor}
                          />
                          <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      style={styles.createCatBtn}
                      onPress={() => setIsCreatingCategory(true)}
                    >
                      <AppIcon name="Plus" size={13} color={colors.bluePrimary} />
                      <Text style={styles.createCatBtnText}>New Category</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Paid From (User Accounts) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Paid From</Text>
                  <View style={styles.pillSelectorRow}>
                    {accounts.map((acc) => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[styles.accountPill, accountId === acc.id && styles.accountPillActive]}
                        onPress={() => setAccountId(acc.id)}
                      >
                        <Text style={styles.accountEmoji}>{getAccountEmoji(acc.type)}</Text>
                        <Text style={[styles.accountPillText, accountId === acc.id && styles.accountPillTextActive]}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.addAccountBtn}
                      onPress={() => handleOpenAddAccount('source')}
                    >
                      <AppIcon name="Plus" size={13} color={colors.bluePrimary} />
                      <Text style={styles.addAccountBtnText}>Add Account</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Payment Method (How payment happened) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Payment Method</Text>
                  <View style={styles.pillSelectorRow}>
                    {PAYMENT_METHOD_OPTIONS.map((method) => {
                      const isSelected = paymentMethod === method.key;
                      return (
                        <TouchableOpacity
                          key={method.key}
                          style={[styles.smallPill, isSelected && styles.smallPillActive]}
                          onPress={() => setPaymentMethod(method.key)}
                        >
                          <Text style={[styles.smallPillText, isSelected && styles.smallPillTextActive]}>
                            {method.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Payee / Merchant (Optional) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Payee / Merchant (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Starbucks, Swiggy, Amazon"
                    placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                    value={merchant}
                    onChangeText={setMerchant}
                  />
                </View>

                {/* Notes (Optional) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Note (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.notesInput]}
                    placeholder="Add contextual note or reference..."
                    placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </>
            )}

            {/* ======================================================== */}
            {/* 2. INCOME FORM (NO Payment Method)                       */}
            {/* ======================================================== */}
            {type === TransactionType.INCOME && (
              <>
                {/* Category (Required) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <View style={styles.categoryPillsWrap}>
                    {availableCategories.map((cat) => {
                      const isSelected = category === cat.name;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.categoryChip, isSelected && styles.categoryChipIncomeActive]}
                          onPress={() => {
                            setCategory(cat.name);
                            setCategoryId(cat.id.startsWith('default-') ? undefined : cat.id);
                          }}
                        >
                          <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      style={styles.createCatBtn}
                      onPress={() => setIsCreatingCategory(true)}
                    >
                      <AppIcon name="Plus" size={13} color="#16A34A" />
                      <Text style={[styles.createCatBtnText, { color: '#16A34A' }]}>New Category</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Received Into (User Accounts) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Received Into</Text>
                  <View style={styles.pillSelectorRow}>
                    {accounts.map((acc) => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[styles.accountPill, accountId === acc.id && styles.accountPillIncomeActive]}
                        onPress={() => setAccountId(acc.id)}
                      >
                        <Text style={styles.accountEmoji}>{getAccountEmoji(acc.type)}</Text>
                        <Text style={[styles.accountPillText, accountId === acc.id && styles.accountPillTextActive]}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.addAccountBtn}
                      onPress={() => handleOpenAddAccount('source')}
                    >
                      <AppIcon name="Plus" size={13} color="#16A34A" />
                      <Text style={[styles.addAccountBtnText, { color: '#16A34A' }]}>Add Account</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Source / From (Optional) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Source / From (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Employer, Client, Investment Return"
                    placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                    value={merchant}
                    onChangeText={setMerchant}
                  />
                </View>

                {/* Note (Optional) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Note (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.notesInput]}
                    placeholder="Add contextual note or reference..."
                    placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </>
            )}

            {/* ======================================================== */}
            {/* 3. TRANSFER FORM (NO Category, NO Payment Method)        */}
            {/* ======================================================== */}
            {type === TransactionType.TRANSFER && (
              <>
                <View style={styles.transferFlowCard}>
                  {/* Transfer From */}
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Transfer From</Text>
                    <View style={styles.pillSelectorRow}>
                      {accounts.map((acc) => (
                        <TouchableOpacity
                          key={acc.id}
                          style={[styles.accountPill, accountId === acc.id && styles.accountPillTransferActive]}
                          onPress={() => setAccountId(acc.id)}
                        >
                          <Text style={styles.accountEmoji}>{getAccountEmoji(acc.type)}</Text>
                          <Text style={[styles.accountPillText, accountId === acc.id && styles.accountPillTextActive]}>
                            {acc.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={styles.addAccountBtn}
                        onPress={() => handleOpenAddAccount('source')}
                      >
                        <AppIcon name="Plus" size={13} color={colors.navyPrimary} />
                        <Text style={[styles.addAccountBtnText, { color: colors.navyPrimary }]}>Add Account</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.transferArrowRow}>
                    <View style={styles.transferArrowBadge}>
                      <AppIcon name="ArrowDown" size={16} color={colors.navyPrimary} />
                    </View>
                  </View>

                  {/* Transfer To */}
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Transfer To</Text>
                    <View style={styles.pillSelectorRow}>
                      {accounts.map((acc) => {
                        const isSource = acc.id === accountId;
                        const isSelected = destinationAccountId === acc.id;
                        return (
                          <TouchableOpacity
                            key={acc.id}
                            disabled={isSource}
                            style={[
                              styles.accountPill,
                              isSelected && styles.accountPillTransferActive,
                              isSource && styles.accountPillDisabled,
                            ]}
                            onPress={() => setDestinationAccountId(acc.id)}
                          >
                            <Text style={styles.accountEmoji}>{getAccountEmoji(acc.type)}</Text>
                            <Text
                              style={[
                                styles.accountPillText,
                                isSelected && styles.accountPillTextActive,
                                isSource && styles.accountPillTextDisabled,
                              ]}
                            >
                              {acc.name} {isSource ? '(Source)' : ''}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      <TouchableOpacity
                        style={styles.addAccountBtn}
                        onPress={() => handleOpenAddAccount('destination')}
                      >
                        <AppIcon name="Plus" size={13} color={colors.navyPrimary} />
                        <Text style={[styles.addAccountBtnText, { color: colors.navyPrimary }]}>Add Account</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Note (Optional) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Note (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.notesInput]}
                    placeholder="Add contextual note or reference..."
                    placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </>
            )}

            {/* ======================================================== */}
            {/* 4. REFUND FORM (NO Payment Method)                       */}
            {/* ======================================================== */}
            {type === TransactionType.REFUND && (
              <>
                {/* Received Into */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Received Into</Text>
                  <View style={styles.pillSelectorRow}>
                    {accounts.map((acc) => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[styles.accountPill, accountId === acc.id && styles.accountPillRefundActive]}
                        onPress={() => setAccountId(acc.id)}
                      >
                        <Text style={styles.accountEmoji}>{getAccountEmoji(acc.type)}</Text>
                        <Text style={[styles.accountPillText, accountId === acc.id && styles.accountPillTextActive]}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.addAccountBtn}
                      onPress={() => handleOpenAddAccount('source')}
                    >
                      <AppIcon name="Plus" size={13} color="#0284C7" />
                      <Text style={[styles.addAccountBtnText, { color: '#0284C7' }]}>Add Account</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Original Transaction / Reference (Optional) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Original Transaction (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Original transaction ID or reference..."
                    placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                    value={originalTransactionId}
                    onChangeText={setOriginalTransactionId}
                  />
                </View>

                {/* Original Merchant / Payee (Optional) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Source / Merchant (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Amazon Refund, Airline Cancellation"
                    placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                    value={merchant}
                    onChangeText={setMerchant}
                  />
                </View>

                {/* Note (Optional) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Note (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.notesInput]}
                    placeholder="Add contextual note or reference..."
                    placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </>
            )}

            {/* ======================================================== */}
            {/* 5. ADJUSTMENT FORM (NO Category, NO Payment Method)      */}
            {/* ======================================================== */}
            {type === TransactionType.ADJUSTMENT && (
              <>
                {/* Account */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Account</Text>
                  <View style={styles.pillSelectorRow}>
                    {accounts.map((acc) => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[styles.accountPill, accountId === acc.id && styles.accountPillAdjustmentActive]}
                        onPress={() => setAccountId(acc.id)}
                      >
                        <Text style={styles.accountEmoji}>{getAccountEmoji(acc.type)}</Text>
                        <Text style={[styles.accountPillText, accountId === acc.id && styles.accountPillTextActive]}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.addAccountBtn}
                      onPress={() => handleOpenAddAccount('source')}
                    >
                      <AppIcon name="Plus" size={13} color="#D97706" />
                      <Text style={[styles.addAccountBtnText, { color: '#D97706' }]}>Add Account</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Direction */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Direction</Text>
                  <View style={styles.directionRow}>
                    <TouchableOpacity
                      style={[
                        styles.directionBtn,
                        adjustmentDirection === AdjustmentDirection.INCREASE && styles.directionIncreaseActive,
                      ]}
                      onPress={() => setAdjustmentDirection(AdjustmentDirection.INCREASE)}
                    >
                      <AppIcon
                        name="Plus"
                        size={16}
                        color={adjustmentDirection === AdjustmentDirection.INCREASE ? '#FFFFFF' : '#16A34A'}
                      />
                      <Text
                        style={[
                          styles.directionBtnText,
                          adjustmentDirection === AdjustmentDirection.INCREASE && styles.directionBtnTextActive,
                        ]}
                      >
                        Increase (+)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.directionBtn,
                        adjustmentDirection === AdjustmentDirection.DECREASE && styles.directionDecreaseActive,
                      ]}
                      onPress={() => setAdjustmentDirection(AdjustmentDirection.DECREASE)}
                    >
                      <AppIcon
                        name="Minus"
                        size={16}
                        color={adjustmentDirection === AdjustmentDirection.DECREASE ? '#FFFFFF' : '#DC2626'}
                      />
                      <Text
                        style={[
                          styles.directionBtnText,
                          adjustmentDirection === AdjustmentDirection.DECREASE && styles.directionBtnTextActive,
                        ]}
                      >
                        Decrease (-)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Reason (Required for Adjustment!) */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Reason (Required)</Text>
                  <TextInput
                    style={[styles.textInput, styles.notesInput]}
                    placeholder="e.g. Cash count reconciliation, bank fee correction..."
                    placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </>
            )}

            {/* Inline New Category Creator */}
            {isCreatingCategory && (
              <View style={styles.inlineCreateCatBox}>
                <Text style={styles.inlineCreateCatTitle}>+ New Custom Category</Text>
                <View style={styles.inlineCreateCatRow}>
                  <TextInput
                    style={styles.inlineCatInput}
                    placeholder="Category name..."
                    placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.inlineCatSaveBtn}
                    onPress={handleCreateCategory}
                    disabled={creatingCategoryLoading}
                  >
                    {creatingCategoryLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.inlineCatSaveBtnText}>Add</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.inlineCatCancelBtn}
                    onPress={() => {
                      setIsCreatingCategory(false);
                      setNewCategoryName('');
                    }}
                  >
                    <AppIcon name="X" size={16} color={isDark ? '#A1A1AA' : '#64748B'} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Inline Add Account Creator */}
            {isAddingAccount && (
              <View style={styles.inlineAddAccountBox}>
                <View style={styles.inlineAddAccountHeader}>
                  <Text style={styles.inlineAddAccountTitle}>
                    + Add New Account ({addAccountTarget === 'destination' ? 'Transfer To' : 'Account'})
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsAddingAccount(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <AppIcon name="X" size={16} color={isDark ? '#A1A1AA' : '#64748B'} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.inlineAccInput}
                  placeholder="Account name (e.g. HDFC Savings, Paytm Wallet)"
                  placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
                  value={newAccountName}
                  onChangeText={setNewAccountName}
                  autoFocus
                />

                <View style={styles.accountTypeRow}>
                  {[
                    { type: AccountType.BANK, label: 'Bank', emoji: '🏦' },
                    { type: AccountType.CASH, label: 'Cash', emoji: '💵' },
                    { type: AccountType.WALLET, label: 'Wallet', emoji: '👛' },
                    { type: AccountType.CREDIT_CARD, label: 'Card', emoji: '💳' },
                  ].map((t) => (
                    <TouchableOpacity
                      key={t.type}
                      style={[
                        styles.accTypePill,
                        newAccountType === t.type && styles.accTypePillActive,
                      ]}
                      onPress={() => setNewAccountType(t.type)}
                    >
                      <Text style={styles.accTypeEmoji}>{t.emoji}</Text>
                      <Text
                        style={[
                          styles.accTypeLabel,
                          newAccountType === t.type && styles.accTypeLabelActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.inlineAccInput}
                  placeholder="Initial balance (optional, ₹)"
                  placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
                  keyboardType="numeric"
                  value={newAccountBalance}
                  onChangeText={setNewAccountBalance}
                />

                <TouchableOpacity
                  style={styles.inlineAccSaveBtn}
                  onPress={handleCreateAccount}
                  disabled={addingAccountLoading}
                >
                  {addingAccountLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.inlineAccSaveBtnText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.sheetFooter}>
            {isEditing && onDelete && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                activeOpacity={0.8}
              >
                <AppIcon name="Trash2" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.saveBtn,
                submitting && styles.saveBtnDisabled,
                type === TransactionType.INCOME && styles.saveBtnIncome,
                type === TransactionType.TRANSFER && styles.saveBtnTransfer,
                type === TransactionType.REFUND && styles.saveBtnRefund,
                type === TransactionType.ADJUSTMENT && styles.saveBtnAdjustment,
              ]}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {isEditing ? 'Save Changes' : `Save ${type}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (themeColors: typeof colors, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    backdrop: {
      flex: 1,
    },
    sheetContainer: {
      backgroundColor: isDark ? '#121214' : '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '88%',
      paddingBottom: Platform.OS === 'ios' ? 24 : 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
    },
    handleBar: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? '#3F3F46' : '#CBD5E1',
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 6,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      letterSpacing: -0.3,
    },
    closeBtn: {
      padding: 4,
    },
    bodyScroll: {
      paddingHorizontal: 20,
      paddingTop: 14,
    },
    typeTabsContainer: {
      marginBottom: 16,
    },
    typeTabsScroll: {
      flexDirection: 'row',
      gap: 8,
    },
    typeTab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
    },
    typeTabActive: {
      backgroundColor: colors.bluePrimary,
    },
    typeTabExpense: {
      backgroundColor: colors.bluePrimary,
    },
    typeTabIncome: {
      backgroundColor: '#16A34A',
    },
    typeTabTransfer: {
      backgroundColor: colors.navyPrimary,
    },
    typeTabRefund: {
      backgroundColor: '#0284C7',
    },
    typeTabAdjustment: {
      backgroundColor: '#D97706',
    },
    typeTabText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    typeTabTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    amountContainer: {
      backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    amountLabel: {
      fontSize: 10.5,
      fontWeight: '700',
      color: isDark ? '#A1A1AA' : '#64748B',
      letterSpacing: 1.1,
      marginBottom: 6,
    },
    amountInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    currencySymbol: {
      fontSize: 32,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      marginRight: 6,
    },
    amountInput: {
      flex: 1,
      fontSize: 34,
      fontWeight: '900',
      color: isDark ? '#FFFFFF' : '#0F172A',
      padding: 0,
    },
    formGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 12.5,
      fontWeight: '700',
      color: isDark ? '#E4E4E7' : '#1E293B',
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    notesInput: {
      minHeight: 56,
      textAlignVertical: 'top',
    },
    pillSelectorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
    },
    accountPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    accountEmoji: {
      fontSize: 14,
    },
    accountPillActive: {
      backgroundColor: colors.bluePrimary,
      borderColor: colors.bluePrimary,
    },
    accountPillIncomeActive: {
      backgroundColor: '#16A34A',
      borderColor: '#16A34A',
    },
    accountPillTransferActive: {
      backgroundColor: colors.navyPrimary,
      borderColor: colors.navyPrimary,
    },
    accountPillRefundActive: {
      backgroundColor: '#0284C7',
      borderColor: '#0284C7',
    },
    accountPillAdjustmentActive: {
      backgroundColor: '#D97706',
      borderColor: '#D97706',
    },
    accountPillDisabled: {
      opacity: 0.4,
    },
    accountPillText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: isDark ? '#E4E4E7' : '#334155',
    },
    accountPillTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    accountPillTextDisabled: {
      color: isDark ? '#71717A' : '#94A3B8',
    },
    addAccountBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: isDark ? '#52525B' : '#94A3B8',
    },
    addAccountBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.bluePrimary,
    },
    categoryPillsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    categoryChipActive: {
      backgroundColor: colors.bluePrimary,
      borderColor: colors.bluePrimary,
    },
    categoryChipIncomeActive: {
      backgroundColor: '#16A34A',
      borderColor: '#16A34A',
    },
    categoryChipText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: isDark ? '#D4D4D8' : '#334155',
    },
    categoryChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    createCatBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.bluePrimary,
    },
    createCatBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.bluePrimary,
    },
    smallPill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
    },
    smallPillActive: {
      backgroundColor: colors.bluePrimary,
    },
    smallPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    smallPillTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    transferFlowCard: {
      backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    transferArrowRow: {
      alignItems: 'center',
      marginVertical: 4,
    },
    transferArrowBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: isDark ? '#27272A' : '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    directionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    directionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    },
    directionIncreaseActive: {
      backgroundColor: '#16A34A',
      borderColor: '#16A34A',
    },
    directionDecreaseActive: {
      backgroundColor: '#DC2626',
      borderColor: '#DC2626',
    },
    directionBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    directionBtnTextActive: {
      color: '#FFFFFF',
    },
    inlineCreateCatBox: {
      backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
      borderRadius: 14,
      padding: 12,
      marginTop: 8,
    },
    inlineCreateCatTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#D4D4D8' : '#334155',
      marginBottom: 6,
    },
    inlineCreateCatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    inlineCatInput: {
      flex: 1,
      height: 38,
      backgroundColor: isDark ? '#27272A' : '#FFFFFF',
      borderRadius: 10,
      paddingHorizontal: 10,
      fontSize: 13,
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    inlineCatSaveBtn: {
      backgroundColor: colors.bluePrimary,
      paddingHorizontal: 14,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inlineCatSaveBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 12.5,
    },
    inlineCatCancelBtn: {
      padding: 6,
    },
    // Inline Add Account Box
    inlineAddAccountBox: {
      backgroundColor: isDark ? '#18181B' : '#F1F5F9',
      borderRadius: 16,
      padding: 14,
      marginTop: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
      gap: 10,
    },
    inlineAddAccountHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    inlineAddAccountTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    inlineAccInput: {
      backgroundColor: isDark ? '#27272A' : '#FFFFFF',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: isDark ? '#FFFFFF' : '#0F172A',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    accountTypeRow: {
      flexDirection: 'row',
      gap: 6,
    },
    accTypePill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: isDark ? '#27272A' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    accTypePillActive: {
      backgroundColor: colors.bluePrimary,
      borderColor: colors.bluePrimary,
    },
    accTypeEmoji: {
      fontSize: 12,
    },
    accTypeLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#A1A1AA' : '#64748B',
    },
    accTypeLabelActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    inlineAccSaveBtn: {
      backgroundColor: colors.bluePrimary,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inlineAccSaveBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 13,
    },
    sheetFooter: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
    },
    deleteBtn: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtn: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.bluePrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnIncome: {
      backgroundColor: '#16A34A',
    },
    saveBtnTransfer: {
      backgroundColor: colors.navyPrimary,
    },
    saveBtnRefund: {
      backgroundColor: '#0284C7',
    },
    saveBtnAdjustment: {
      backgroundColor: '#D97706',
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
  });

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { AppIcon } from '../icons/AppIcon';
import { CATEGORY_ICON_REGISTRY } from '../icons/categoryIcons';
import { ExpenseItem } from '../../data/mockData';
import { colors } from '../../theme/colors';
import { toast } from '../../context/ToastContext';
import { alert } from '../../context/AlertContext';

interface TransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    transaction: {
      title: string;
      merchant: string;
      category: string;
      amount: number;
      type: 'expense' | 'income';
      paymentMethod: string;
      notes?: string;
      incurredAt?: string;
    },
    existingId?: string,
  ) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  initialData?: ExpenseItem | null;
  defaultType?: 'expense' | 'income';
}

const EXPENSE_CATEGORIES = [
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

const INCOME_CATEGORIES = [
  'Salary',
  'Investments',
  'Gift',
  'Other',
];

const PAYMENT_METHODS = ['UPI', 'Card', 'Bank', 'Cash'];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  initialData,
  defaultType = 'expense',
}) => {
  const [type, setType] = useState<'expense' | 'income'>(defaultType);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type || 'expense');
      setAmount(initialData.amount ? String(initialData.amount) : '');
      setMerchant(initialData.merchant || '');
      setCategory(initialData.category || 'Food & Dining');
      setPaymentMethod(initialData.paymentMethod || 'UPI');
      setNotes(initialData.notes || '');
    } else {
      setType(defaultType);
      setAmount('');
      setMerchant('');
      setCategory(defaultType === 'expense' ? 'Food & Dining' : 'Salary');
      setPaymentMethod('UPI');
      setNotes('');
    }
  }, [initialData, defaultType, visible]);

  const handleTypeChange = (newType: 'expense' | 'income') => {
    setType(newType);
    if (newType === 'expense' && !EXPENSE_CATEGORIES.includes(category)) {
      setCategory('Food & Dining');
    } else if (newType === 'income' && !INCOME_CATEGORIES.includes(category)) {
      setCategory('Salary');
    }
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount.trim());
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0.', 'Invalid Amount');
      return;
    }

    const cleanMerchant = merchant.trim() || (type === 'expense' ? category : 'Income Deposit');

    setSubmitting(true);
    try {
      await onSave(
        {
          title: cleanMerchant,
          merchant: cleanMerchant,
          category,
          amount: numAmount,
          type,
          paymentMethod,
          notes: notes.trim() || undefined,
          incurredAt: new Date().toISOString(),
        },
        initialData?.id,
      );
      onClose();
    } catch {
      // Error handled in callback
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !onDelete) return;
    const confirmed = await alert.confirm({
      title: 'Delete Transaction',
      message: `Are you sure you want to delete this ${initialData.amount ? `₹${initialData.amount} ` : ''}transaction? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      icon: 'Trash2',
    });
    if (!confirmed) return;
    setSubmitting(true);
    try {
      await onDelete(initialData.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const availableCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

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
          {/* Sheet Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {initialData ? 'Edit Transaction' : 'Add Transaction'}
            </Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AppIcon name="X" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* Type Selector (Expense vs Income) */}
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  type === 'expense' && styles.segmentBtnActiveExpense,
                ]}
                activeOpacity={0.8}
                onPress={() => handleTypeChange('expense')}
              >
                <AppIcon
                  name="ArrowUpRight"
                  size={16}
                  color={type === 'expense' ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.segmentText,
                    type === 'expense' && styles.segmentTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  type === 'income' && styles.segmentBtnActiveIncome,
                ]}
                activeOpacity={0.8}
                onPress={() => handleTypeChange('income')}
              >
                <AppIcon
                  name="ArrowDownLeft"
                  size={16}
                  color={type === 'income' ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.segmentText,
                    type === 'income' && styles.segmentTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus={!initialData}
              />
            </View>

            {/* Title / Merchant */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {type === 'expense' ? 'Merchant / Description' : 'Source / Description'}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder={type === 'expense' ? 'e.g. Starbucks, Uber, Grocery' : 'e.g. Salary, Client Payout'}
                placeholderTextColor="#94A3B8"
                value={merchant}
                onChangeText={setMerchant}
              />
            </View>

            {/* Category Pills */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPillsScroll}
              >
                {availableCategories.map((cat) => {
                  const isSelected = category === cat;
                  const catConfig = CATEGORY_ICON_REGISTRY[cat] || {
                    iconName: 'Tag',
                    iconColor: '#64748B',
                    backgroundColor: '#F1F5F9',
                  };

                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryPill,
                        isSelected && styles.categoryPillSelected,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setCategory(cat)}
                    >
                      <View
                        style={[
                          styles.catIconCircle,
                          { backgroundColor: catConfig.backgroundColor },
                        ]}
                      >
                        <AppIcon
                          name={catConfig.iconName}
                          size={13}
                          color={catConfig.iconColor}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected && styles.categoryPillTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Payment Method */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.methodRow}>
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodChip,
                        isSelected && styles.methodChipSelected,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text
                        style={[
                          styles.methodText,
                          isSelected && styles.methodTextSelected,
                        ]}
                      >
                        {method}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                placeholder="Add receipt note or tag..."
                placeholderTextColor="#94A3B8"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              {initialData && onDelete && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  activeOpacity={0.8}
                  onPress={handleDelete}
                  disabled={submitting}
                >
                  <AppIcon name="Trash2" size={18} color="#DC2626" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  type === 'income' ? styles.saveBtnIncome : styles.saveBtnExpense,
                  submitting && { opacity: 0.7 },
                ]}
                activeOpacity={0.85}
                onPress={handleSave}
                disabled={submitting}
              >
                <Text style={styles.saveBtnText}>
                  {submitting ? 'Saving...' : initialData ? 'Update Transaction' : 'Save Transaction'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 31, 70, 0.65)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  handle: {
    width: 40,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 24,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  segmentBtnActiveExpense: {
    backgroundColor: colors.navyDeep,
  },
  segmentBtnActiveIncome: {
    backgroundColor: '#10B981',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 18,
  },
  currencySymbol: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 6,
  },
  amountInput: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.textPrimary,
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  notesInput: {
    height: 64,
    textAlignVertical: 'top',
  },
  categoryPillsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryPillSelected: {
    backgroundColor: colors.blueBadge,
    borderColor: colors.bluePrimary,
  },
  catIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextSelected: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodChipSelected: {
    backgroundColor: colors.navyDeep,
    borderColor: colors.navyDeep,
  },
  methodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  methodTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnExpense: {
    backgroundColor: colors.bluePrimary,
    shadowColor: colors.bluePrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnIncome: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

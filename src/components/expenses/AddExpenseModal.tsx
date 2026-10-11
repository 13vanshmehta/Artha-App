import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { Icon, IconName } from '../common/Icon';
import { ExpenseItem } from '../../data/mockData';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (expense: Omit<ExpenseItem, 'id'>) => void;
}

const CATEGORIES: { label: string; icon: IconName }[] = [
  { label: 'Food', icon: 'food' },
  { label: 'Shopping', icon: 'shopping' },
  { label: 'Travel', icon: 'travel' },
  { label: 'Bills', icon: 'bills' },
  { label: 'Entertainment', icon: 'entertainment' },
  { label: 'Other', icon: 'other' },
];

const PAYMENT_METHODS = [
  'UPI · Google Pay',
  'UPI · PhonePe',
  'Credit Card',
  'Debit Card',
  'Cash',
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = React.memo(({
  visible,
  onClose,
  onSave,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [merchant, setMerchant] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [selectedPayment, setSelectedPayment] = useState('UPI · Google Pay');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    const parsedAmount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid expense amount.');
      return;
    }
    if (!merchant.trim()) {
      setErrorMsg('Please enter a merchant or description.');
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    onSave({
      amount: parsedAmount,
      merchant: merchant.trim(),
      category: selectedCategory,
      paymentMethod: selectedPayment,
      type: 'expense',
      dateStr: 'Today',
      timeStr,
      dateGroup: 'Today',
    });

    // Reset fields & close
    setAmountStr('');
    setMerchant('');
    setSelectedCategory('Food');
    setSelectedPayment('UPI · Google Pay');
    setErrorMsg(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          {/* Top Grabber Handle */}
          <View style={styles.grabber} />

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              activeOpacity={0.7}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close Modal"
            >
              <Icon name="close" size={16} color={colors.navyDeep} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* Amount Input */}
            <View style={styles.amountInputBlock}>
              <Text style={styles.inputLabel}>AMOUNT</Text>
              <View style={styles.amountFieldRow}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={colors.textLightSubtle}
                  keyboardType="numeric"
                  value={amountStr}
                  onChangeText={(val) => {
                    setErrorMsg(null);
                    setAmountStr(val);
                  }}
                  autoFocus
                />
              </View>
            </View>

            {/* Merchant / Description Input */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>MERCHANT / TITLE</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Swiggy, Starbucks, Grocery"
                placeholderTextColor={colors.textMuted}
                value={merchant}
                onChangeText={(val) => {
                  setErrorMsg(null);
                  setMerchant(val);
                }}
              />
            </View>

            {/* Category Selector Chips */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>CATEGORY</Text>
              <View style={styles.chipsRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.label;
                  return (
                    <TouchableOpacity
                      key={cat.label}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                      ]}
                      activeOpacity={0.75}
                      onPress={() => setSelectedCategory(cat.label)}
                    >
                      <Icon
                        name={cat.icon}
                        size={13}
                        color={isSelected ? colors.white : colors.navyDeep}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected && styles.categoryChipTextSelected,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Payment Method Selector */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>PAYMENT METHOD</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.paymentMethodsRow}
              >
                {PAYMENT_METHODS.map((pm) => {
                  const isSelected = selectedPayment === pm;
                  return (
                    <TouchableOpacity
                      key={pm}
                      style={[
                        styles.paymentPill,
                        isSelected && styles.paymentPillSelected,
                      ]}
                      activeOpacity={0.75}
                      onPress={() => setSelectedPayment(pm)}
                    >
                      <Text
                        style={[
                          styles.paymentPillText,
                          isSelected && styles.paymentPillTextSelected,
                        ]}
                      >
                        {pm}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Error Message */}
            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.8}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="Save Expense"
            >
              <Icon name="check" size={17} color={colors.white} />
              <Text style={styles.saveButtonText}>Save Expense</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 31, 70, 0.45)',
  },
  sheetContainer: {
    backgroundColor: colors.backgroundSubtle,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.35)',
    ...shadows.floating,
  },
  grabber: {
    width: 38,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(7, 31, 70, 0.18)',
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navyDeep,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingBottom: spacing.lg,
  },
  amountInputBlock: {
    backgroundColor: colors.navyDeep,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.25)',
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  amountFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rupeeSymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.blueBright,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: '800',
    color: colors.white,
    padding: 0,
  },
  fieldBlock: {
    marginBottom: spacing.lg,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14.5,
    color: colors.navyDeep,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.32)',
    fontWeight: '500',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7.5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.3)',
  },
  categoryChipSelected: {
    backgroundColor: colors.navyDeep,
    borderColor: colors.navyDeep,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navyDeep,
  },
  categoryChipTextSelected: {
    color: colors.white,
  },
  paymentMethodsRow: {
    gap: 7,
  },
  paymentPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.3)',
  },
  paymentPillSelected: {
    backgroundColor: colors.navyDeep,
    borderColor: colors.navyDeep,
  },
  paymentPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navyDeep,
  },
  paymentPillTextSelected: {
    color: colors.white,
  },
  errorText: {
    fontSize: 12,
    color: colors.negative,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.navyDeep,
    borderRadius: borderRadius.xl,
    paddingVertical: 14,
    shadowColor: colors.navyDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.2,
  },
});

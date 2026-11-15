import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { TextInput, TouchableOpacity, Text } from 'react-native';
import { TransactionModal } from '../src/components/finance/TransactionModal';
import {
  AccountType,
  AdjustmentDirection,
  Transaction,
  TransactionType,
} from '../src/api/types';
import { toast } from '../src/context/ToastContext';
import { accountsApi } from '../src/api/accounts';
import { categoriesApi } from '../src/api/categories';

describe('TransactionModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(accountsApi, 'getAccounts').mockResolvedValue([
      {
        id: 'acc-cash',
        name: 'Cash',
        type: AccountType.CASH,
        balance: 5000,
        currency: 'INR',
        isDefault: true,
      },
      {
        id: 'acc-hdfc',
        name: 'HDFC Savings',
        type: AccountType.BANK,
        balance: 25000,
        currency: 'INR',
        isDefault: false,
      },
    ]);
    jest.spyOn(categoriesApi, 'getCategories').mockResolvedValue([]);
  });

  afterEach(async () => {
    await act(async () => {
      await Promise.resolve();
    });
    jest.restoreAllMocks();
  });

  const renderModal = async (
    props: Partial<React.ComponentProps<typeof TransactionModal>> = {},
  ) => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <TransactionModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          defaultType={TransactionType.EXPENSE}
          {...props}
        />,
      );
      await Promise.resolve();
    });
    return renderer;
  };

  it('renders correctly for new EXPENSE transaction and shows amount, Paid From, and Payment Method', async () => {
    const renderer = await renderModal({ defaultType: TransactionType.EXPENSE });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');
    expect(allText).toContain('Record Transaction');
    expect(allText).toContain('AMOUNT');
    expect(allText).toContain('Paid From');
    expect(allText).toContain('Payment Method');
    expect(allText).toContain('UPI');
    expect(allText).toContain('Cash');
    expect(allText).toContain('Debit Card');
    expect(allText).toContain('Credit Card');
    expect(allText).toContain('Bank Transfer');
    expect(allText).toContain('Wallet');
    expect(allText).toContain('Other');

    await act(async () => {
      renderer.unmount();
    });
  });

  it('rejects invalid or zero amount on save attempt', async () => {
    const errorToastSpy = jest.spyOn(toast, 'error');
    const renderer = await renderModal({ defaultType: TransactionType.EXPENSE });

    const buttons = renderer.root.findAllByType(TouchableOpacity);
    const saveButton = buttons.find((b) => {
      const texts = b.findAllByType(Text);
      return texts.some((t) => String(t.props.children).includes('Save'));
    });

    expect(saveButton).toBeDefined();

    await act(async () => {
      saveButton!.props.onPress();
      await Promise.resolve();
    });

    expect(errorToastSpy).toHaveBeenCalledWith(
      'Please enter a valid amount greater than 0.',
      'Invalid Amount',
    );
    expect(mockOnSave).not.toHaveBeenCalled();
    errorToastSpy.mockRestore();

    await act(async () => {
      renderer.unmount();
    });
  });

  it('validates INCOME: shows Received Into and does NOT show Payment Method, sends destinationAccountId without paymentMethod', async () => {
    const renderer = await renderModal({ defaultType: TransactionType.INCOME });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');
    expect(allText).toContain('Received Into');
    expect(allText).not.toContain('Payment Method');

    // Enter valid amount
    const inputs = renderer.root.findAllByType(TextInput);
    const amountInput = inputs.find((i) => i.props.keyboardType === 'numeric');
    await act(async () => {
      amountInput!.props.onChangeText('50000');
      await Promise.resolve();
    });

    // Save Income
    const buttons = renderer.root.findAllByType(TouchableOpacity);
    const saveButton = buttons.find((b) => {
      const texts = b.findAllByType(Text);
      return texts.some((t) => String(t.props.children).includes('Save'));
    });

    await act(async () => {
      saveButton!.props.onPress();
      await Promise.resolve();
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TransactionType.INCOME,
        amount: 50000,
        amountMinor: '5000000',
        paymentMethod: undefined,
        destinationAccountId: expect.any(String),
      }),
      undefined,
    );

    await act(async () => {
      renderer.unmount();
    });
  });

  it('validates TRANSFER: shows Transfer From & Transfer To, does NOT show Payment Method or Category, rejects when accounts are equal', async () => {
    const errorToastSpy = jest.spyOn(toast, 'error');
    const renderer = await renderModal({ defaultType: TransactionType.TRANSFER });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');
    expect(allText).toContain('Transfer From');
    expect(allText).toContain('Transfer To');
    expect(allText).not.toContain('Payment Method');
    expect(allText).not.toContain('Category');

    // Enter an amount
    const inputs = renderer.root.findAllByType(TextInput);
    const amountInput = inputs.find((i) => i.props.keyboardType === 'numeric');
    await act(async () => {
      amountInput!.props.onChangeText('1500');
      await Promise.resolve();
    });

    const buttons = renderer.root.findAllByType(TouchableOpacity);
    const saveButton = buttons.find((b) => {
      const texts = b.findAllByType(Text);
      return texts.some((t) => String(t.props.children).includes('Save'));
    });

    await act(async () => {
      saveButton!.props.onPress();
      await Promise.resolve();
    });

    // Should prompt for transfer destination
    expect(errorToastSpy).toHaveBeenCalledWith(
      'Please select a destination account for the transfer.',
      'Transfer Destination',
    );
    expect(mockOnSave).not.toHaveBeenCalled();
    errorToastSpy.mockRestore();

    await act(async () => {
      renderer.unmount();
    });
  });

  it('validates REFUND: shows Received Into, does NOT show Payment Method', async () => {
    const renderer = await renderModal({ defaultType: TransactionType.REFUND });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');
    expect(allText).toContain('Received Into');
    expect(allText).toContain('Original Transaction (Optional)');
    expect(allText).not.toContain('Payment Method');

    const inputs = renderer.root.findAllByType(TextInput);
    const amountInput = inputs.find((i) => i.props.keyboardType === 'numeric');
    await act(async () => {
      amountInput!.props.onChangeText('800');
      await Promise.resolve();
    });

    const buttons = renderer.root.findAllByType(TouchableOpacity);
    const saveButton = buttons.find((b) => {
      const texts = b.findAllByType(Text);
      return texts.some((t) => String(t.props.children).includes('Save'));
    });

    await act(async () => {
      saveButton!.props.onPress();
      await Promise.resolve();
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TransactionType.REFUND,
        amount: 800,
        paymentMethod: undefined,
        destinationAccountId: expect.any(String),
      }),
      undefined,
    );

    await act(async () => {
      renderer.unmount();
    });
  });

  it('validates ADJUSTMENT: requires Account, Direction, and Reason; does NOT show Payment Method', async () => {
    const errorToastSpy = jest.spyOn(toast, 'error');
    const renderer = await renderModal({ defaultType: TransactionType.ADJUSTMENT });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');
    expect(allText).toContain('Account');
    expect(allText).toContain('Direction');
    expect(allText).toContain('Reason (Required)');
    expect(allText).not.toContain('Payment Method');

    const inputs = renderer.root.findAllByType(TextInput);
    const amountInput = inputs.find((i) => i.props.keyboardType === 'numeric');
    await act(async () => {
      amountInput!.props.onChangeText('200');
      await Promise.resolve();
    });

    const buttons = renderer.root.findAllByType(TouchableOpacity);
    const saveButton = buttons.find((b) => {
      const texts = b.findAllByType(Text);
      return texts.some((t) => String(t.props.children).includes('Save'));
    });

    // Save without reason -> should fail validation
    await act(async () => {
      saveButton!.props.onPress();
      await Promise.resolve();
    });

    expect(errorToastSpy).toHaveBeenCalledWith(
      'Please provide a reason for the adjustment.',
      'Reason Required',
    );
    expect(mockOnSave).not.toHaveBeenCalled();

    // Now fill Reason
    const reasonInput = inputs.find((i) =>
      String(i.props.placeholder || '').includes('reconciliation'),
    );
    expect(reasonInput).toBeDefined();
    await act(async () => {
      reasonInput!.props.onChangeText('ATM Cash variance correction');
      await Promise.resolve();
    });

    await act(async () => {
      saveButton!.props.onPress();
      await Promise.resolve();
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TransactionType.ADJUSTMENT,
        amount: 200,
        notes: 'ATM Cash variance correction',
        reason: 'ATM Cash variance correction',
        adjustmentDirection: AdjustmentDirection.DECREASE,
        paymentMethod: undefined,
      }),
      undefined,
    );

    errorToastSpy.mockRestore();

    await act(async () => {
      renderer.unmount();
    });
  });

  it('supports inline Add Account flow and creates user account with backend API', async () => {
    const createAccSpy = jest.spyOn(accountsApi, 'createAccount').mockResolvedValueOnce({
      id: 'acc-new-icici',
      name: 'ICICI Savings',
      type: AccountType.BANK,
      balance: 1000,
      currency: 'INR',
      isDefault: false,
    });

    const renderer = await renderModal({ defaultType: TransactionType.EXPENSE });

    // Click "Add Account"
    const buttons = renderer.root.findAllByType(TouchableOpacity);
    const addAccountBtn = buttons.find((b) => {
      const texts = b.findAllByType(Text);
      return texts.some((t) => String(t.props.children).includes('Add Account'));
    });
    expect(addAccountBtn).toBeDefined();

    await act(async () => {
      addAccountBtn!.props.onPress();
      await Promise.resolve();
    });

    // Should render the Add Account dialog
    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');
    expect(allText).toContain('Add New Account');

    // Fill Account Name
    const inputs = renderer.root.findAllByType(TextInput);
    const nameInput = inputs.find((i) =>
      String(i.props.placeholder || '').includes('HDFC Savings'),
    );
    expect(nameInput).toBeDefined();

    await act(async () => {
      nameInput!.props.onChangeText('ICICI Savings');
      await Promise.resolve();
    });

    // Submit Create Account
    const createBtn = renderer.root.findAllByType(TouchableOpacity).find((b) => {
      const texts = b.findAllByType(Text);
      return texts.some((t) => String(t.props.children).includes('Create Account'));
    });
    expect(createBtn).toBeDefined();

    await act(async () => {
      createBtn!.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createAccSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ICICI Savings',
        type: AccountType.BANK,
      }),
    );

    createAccSpy.mockRestore();

    await act(async () => {
      renderer.unmount();
    });
  });

  it('correctly populates and edits an existing transaction without showing Payment Method for Income', async () => {
    const existingIncome: Transaction = {
      id: 'tx-existing-income',
      type: TransactionType.INCOME,
      amount: 75000,
      category: 'Salary',
      accountId: 'acc-hdfc-savings',
      destinationAccountId: 'acc-hdfc-savings',
      paymentMethod: '',
      notes: 'Monthly tech salary',
      merchant: 'Google Inc',
      incurredAt: '2026-11-15T00:00:00.000Z',
      createdAt: '2026-11-15T00:00:00.000Z',
    };

    const renderer = await renderModal({ initialData: existingIncome });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');
    expect(allText).toContain('Edit Transaction');
    expect(allText).toContain('Received Into');
    expect(allText).not.toContain('Payment Method');

    const buttons = renderer.root.findAllByType(TouchableOpacity);
    const saveButton = buttons.find((b) => {
      const texts = b.findAllByType(Text);
      return texts.some((t) => String(t.props.children).includes('Save Changes'));
    });
    expect(saveButton).toBeDefined();

    await act(async () => {
      saveButton!.props.onPress();
      await Promise.resolve();
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TransactionType.INCOME,
        amount: 75000,
        destinationAccountId: 'acc-hdfc-savings',
        paymentMethod: undefined,
      }),
      'tx-existing-income',
    );

    await act(async () => {
      renderer.unmount();
    });
  });
});

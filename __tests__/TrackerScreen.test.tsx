import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import { TrackerScreen } from '../src/screens/TrackerScreen';
import { transactionsApi } from '../src/api/transactions';
import { TransactionType } from '../src/api/types';

describe('TrackerScreen Component', () => {
  const mockRecentResponse = {
    days: [
      {
        date: '2026-11-15',
        dateLabel: 'Today',
        spentTotal: 1240,
        incomeTotal: 0,
        transactionCount: 2,
        transactions: [
          {
            id: 'tx-1',
            clientTransactionId: 'client-1',
            type: TransactionType.EXPENSE,
            amount: 450,
            category: 'Food & Dining',
            merchant: 'Starbucks Coffee',
            accountId: 'acc-1',
            accountName: 'HDFC Savings',
            paymentMethod: 'UPI',
            notes: 'Cold Brew',
            incurredAt: '2026-11-15T10:00:00.000Z',
            createdAt: '2026-11-15T10:00:00.000Z',
          },
          {
            id: 'tx-2',
            clientTransactionId: 'client-2',
            type: TransactionType.EXPENSE,
            amount: 790,
            category: 'Food & Dining',
            merchant: 'Swiggy',
            accountId: 'acc-1',
            accountName: 'HDFC Savings',
            paymentMethod: 'UPI',
            notes: 'Lunch',
            incurredAt: '2026-11-15T13:30:00.000Z',
            createdAt: '2026-11-15T13:30:00.000Z',
          },
        ],
      },
      {
        date: '2026-11-14',
        dateLabel: 'Yesterday',
        spentTotal: 320,
        incomeTotal: 0,
        transactionCount: 1,
        transactions: [
          {
            id: 'tx-3',
            clientTransactionId: 'client-3',
            type: TransactionType.EXPENSE,
            amount: 320,
            category: 'Transport',
            merchant: 'Uber Trip',
            accountId: 'acc-1',
            accountName: 'HDFC Savings',
            paymentMethod: 'UPI',
            incurredAt: '2026-11-14T09:00:00.000Z',
            createdAt: '2026-11-14T09:00:00.000Z',
          },
        ],
      },
      {
        date: '2026-11-13',
        dateLabel: '2 Days Ago',
        spentTotal: 0,
        incomeTotal: 50000,
        transactionCount: 1,
        transactions: [
          {
            id: 'tx-4',
            clientTransactionId: 'client-4',
            type: TransactionType.INCOME,
            amount: 50000,
            category: 'Salary',
            merchant: 'Acme Corp Payout',
            accountId: 'acc-1',
            accountName: 'HDFC Savings',
            paymentMethod: 'Net Banking',
            incurredAt: '2026-11-13T09:00:00.000Z',
            createdAt: '2026-11-13T09:00:00.000Z',
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(transactionsApi, 'getRecentTransactions').mockResolvedValue(mockRecentResponse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders dynamic date in header without hardcoded month', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<TrackerScreen />);
    });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');

    expect(allText).toContain('PE Tracker');
    // Date pill should render dynamic date (contains current year e.g. 2026)
    expect(allText).toMatch(/\b202\d\b/);
  });

  it('renders real 3-day grouped transactions with daily summaries', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<TrackerScreen />);
    });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');

    expect(allText).toContain('Today');
    expect(allText).toContain('1,240 spent');
    expect(allText).toContain('Starbucks Coffee');
    expect(allText).toContain('Yesterday');
    expect(allText).toContain('320 spent');
    expect(allText).toContain('2 Days Ago');
    expect(allText).toContain('50,000 income');

    // Make sure no fake fallback totals appear
    expect(allText).not.toContain('₹120,000');
    expect(allText).not.toContain('₹35,500');
  });

  it('filters recent 3-day transactions by local search query', async () => {
    jest.useFakeTimers();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<TrackerScreen />);
    });

    const searchInput = renderer.root.findByType(TextInput);
    await act(async () => {
      searchInput.props.onChangeText('Starbucks');
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');

    expect(allText).toContain('Starbucks Coffee');
    expect(allText).not.toContain('Uber Trip');
    jest.useRealTimers();
  });

  it('provides View All link to open the dedicated History & Insights screen', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<TrackerScreen />);
    });

    const textNodes = renderer.root.findAllByType(Text);
    const viewAllNode = textNodes.find((n) =>
      String(n.props.children).includes('View All History & Insights'),
    );
    expect(viewAllNode).toBeDefined();
  });
});

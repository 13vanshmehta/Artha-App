import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { HistoryScreen } from '../src/screens/HistoryScreen';
import { transactionsApi } from '../src/api/transactions';
import { analyticsApi } from '../src/api/analytics';
import { accountsApi } from '../src/api/accounts';
import { TransactionType } from '../src/api/types';

describe('HistoryScreen Component', () => {
  const mockTransactionsResponse = {
    items: [
      {
        id: 'tx-hist-1',
        type: TransactionType.EXPENSE,
        amount: 800,
        category: 'Food & Dining',
        merchant: 'Dominos Pizza',
        accountId: 'acc-1',
        paymentMethod: 'UPI',
        incurredAt: '2026-11-15T15:00:00.000Z',
        createdAt: '2026-11-15T15:00:00.000Z',
      },
    ],
    nextCursor: 'cursor-page-2',
    hasMore: true,
  };

  const mockAnalyticsSummary = {
    period: 'month',
    periodLabel: 'November 2026',
    income: 70000,
    expenses: 20000,
    refunds: 0,
    netSpending: 20000,
    netFlow: 50000,
    averageDailySpend: 666.67,
    daysInPeriod: 30,
  };

  const mockAnalyticsCharts = {
    categoryBreakdown: [
      { category: 'Food & Dining', amount: 15000, percentage: 75, color: '#2563EB' },
      { category: 'Shopping', amount: 5000, percentage: 25, color: '#0F172A' },
    ],
    spendingTrend: [{ label: '15 Nov', amount: 800 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(transactionsApi, 'getTransactions').mockResolvedValue(mockTransactionsResponse);
    jest.spyOn(analyticsApi, 'getSummary').mockResolvedValue(mockAnalyticsSummary);
    jest.spyOn(analyticsApi, 'getCharts').mockResolvedValue(mockAnalyticsCharts);
    jest.spyOn(accountsApi, 'getAccounts').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders historical transactions and cursor pagination load more button', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<HistoryScreen />);
    });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');

    expect(allText).toContain('History & Insights');
    expect(allText).toContain('Dominos Pizza');
    expect(allText).toContain('Load More Transactions');
  });

  it('switches to Insights tab and displays summary and charts', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<HistoryScreen />);
    });

    const buttons = renderer.root.findAllByType(TouchableOpacity);
    const insightsTabBtn = buttons.find((b) => {
      const texts = b.findAllByType(Text);
      return texts.some((t) => t.props.children === 'Insights');
    });

    expect(insightsTabBtn).toBeDefined();

    await act(async () => {
      insightsTabBtn!.props.onPress();
    });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');

    expect(allText).toContain('November 2026');
    expect(allText).toContain('Total Income');
    expect(allText).toContain('70,000');
    expect(allText).toContain('Total Expenses');
    expect(allText).toContain('20,000');
    expect(allText).toContain('Category Spending');
    expect(allText).toContain('Food & Dining');
  });
});

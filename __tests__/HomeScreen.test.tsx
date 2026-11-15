import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from '../src/screens/HomeScreen';
import { homeApi } from '../src/api/home';
import { HomeDashboardData, TransactionType } from '../src/api/types';

const SAFE_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

describe('HomeScreen Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders meaningful empty state when user has zero transactions', async () => {
    const emptyHome: HomeDashboardData = {
      thisMonth: { monthLabel: 'November 2026', income: 0, expenses: 0, netFlow: 0 },
      today: { spent: 0, transactionCount: 0 },
      topCategories: [],
      recentTransactions: [],
      accountSummary: { totalBalance: 0, accountCount: 0 },
    };

    jest.spyOn(homeApi, 'getHomeData').mockResolvedValue(emptyHome);

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={SAFE_METRICS}>
          <HomeScreen userName="Vansh" />
        </SafeAreaProvider>,
      );
    });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');

    expect(allText).toContain('Your financial journey starts here');
    expect(allText).toContain('Add your first transaction to begin tracking');
    expect(allText).toContain('Record First Transaction');

    // Confirm no fake baseline numbers
    expect(allText).not.toContain('₹120,000');
    expect(allText).not.toContain('₹35,500');
    expect(allText).not.toContain('Starbucks Coffee');
  });

  it('renders real backend financial metrics when data is present', async () => {
    const realHome: HomeDashboardData = {
      thisMonth: {
        monthLabel: 'November 2026',
        income: 85000,
        expenses: 28400,
        netFlow: 56600,
      },
      today: {
        spent: 1250,
        transactionCount: 2,
      },
      topCategories: [
        {
          category: 'Food & Dining',
          amount: 14200,
          percentage: 50,
          icon: 'Utensils',
          color: '#2563EB',
        },
      ],
      recentTransactions: [
        {
          id: 'tx-real-1',
          clientTransactionId: 'client-1',
          type: TransactionType.EXPENSE,
          amount: 650,
          category: 'Food & Dining',
          merchant: 'Haldiram Express',
          accountId: 'acc-1',
          accountName: 'HDFC Savings',
          paymentMethod: 'UPI',
          incurredAt: '2026-11-15T12:00:00.000Z',
          createdAt: '2026-11-15T12:00:00.000Z',
        },
      ],
      accountSummary: {
        totalBalance: 56600,
        accountCount: 1,
      },
    };

    jest.spyOn(homeApi, 'getHomeData').mockResolvedValue(realHome);

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={SAFE_METRICS}>
          <HomeScreen userName="Vansh" />
        </SafeAreaProvider>,
      );
    });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');

    expect(allText).toContain('56,600');
    expect(allText).toContain('85,000');
    expect(allText).toContain('28,400');
    expect(allText).toContain('1,250');
    expect(allText).toContain('Haldiram Express');
    expect(allText).toContain('Food & Dining');
  });
});

import { apiClient } from '../src/services/apiClient';
import { queryClient } from '../src/state/queryClient';
import { accountsApi } from '../src/api/accounts';
import { categoriesApi } from '../src/api/categories';
import { transactionsApi } from '../src/api/transactions';
import { homeApi } from '../src/api/home';
import { analyticsApi } from '../src/api/analytics';
import {
  AccountType,
  TransactionType,
  CreateTransactionDto,
} from '../src/api/types';
import { generateClientTransactionId } from '../src/utils/idempotency';
import {
  formatCurrentHeaderDate,
  formatTransactionTime,
  getIndianFinancialYear,
} from '../src/utils/date';

describe('PET API Layer and State Management', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  describe('Client Idempotency ID Generation', () => {
    it('generates a valid RFC4122 v4 UUID format', () => {
      const id1 = generateClientTransactionId();
      const id2 = generateClientTransactionId();
      expect(typeof id1).toBe('string');
      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(id1).not.toBe(id2);
    });
  });

  describe('Date and Financial Year Utilities', () => {
    it('formats current header date with weekday, day, month and year', () => {
      const fixedDate = new Date(2026, 10, 15); // 15 Nov 2026
      const formatted = formatCurrentHeaderDate(fixedDate);
      expect(formatted).toContain('15');
      expect(formatted).toContain('Nov');
      expect(formatted).toContain('2026');
    });

    it('calculates Indian Financial Year accurately (Apr to Mar)', () => {
      // November 2026 falls into FY 2026-27
      const novDate = new Date(2026, 10, 15);
      expect(getIndianFinancialYear(novDate)).toBe('FY 2026-27');

      // February 2027 falls into FY 2026-27
      const febDate = new Date(2027, 1, 15);
      expect(getIndianFinancialYear(febDate)).toBe('FY 2026-27');

      // May 2027 falls into FY 2027-28
      const mayDate = new Date(2027, 4, 1);
      expect(getIndianFinancialYear(mayDate)).toBe('FY 2027-28');
    });

    it('formats transaction timestamps cleanly', () => {
      const time = formatTransactionTime('2026-11-15T14:30:00.000Z');
      expect(time.length).toBeGreaterThan(0);
    });
  });

  describe('QueryClient Server State Cache', () => {
    it('caches query results and returns them without re-fetching if fresh', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ success: true, count: 1 });
      const key = ['test', 'query'];

      const res1 = await queryClient.fetchQuery(key, mockFetcher, { staleTime: 10_000 });
      expect(res1).toEqual({ success: true, count: 1 });
      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Second fetch within staleTime hits cache
      const res2 = await queryClient.fetchQuery(key, mockFetcher, { staleTime: 10_000 });
      expect(res2).toEqual({ success: true, count: 1 });
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it('deduplicates in-flight requests for the same query key', async () => {
      let resolvePromise: (val: any) => void;
      const delayedFetcher = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const key = ['test', 'dedup'];
      const p1 = queryClient.fetchQuery(key, delayedFetcher);
      const p2 = queryClient.fetchQuery(key, delayedFetcher);

      resolvePromise!({ data: 'done' });
      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1).toEqual({ data: 'done' });
      expect(r2).toEqual({ data: 'done' });
      expect(delayedFetcher).toHaveBeenCalledTimes(1);
    });

    it('invalidates queries by key prefix', async () => {
      const fetcher = jest.fn().mockResolvedValue({ id: 1 });
      await queryClient.fetchQuery(['transactions', 'recent'], fetcher);

      expect(queryClient.getEntry(['transactions', 'recent']).isStale).toBe(false);

      // Invalidate prefix ['transactions']
      queryClient.invalidateQueries(['transactions']);

      expect(queryClient.getEntry(['transactions', 'recent']).isStale).toBe(true);
    });
  });

  describe('Accounts and Categories API calls', () => {
    it('fetches user accounts through apiClient.request', async () => {
      const spy = jest.spyOn(apiClient, 'request').mockResolvedValueOnce({
        accounts: [
          {
            id: 'acc-1',
            name: 'HDFC Savings',
            type: AccountType.BANK,
            balance: 50000,
            currency: 'INR',
            isDefault: true,
          },
        ],
      });

      const accounts = await accountsApi.getAccounts();
      expect(spy).toHaveBeenCalledWith('/accounts', { method: 'GET' });
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe('HDFC Savings');
      spy.mockRestore();
    });

    it('creates custom category with type and icon', async () => {
      const spy = jest.spyOn(apiClient, 'request').mockResolvedValueOnce({
        category: {
          id: 'cat-custom',
          name: 'Gym & Fitness',
          icon: 'HeartPulse',
          color: '#2563EB',
          type: 'EXPENSE',
          isCustom: true,
        },
      });

      const created = await categoriesApi.createCategory({
        name: 'Gym & Fitness',
        icon: 'HeartPulse',
        color: '#2563EB',
        type: 'EXPENSE',
      });

      expect(spy).toHaveBeenCalledWith('/categories', {
        method: 'POST',
        body: {
          name: 'Gym & Fitness',
          icon: 'HeartPulse',
          color: '#2563EB',
          type: 'EXPENSE',
        },
      });
      expect(created.name).toBe('Gym & Fitness');
      expect(created.isCustom).toBe(true);
      spy.mockRestore();
    });
  });

  describe('Transactions API operations', () => {
    it('fetches recent 3-day grouped transactions', async () => {
      const mockDays = [
        {
          date: '2026-11-15',
          dateLabel: 'Today',
          spentTotal: 450,
          incomeTotal: 0,
          transactionCount: 1,
          transactions: [],
        },
      ];
      const spy = jest.spyOn(apiClient, 'request').mockResolvedValueOnce({ days: mockDays });

      const res = await transactionsApi.getRecentTransactions();
      expect(spy).toHaveBeenCalledWith('/transactions/recent', { method: 'GET' });
      expect(res.days).toEqual(mockDays);
      spy.mockRestore();
    });

    it('creates a transaction with clientTransactionId idempotency', async () => {
      const dto: CreateTransactionDto = {
        clientTransactionId: 'client-tx-uuid-1234',
        type: TransactionType.EXPENSE,
        amount: 350,
        category: 'Food & Dining',
        accountId: 'acc-hdfc',
        paymentMethod: 'UPI',
        merchant: 'Blue Tokai',
      };

      const spy = jest.spyOn(apiClient, 'request').mockResolvedValueOnce({
        transaction: {
          id: 'tx-server-1',
          ...dto,
          incurredAt: '2026-11-15T10:00:00.000Z',
          createdAt: '2026-11-15T10:00:00.000Z',
        },
      });

      const res = await transactionsApi.createTransaction(dto);
      expect(spy).toHaveBeenCalledWith('/transactions', {
        method: 'POST',
        body: expect.objectContaining(dto),
      });
      expect(res.id).toBe('tx-server-1');
      expect(res.clientTransactionId).toBe('client-tx-uuid-1234');
      spy.mockRestore();
    });

    it('supports deleting and restoring transactions (Undo flow)', async () => {
      const delSpy = jest.spyOn(apiClient, 'request').mockResolvedValueOnce({
        message: 'Transaction deleted successfully.',
        deletedId: 'tx-1',
      });
      const restoreSpy = jest.spyOn(apiClient, 'request').mockResolvedValueOnce({
        transaction: { id: 'tx-1', amount: 350 },
        message: 'Transaction restored successfully.',
      });

      const delRes = await transactionsApi.deleteTransaction('tx-1');
      expect(delSpy).toHaveBeenCalledWith('/transactions/tx-1', { method: 'DELETE' });
      expect(delRes.deletedId).toBe('tx-1');

      const restoreRes = await transactionsApi.restoreTransaction('tx-1');
      expect(restoreSpy).toHaveBeenCalledWith('/transactions/tx-1/restore', { method: 'POST' });
      expect(restoreRes.id).toBe('tx-1');

      delSpy.mockRestore();
      restoreSpy.mockRestore();
    });
  });

  describe('Home and Analytics API', () => {
    it('fetches home financial metrics', async () => {
      const mockHome = {
        thisMonth: { monthLabel: 'November 2026', income: 100000, expenses: 25000, netFlow: 75000 },
        today: { spent: 500, transactionCount: 1 },
        topCategories: [],
        recentTransactions: [],
        accountSummary: { totalBalance: 75000, accountCount: 2 },
      };
      const spy = jest.spyOn(apiClient, 'request').mockResolvedValueOnce(mockHome);

      const res = await homeApi.getHomeData();
      expect(spy).toHaveBeenCalledWith('/home', { method: 'GET' });
      expect(res.thisMonth.expenses).toBe(25000);
      spy.mockRestore();
    });

    it('fetches analytics summary and charts with query params', async () => {
      const sumSpy = jest.spyOn(apiClient, 'request').mockResolvedValueOnce({
        period: 'month',
        income: 50000,
        expenses: 12000,
        refunds: 0,
        netSpending: 12000,
        netFlow: 38000,
        averageDailySpend: 400,
        daysInPeriod: 30,
      });

      const summary = await analyticsApi.getSummary({ period: 'month', date: '2026-11-15' });
      expect(sumSpy).toHaveBeenCalledWith(
        expect.stringContaining('/summary?period=THIS_MONTH'),
        { method: 'GET' },
      );
      expect(summary.expenses).toBe(12000);
      sumSpy.mockRestore();
    });

    it('normalizes backend ledger summary with minor units into standard units', async () => {
      const sumSpy = jest.spyOn(apiClient, 'request').mockResolvedValueOnce({
        range: { from: '2026-11-01', to: '2026-11-30' },
        totals: {
          incomeMinor: '7500000',
          expenseMinor: '2500000',
          refundsMinor: '100000',
          netSpendingMinor: '2400000',
          netFlowMinor: '5100000',
        },
        elapsedDays: 15,
        averageDailySpendMinor: '160000',
        byCategory: [
          { name: 'Food & Dining', netSpendingMinor: '1000000', sharePercent: 41.67, color: '#F59E0B' },
        ],
        series: [
          { bucket: '2026-11-01', netSpendingMinor: '50000' },
        ],
      });

      const summary = await analyticsApi.getSummary({ period: 'THIS_MONTH' });
      expect(summary.income).toBe(75000);
      expect(summary.expenses).toBe(25000);
      expect(summary.refunds).toBe(1000);
      expect(summary.netSpending).toBe(24000);
      expect(summary.netFlow).toBe(51000);
      expect(summary.averageDailySpend).toBe(1600);
      sumSpy.mockRestore();
    });
  });
});

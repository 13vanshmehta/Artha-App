import { apiClient } from '../services/apiClient';
import { paiseMinorToDecimal } from '../utils/money';
import { normalizeTransaction } from './transactions';
import { HomeDashboardData } from './types';

export function normalizeHomeData(raw: any): HomeDashboardData {
  if (!raw) {
    return {
      thisMonth: { monthLabel: 'This Month', income: 0, expenses: 0, netFlow: 0 },
      today: { spent: 0, transactionCount: 0 },
      topCategories: [],
      recentTransactions: [],
      accountSummary: { totalBalance: 0, accountCount: 0 },
    };
  }

  // Support both frontend-shaped HomeDashboardData and backend Ledger HomeView
  const monthRaw = raw.month || raw.thisMonth || {};
  let income = typeof monthRaw.income === 'number' ? monthRaw.income : 0;
  let expenses =
    typeof monthRaw.expenses === 'number'
      ? monthRaw.expenses
      : typeof monthRaw.expense === 'number'
      ? monthRaw.expense
      : 0;
  let netFlow = typeof monthRaw.netFlow === 'number' ? monthRaw.netFlow : 0;

  if (monthRaw.incomeMinor !== undefined) {
    income = paiseMinorToDecimal(monthRaw.incomeMinor);
  }
  if (monthRaw.expenseMinor !== undefined) {
    expenses = paiseMinorToDecimal(monthRaw.expenseMinor);
  }
  if (monthRaw.netFlowMinor !== undefined) {
    netFlow = paiseMinorToDecimal(monthRaw.netFlowMinor);
  } else if (income > 0 || expenses > 0) {
    netFlow = income - expenses;
  }

  const todayRaw = raw.todaySpending || raw.today || {};
  let todaySpent =
    typeof todayRaw.spent === 'number'
      ? todayRaw.spent
      : typeof todayRaw.expense === 'number'
      ? todayRaw.expense
      : 0;
  if (todayRaw.netSpendingMinor !== undefined) {
    todaySpent = paiseMinorToDecimal(todayRaw.netSpendingMinor);
  } else if (todayRaw.expenseMinor !== undefined) {
    todaySpent = paiseMinorToDecimal(todayRaw.expenseMinor);
  }
  const todayCount =
    typeof todayRaw.transactionCount === 'number'
      ? todayRaw.transactionCount
      : typeof todayRaw.count === 'number'
      ? todayRaw.count
      : 0;

  // Top categories
  const rawCategories = raw.topExpenseCategories || raw.topCategories || [];
  const topCategories = rawCategories.map((c: any) => {
    let amount = typeof c.amount === 'number' ? c.amount : 0;
    if (c.netSpendingMinor !== undefined) {
      amount = paiseMinorToDecimal(c.netSpendingMinor);
    } else if (c.expenseMinor !== undefined) {
      amount = paiseMinorToDecimal(c.expenseMinor);
    }
    return {
      category: c.name || c.category || 'Other',
      amount,
      percentage:
        typeof c.sharePercent === 'number'
          ? c.sharePercent
          : typeof c.percentage === 'number'
          ? c.percentage
          : 0,
      icon: c.icon || 'tag',
      color: c.color || '#3B82F6',
    };
  });

  // Recent transactions
  const rawRecent = raw.recentTransactions || raw.recent || [];
  const recentTransactions = Array.isArray(rawRecent)
    ? rawRecent.map(normalizeTransaction)
    : [];

  // Accounts summary
  let totalBalance = 0;
  let accountCount = 0;
  if (raw.accountSummary) {
    totalBalance =
      typeof raw.accountSummary.totalBalance === 'number'
        ? raw.accountSummary.totalBalance
        : 0;
    accountCount =
      typeof raw.accountSummary.accountCount === 'number'
        ? raw.accountSummary.accountCount
        : 0;
  } else {
    if (raw.totalBalanceMinor !== undefined) {
      totalBalance = paiseMinorToDecimal(raw.totalBalanceMinor);
    }
    if (Array.isArray(raw.accounts)) {
      accountCount = raw.accounts.length;
      if (raw.totalBalanceMinor === undefined) {
        totalBalance = raw.accounts.reduce((sum: number, acc: any) => {
          const bal =
            acc.currentBalanceMinor !== undefined
              ? paiseMinorToDecimal(acc.currentBalanceMinor)
              : typeof acc.balance === 'number'
              ? acc.balance
              : 0;
          return sum + bal;
        }, 0);
      }
    }
  }

  return {
    thisMonth: {
      monthLabel: monthRaw.monthLabel || 'This Month',
      income,
      expenses,
      netFlow,
    },
    today: {
      spent: todaySpent,
      transactionCount: todayCount,
    },
    topCategories,
    recentTransactions,
    accountSummary: {
      totalBalance,
      accountCount,
    },
  };
}

export const homeApi = {
  async getHomeData(): Promise<HomeDashboardData> {
    const raw = await apiClient.request<any>('/home', {
      method: 'GET',
    });
    return normalizeHomeData(raw);
  },
};

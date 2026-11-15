/**
 * ARTHA Personal Expense Tracker (PET) — API Types
 * Single Source of Truth matching docs/API_CONTRACT.md
 */

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum AccountType {
  CASH = 'CASH',
  BANK = 'BANK',
  WALLET = 'WALLET',
  CREDIT_CARD = 'CREDIT_CARD',
  OTHER = 'OTHER',
}

export enum AdjustmentDirection {
  INCREASE = 'INCREASE',
  DECREASE = 'DECREASE',
}

export enum PaymentMethod {
  UPI = 'UPI',
  CASH = 'CASH',
  DEBIT_CARD = 'DEBIT_CARD',
  CREDIT_CARD = 'CREDIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET = 'WALLET',
  OTHER = 'OTHER',
}

export enum AnalyticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  HALF_YEAR = 'half_year',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currentBalanceMinor?: string;
  balanceMinor?: string;
  currency: string;
  isDefault: boolean;
  institution?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAccountDto {
  name: string;
  type: AccountType;
  initialBalance?: number;
  initialBalanceMinor?: string;
  currency?: string;
  institution?: string;
  isDefault?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'EXPENSE' | 'INCOME' | 'ALL';
  isCustom: boolean;
}

export interface CreateCategoryDto {
  name: string;
  icon: string;
  color: string;
  type: 'EXPENSE' | 'INCOME';
}

export interface Transaction {
  id: string;
  clientTransactionId?: string;
  type: TransactionType;
  amount: number;
  amountMinor?: string;
  category: string;
  categoryId?: string | null;
  merchant?: string | null;
  accountId: string;
  accountName?: string;
  destinationAccountId?: string | null;
  destinationAccountName?: string | null;
  paymentMethod: string;
  notes?: string | null;
  adjustmentDirection?: AdjustmentDirection | null;
  originalTransactionId?: string | null;
  incurredAt: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface RecentDayGroup {
  date: string; // YYYY-MM-DD
  dateLabel: 'Today' | 'Yesterday' | '2 Days Ago' | string;
  spentTotal: number;
  incomeTotal: number;
  transactionCount: number;
  transactions: Transaction[];
}

export interface RecentTransactionsResponse {
  days: RecentDayGroup[];
}

export interface TransactionsListResponse {
  items: Transaction[];
  nextCursor?: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export interface TransactionFilters {
  cursor?: string;
  limit?: number;
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  sort?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}

export interface CreateTransactionDto {
  clientTransactionId: string;
  type: TransactionType;
  amount: number;
  amountMinor?: string;
  category: string;
  categoryId?: string;
  accountId: string;
  destinationAccountId?: string;
  paymentMethod?: string | PaymentMethod | null;
  merchant?: string;
  notes?: string;
  reason?: string;
  incurredAt?: string;
  adjustmentDirection?: AdjustmentDirection;
  originalTransactionId?: string;
}

export interface UpdateTransactionDto {
  type?: TransactionType;
  amount?: number;
  amountMinor?: string;
  category?: string;
  categoryId?: string;
  accountId?: string;
  destinationAccountId?: string;
  paymentMethod?: string | PaymentMethod | null;
  merchant?: string;
  notes?: string;
  reason?: string;
  incurredAt?: string;
  adjustmentDirection?: AdjustmentDirection;
  originalTransactionId?: string;
}

export interface HomeDashboardData {
  thisMonth: {
    monthLabel: string;
    income: number;
    expenses: number;
    netFlow: number;
  };
  today: {
    spent: number;
    transactionCount: number;
  };
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
    icon: string;
    color: string;
  }>;
  recentTransactions: Transaction[];
  accountSummary: {
    totalBalance: number;
    accountCount: number;
  };
}

export interface AnalyticsSummaryData {
  period: string;
  periodLabel: string;
  previousPeriodDate?: string;
  nextPeriodDate?: string;
  income: number;
  expenses: number;
  refunds: number;
  netSpending: number;
  netFlow: number;
  averageDailySpend: number;
  daysInPeriod: number;
}

export interface AnalyticsChartsData {
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
  spendingTrend: Array<{
    label: string;
    amount: number;
  }>;
}

import { apiClient } from '../services/apiClient';
import { decimalInputToPaiseMinor, paiseMinorToDecimal } from '../utils/money';
import {
  CreateTransactionDto,
  RecentDayGroup,
  RecentTransactionsResponse,
  Transaction,
  TransactionFilters,
  TransactionsListResponse,
  TransactionType,
  UpdateTransactionDto,
} from './types';

function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Normalizes backend TransactionView into frontend Transaction model
 */
export function normalizeTransaction(raw: any): Transaction {
  if (!raw) return raw;

  // Amount normalization (minor units vs float)
  let amount = typeof raw.amount === 'number' ? raw.amount : 0;
  let amountMinor = '0';
  if (raw.amountMinor !== undefined && raw.amountMinor !== null) {
    amountMinor = String(raw.amountMinor);
    amount = paiseMinorToDecimal(raw.amountMinor);
  } else if (raw.amount !== undefined && raw.amount !== null) {
    amountMinor = decimalInputToPaiseMinor(raw.amount);
  }

  // Account mappings
  const accountId =
    raw.sourceAccountId ||
    raw.destinationAccountId ||
    raw.accountId ||
    raw.account?.id ||
    'acc-cash';

  const accountName =
    raw.sourceAccount?.name ||
    raw.destinationAccount?.name ||
    raw.accountName ||
    raw.account?.name ||
    'Account';

  const destinationAccountId = raw.destinationAccountId || null;
  const destinationAccountName = raw.destinationAccount?.name || raw.destinationAccountName || null;

  // Category mappings
  const categoryName =
    (typeof raw.category === 'object' && raw.category ? raw.category.name : raw.category) ||
    'Other';
  const categoryId =
    (typeof raw.category === 'object' && raw.category ? raw.category.id : raw.categoryId) || null;

  return {
    id: raw.id,
    clientTransactionId: raw.clientTransactionId,
    type: (raw.type as TransactionType) || TransactionType.EXPENSE,
    amount,
    amountMinor,
    category: categoryName,
    categoryId,
    merchant: raw.payee || raw.merchant || categoryName,
    accountId,
    accountName,
    destinationAccountId,
    destinationAccountName,
    paymentMethod: raw.paymentMethod || 'UPI',
    notes: raw.note || raw.notes || null,
    adjustmentDirection: raw.direction || raw.adjustmentDirection || null,
    originalTransactionId: raw.relatedTransactionId || raw.originalTransactionId || null,
    incurredAt: raw.occurredAt || raw.incurredAt || raw.createdAt || new Date().toISOString(),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt,
  };
}

export const transactionsApi = {
  async getRecentTransactions(): Promise<RecentTransactionsResponse> {
    const raw = await apiClient.request<any>('/transactions/recent', {
      method: 'GET',
    });

    if (!raw || !Array.isArray(raw.days)) {
      return { days: [] };
    }

    const days: RecentDayGroup[] = raw.days.map((day: any) => {
      const rawTxList = day.items || day.transactions || [];
      const normalizedTx = rawTxList.map(normalizeTransaction);

      let spentTotal = typeof day.spentTotal === 'number' ? day.spentTotal : 0;
      let incomeTotal = typeof day.incomeTotal === 'number' ? day.incomeTotal : 0;

      if (day.spentTotalMinor !== undefined) {
        spentTotal = Number(day.spentTotalMinor) / 100;
      }
      if (day.incomeTotalMinor !== undefined) {
        incomeTotal = Number(day.incomeTotalMinor) / 100;
      }

      // If backend didn't compute totals, compute from normalized items
      if (spentTotal === 0 && incomeTotal === 0 && normalizedTx.length > 0) {
        normalizedTx.forEach((tx: Transaction) => {
          if (tx.type === TransactionType.EXPENSE) spentTotal += tx.amount;
          else if (tx.type === TransactionType.INCOME) incomeTotal += tx.amount;
        });
      }

      let dateLabel = day.dateLabel || day.label || 'Recent';
      if (dateLabel === 'TODAY') dateLabel = 'Today';
      else if (dateLabel === 'YESTERDAY') dateLabel = 'Yesterday';
      else if (dateLabel === 'TWO_DAYS_AGO') dateLabel = '2 Days Ago';

      return {
        date: day.date,
        dateLabel,
        spentTotal,
        incomeTotal,
        transactionCount:
          typeof day.transactionCount === 'number'
            ? day.transactionCount
            : typeof day.count === 'number'
            ? day.count
            : normalizedTx.length,
        transactions: normalizedTx,
      };
    });

    return { days };
  },

  async getTransactions(
    filters: TransactionFilters = {},
  ): Promise<TransactionsListResponse> {
    // Map sort to backend enum
    let sortParam: string | undefined;
    if (filters.sort === 'date_desc') sortParam = 'NEWEST';
    else if (filters.sort === 'date_asc') sortParam = 'OLDEST';
    else if (filters.sort === 'amount_desc') sortParam = 'HIGHEST_AMOUNT';
    else if (filters.sort === 'amount_asc') sortParam = 'LOWEST_AMOUNT';

    const params: Record<string, unknown> = {
      cursor: filters.cursor,
      limit: filters.limit,
      search: filters.search,
      type: filters.type,
      sourceAccountId: filters.accountId,
      paymentMethod: filters.paymentMethod,
      from: filters.startDate,
      to: filters.endDate,
      sort: sortParam || filters.sort,
    };

    const qs = buildQueryString(params);
    const raw = await apiClient.request<any>(`/transactions${qs}`, {
      method: 'GET',
    });

    const items = (raw.items || []).map(normalizeTransaction);
    return {
      items,
      nextCursor: raw.nextCursor || null,
      hasMore: Boolean(raw.hasMore),
      totalCount: raw.totalCount ?? items.length,
    };
  },

  async getTransaction(id: string): Promise<Transaction> {
    const res = await apiClient.request<{ transaction: any }>(
      `/transactions/${id}`,
      { method: 'GET' },
    );
    return normalizeTransaction(res.transaction);
  },

  async createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    const isExpense = dto.type === TransactionType.EXPENSE;
    const isIncome = dto.type === TransactionType.INCOME;
    const isTransfer = dto.type === TransactionType.TRANSFER;
    const isRefund = dto.type === TransactionType.REFUND;
    const isAdjustment = dto.type === TransactionType.ADJUSTMENT;

    // Transform to backend format with minor units support
    const amountMinor = dto.amountMinor || decimalInputToPaiseMinor(dto.amount);
    const validCategoryId =
      !isTransfer && !isAdjustment && dto.categoryId && !dto.categoryId.startsWith('default-')
        ? dto.categoryId
        : undefined;

    const body: Record<string, unknown> = {
      clientTransactionId: dto.clientTransactionId,
      type: dto.type,
      amount: dto.amount,
      amountMinor,
      occurredAt: dto.incurredAt || new Date().toISOString(),
      incurredAt: dto.incurredAt || new Date().toISOString(),
      ...(validCategoryId ? { categoryId: validCategoryId } : {}),
      ...(!isTransfer && !isAdjustment && dto.category ? { category: dto.category } : {}),
      ...(isExpense && dto.paymentMethod ? { paymentMethod: dto.paymentMethod } : {}),
      ...(dto.merchant ? { payee: dto.merchant, merchant: dto.merchant } : {}),
      ...(dto.notes || dto.reason
        ? { note: dto.notes || dto.reason, notes: dto.notes || dto.reason, reason: dto.reason || dto.notes }
        : {}),
      ...(isExpense || isTransfer ? { sourceAccountId: dto.accountId } : {}),
      ...(isIncome || isRefund
        ? { destinationAccountId: dto.destinationAccountId || dto.accountId }
        : isTransfer
        ? { destinationAccountId: dto.destinationAccountId }
        : {}),
      accountId: dto.accountId,
      ...(isAdjustment && dto.adjustmentDirection
        ? { direction: dto.adjustmentDirection, adjustmentDirection: dto.adjustmentDirection }
        : {}),
      ...(isRefund && dto.originalTransactionId
        ? { relatedTransactionId: dto.originalTransactionId, originalTransactionId: dto.originalTransactionId }
        : {}),
    };

    const res = await apiClient.request<{ transaction: any }>('/transactions', {
      method: 'POST',
      body,
    });
    return normalizeTransaction(res.transaction);
  },

  async updateTransaction(
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const isExpense = dto.type === TransactionType.EXPENSE;
    const isIncome = dto.type === TransactionType.INCOME;
    const isTransfer = dto.type === TransactionType.TRANSFER;
    const isRefund = dto.type === TransactionType.REFUND;
    const isAdjustment = dto.type === TransactionType.ADJUSTMENT;

    const amountMinor =
      dto.amountMinor || (dto.amount !== undefined ? decimalInputToPaiseMinor(dto.amount) : undefined);
    const validCategoryId =
      !isTransfer && !isAdjustment && dto.categoryId && !dto.categoryId.startsWith('default-')
        ? dto.categoryId
        : undefined;

    const body: Record<string, unknown> = {
      ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
      ...(amountMinor !== undefined ? { amountMinor } : {}),
      ...(dto.incurredAt ? { occurredAt: dto.incurredAt, incurredAt: dto.incurredAt } : {}),
      ...(validCategoryId !== undefined ? { categoryId: validCategoryId } : {}),
      ...(!isTransfer && !isAdjustment && dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.merchant !== undefined ? { payee: dto.merchant, merchant: dto.merchant } : {}),
      ...(dto.notes !== undefined || dto.reason !== undefined
        ? { note: dto.notes || dto.reason, notes: dto.notes || dto.reason, reason: dto.reason || dto.notes }
        : {}),
      ...(isExpense && dto.paymentMethod !== undefined ? { paymentMethod: dto.paymentMethod } : {}),
      ...(dto.originalTransactionId !== undefined
        ? { relatedTransactionId: dto.originalTransactionId, originalTransactionId: dto.originalTransactionId }
        : {}),
    };

    if (isExpense) {
      if (dto.accountId) body.sourceAccountId = dto.accountId;
    } else if (isIncome || isRefund) {
      if (dto.accountId || dto.destinationAccountId) {
        body.destinationAccountId = dto.destinationAccountId || dto.accountId;
      }
    } else if (isTransfer) {
      if (dto.accountId) body.sourceAccountId = dto.accountId;
      if (dto.destinationAccountId) body.destinationAccountId = dto.destinationAccountId;
    } else if (isAdjustment) {
      if (dto.accountId) body.accountId = dto.accountId;
      if (dto.adjustmentDirection) {
        body.direction = dto.adjustmentDirection;
        body.adjustmentDirection = dto.adjustmentDirection;
      }
    } else {
      if (dto.accountId !== undefined) {
        body.sourceAccountId = dto.accountId;
      }
      if (dto.destinationAccountId !== undefined) {
        body.destinationAccountId = dto.destinationAccountId;
      }
    }

    const res = await apiClient.request<{ transaction: any }>(
      `/transactions/${id}`,
      {
        method: 'PATCH',
        body,
      },
    );
    return normalizeTransaction(res.transaction);
  },

  async deleteTransaction(
    id: string,
  ): Promise<{ message: string; deletedId: string }> {
    return await apiClient.request<{ message: string; deletedId: string }>(
      `/transactions/${id}`,
      {
        method: 'DELETE',
      },
    );
  },

  async restoreTransaction(id: string): Promise<Transaction> {
    const res = await apiClient.request<{
      transaction: any;
      message: string;
    }>(`/transactions/${id}/restore`, {
      method: 'POST',
    });
    return normalizeTransaction(res.transaction);
  },
};

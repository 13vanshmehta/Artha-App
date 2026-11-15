import { apiClient } from '../services/apiClient';
import { paiseMinorToDecimal } from '../utils/money';
import { AnalyticsChartsData, AnalyticsSummaryData } from './types';

function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

function mapPeriodToBackend(period: string): string {
  const lower = period.toLowerCase();
  switch (lower) {
    case 'day':
    case 'today':
      return 'TODAY';
    case 'yesterday':
      return 'YESTERDAY';
    case 'week':
    case 'this_week':
      return 'THIS_WEEK';
    case 'month':
    case 'this_month':
      return 'THIS_MONTH';
    case 'quarter':
    case 'this_quarter':
      return 'THIS_QUARTER';
    case 'half_year':
    case 'this_half_year':
      return 'THIS_HALF_YEAR';
    case 'year':
    case 'this_year':
      return 'THIS_YEAR';
    case 'fy':
    case 'financial_year':
    case 'this_financial_year':
      return 'THIS_FINANCIAL_YEAR';
    case 'custom':
      return 'CUSTOM';
    default:
      return period.toUpperCase();
  }
}

export function normalizeAnalyticsSummary(raw: any, period: string): AnalyticsSummaryData {
  if (!raw) {
    return {
      period,
      periodLabel: period,
      income: 0,
      expenses: 0,
      refunds: 0,
      netSpending: 0,
      netFlow: 0,
      averageDailySpend: 0,
      daysInPeriod: 1,
    };
  }

  // Already frontend shape
  if (typeof raw.income === 'number' && typeof raw.expenses === 'number') {
    return {
      period: raw.period || period,
      periodLabel: raw.periodLabel || period,
      previousPeriodDate: raw.previousPeriodDate,
      nextPeriodDate: raw.nextPeriodDate,
      income: raw.income,
      expenses: raw.expenses,
      refunds: raw.refunds ?? 0,
      netSpending: raw.netSpending ?? (raw.expenses - (raw.refunds ?? 0)),
      netFlow: raw.netFlow ?? (raw.income - raw.expenses),
      averageDailySpend: raw.averageDailySpend ?? 0,
      daysInPeriod: raw.daysInPeriod ?? 1,
    };
  }

  // Backend SummaryView with totals object
  const totals = raw.totals || {};
  let income = 0;
  let expenses = 0;
  let refunds = 0;
  let netSpending = 0;
  let netFlow = 0;
  let averageDailySpend = 0;

  if (totals.incomeMinor !== undefined) income = paiseMinorToDecimal(totals.incomeMinor);
  if (totals.expenseMinor !== undefined) expenses = paiseMinorToDecimal(totals.expenseMinor);
  if (totals.refundsMinor !== undefined) refunds = paiseMinorToDecimal(totals.refundsMinor);
  if (totals.netSpendingMinor !== undefined) netSpending = paiseMinorToDecimal(totals.netSpendingMinor);
  else netSpending = expenses - refunds;
  if (totals.netFlowMinor !== undefined) netFlow = paiseMinorToDecimal(totals.netFlowMinor);
  else netFlow = income - expenses;

  if (raw.averageDailySpendMinor !== undefined) {
    averageDailySpend = paiseMinorToDecimal(raw.averageDailySpendMinor);
  } else if (raw.elapsedDays && raw.elapsedDays > 0) {
    averageDailySpend = netSpending / raw.elapsedDays;
  }

  return {
    period: raw.range?.from ? `${raw.range.from} - ${raw.range.to}` : period,
    periodLabel: period,
    income,
    expenses,
    refunds,
    netSpending,
    netFlow,
    averageDailySpend,
    daysInPeriod: raw.elapsedDays || 1,
  };
}

export function normalizeAnalyticsCharts(raw: any): AnalyticsChartsData {
  if (!raw) {
    return { categoryBreakdown: [], spendingTrend: [] };
  }

  // Already frontend shape
  if (Array.isArray(raw.categoryBreakdown) && Array.isArray(raw.spendingTrend)) {
    return raw;
  }

  // Backend SummaryView with byCategory and series
  const categoryBreakdown = Array.isArray(raw.byCategory)
    ? raw.byCategory.map((c: any) => {
        let amount = typeof c.amount === 'number' ? c.amount : 0;
        if (c.netSpendingMinor !== undefined) amount = paiseMinorToDecimal(c.netSpendingMinor);
        else if (c.expenseMinor !== undefined) amount = paiseMinorToDecimal(c.expenseMinor);

        return {
          category: c.name || c.category || 'Other',
          amount,
          percentage: typeof c.sharePercent === 'number' ? c.sharePercent : (typeof c.percentage === 'number' ? c.percentage : 0),
          color: c.color || '#3B82F6',
        };
      })
    : [];

  const spendingTrend = Array.isArray(raw.series)
    ? raw.series.map((s: any) => {
        let amount = typeof s.amount === 'number' ? s.amount : 0;
        if (s.netSpendingMinor !== undefined) amount = paiseMinorToDecimal(s.netSpendingMinor);
        else if (s.expenseMinor !== undefined) amount = paiseMinorToDecimal(s.expenseMinor);

        return {
          label: s.bucket || s.label || '',
          amount,
        };
      })
    : [];

  return { categoryBreakdown, spendingTrend };
}

export const analyticsApi = {
  async getSummary(params: {
    period: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AnalyticsSummaryData> {
    const backendPeriod = mapPeriodToBackend(params.period);
    const queryParams: Record<string, unknown> = {
      period: backendPeriod,
      from: params.startDate,
      to: params.endDate,
    };
    const qs = buildQueryString(queryParams);

    try {
      // Primary route: /summary
      const raw = await apiClient.request<any>(`/summary${qs}`, { method: 'GET' });
      return normalizeAnalyticsSummary(raw, params.period);
    } catch {
      // Fallback: /analytics/summary
      const raw = await apiClient.request<any>(`/analytics/summary${qs}`, { method: 'GET' });
      return normalizeAnalyticsSummary(raw, params.period);
    }
  },

  async getCharts(params: {
    period: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AnalyticsChartsData> {
    const backendPeriod = mapPeriodToBackend(params.period);
    const queryParams: Record<string, unknown> = {
      period: backendPeriod,
      from: params.startDate,
      to: params.endDate,
    };
    const qs = buildQueryString(queryParams);

    try {
      // Primary: /summary provides both byCategory and series in one shot
      const raw = await apiClient.request<any>(`/summary${qs}`, { method: 'GET' });
      return normalizeAnalyticsCharts(raw);
    } catch {
      try {
        const raw = await apiClient.request<any>(`/analytics/charts${qs}`, { method: 'GET' });
        return normalizeAnalyticsCharts(raw);
      } catch {
        return { categoryBreakdown: [], spendingTrend: [] };
      }
    }
  },
};

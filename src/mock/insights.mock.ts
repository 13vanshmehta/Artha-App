export interface MockInsightsSummary {
  monthName: string;
  budgetTotal: number;
  budgetSpent: number;
  budgetRemaining: number;
  budgetSpentPercent: number;
  status: 'on_track' | 'warning' | 'exceeded';
  weeklyTrend: {
    week: string;
    amount: number;
  }[];
  topSpendingCategory: {
    name: string;
    amount: number;
    percent: number;
  };
}

export const mockInsights: MockInsightsSummary = {
  monthName: 'November 2026',
  budgetTotal: 50000,
  budgetSpent: 35500,
  budgetRemaining: 14500,
  budgetSpentPercent: 71,
  status: 'on_track',
  weeklyTrend: [
    { week: 'Week 1', amount: 8200 },
    { week: 'Week 2', amount: 11400 },
    { week: 'Week 3', amount: 9800 },
    { week: 'Week 4', amount: 6100 },
  ],
  topSpendingCategory: {
    name: 'Food',
    amount: 14200,
    percent: 40,
  },
};

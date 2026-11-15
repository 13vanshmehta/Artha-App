import { colors } from '../theme/colors';

export type DateGroupType =
  | 'Today'
  | 'Yesterday'
  | 'Nov 12'
  | 'Nov 10'
  | 'Sep 24'
  | 'Sep 23'
  | 'Earlier'
  | string;

export interface ExpenseItem {
  id: string;
  merchant: string;
  title?: string;
  category: string;
  amount: number;
  type: 'expense' | 'income';
  dateStr: string;
  timeStr: string;
  dateGroup: DateGroupType;
  paymentMethod: string;
  notes?: string;
  group?: string;
}

export interface CategoryBreakdown {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
  iconName: string;
}

export interface GroupItem {
  id: string;
  name: string;
  spentThisMonth: number;
  membersCount: number;
  yourShare: number;
  avatarBg: string;
}

export const formatCurrency = (amount: number): string =>
  '₹' + Math.abs(amount).toLocaleString('en-IN');

export interface MonthlyBarData {
  month: string;
  amount: number;
}

export const mockMonthlyTrends: MonthlyBarData[] = [
  { month: 'Jun', amount: 32000 },
  { month: 'Jul', amount: 38500 },
  { month: 'Aug', amount: 41200 },
  { month: 'Sep', amount: 36400 },
  { month: 'Oct', amount: 45000 },
  { month: 'Nov', amount: 42500 },
];

export const mockGroups: GroupItem[] = [
  {
    id: 'grp-1',
    name: 'Family',
    spentThisMonth: 18420,
    membersCount: 4,
    yourShare: 6400,
    avatarBg: colors.navyPrimary,
  },
  {
    id: 'grp-2',
    name: 'Trip Goa',
    spentThisMonth: 12840,
    membersCount: 6,
    yourShare: 4280,
    avatarBg: colors.bluePrimary,
  },
  {
    id: 'grp-3',
    name: 'Roommates',
    spentThisMonth: 8240,
    membersCount: 3,
    yourShare: 2746,
    avatarBg: colors.navyDeep,
  },
];

export { mockTransactions as mockExpenses, mockFinancialSummary as mockSummary } from '../mock';

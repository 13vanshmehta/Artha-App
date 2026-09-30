export interface ExpenseItem {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  type: 'expense' | 'income';
  dateStr: string;
  timeStr: string;
  dateGroup: 'Today' | 'Yesterday' | 'Sep 24' | 'Sep 23' | 'Earlier';
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

export interface MonthlyBarData {
  month: string;
  amount: number;
  isCurrent?: boolean;
}

export const mockSummary = {
  totalSpent: 42680,
  spentChangePercent: -8.4,
  periodLabel: 'This Month',
  income: 85000,
  expenses: 42680,
  remaining: 42320,
};

export const mockCategories: CategoryBreakdown[] = [
  { id: '1', name: 'Food', amount: 8600, percentage: 20, color: '#4F9EE8', iconName: 'food' },
  { id: '2', name: 'Shopping', amount: 7200, percentage: 17, color: '#82C4F4', iconName: 'shopping' },
  { id: '3', name: 'Travel', amount: 5400, percentage: 13, color: '#B9DEFA', iconName: 'travel' },
  { id: '4', name: 'Bills', amount: 9800, percentage: 23, color: '#1A4F8B', iconName: 'bills' },
  { id: '5', name: 'Entertainment', amount: 4200, percentage: 10, color: '#6FB5EE', iconName: 'entertainment' },
  { id: '6', name: 'Others', amount: 7480, percentage: 17, color: '#2A72B8', iconName: 'other' },
];

export const mockExpenses: ExpenseItem[] = [
  {
    id: 'exp-1',
    merchant: 'Swiggy',
    category: 'Food',
    amount: 540,
    type: 'expense',
    dateStr: 'Today',
    timeStr: '8:42 PM',
    dateGroup: 'Today',
    paymentMethod: 'UPI · Google Pay',
    notes: 'Dinner with friends',
    group: 'Roommates',
  },
  {
    id: 'exp-2',
    merchant: 'Amazon',
    category: 'Shopping',
    amount: 2499,
    type: 'expense',
    dateStr: 'Today',
    timeStr: '4:20 PM',
    dateGroup: 'Today',
    paymentMethod: 'HDFC Millennia Card',
    notes: 'Home essentials & desk setup',
  },
  {
    id: 'exp-3',
    merchant: 'Uber',
    category: 'Travel',
    amount: 320,
    type: 'expense',
    dateStr: 'Yesterday',
    timeStr: '9:15 PM',
    dateGroup: 'Yesterday',
    paymentMethod: 'Paytm UPI',
    notes: 'Cab from office',
  },
  {
    id: 'exp-4',
    merchant: 'Netflix',
    category: 'Entertainment',
    amount: 649,
    type: 'expense',
    dateStr: 'Yesterday',
    timeStr: '7:30 PM',
    dateGroup: 'Yesterday',
    paymentMethod: 'Auto-Debit',
    notes: 'Monthly 4K Subscription',
  },
  {
    id: 'exp-5',
    merchant: 'Electricity Bill',
    category: 'Bills',
    amount: 2840,
    type: 'expense',
    dateStr: 'Sep 24',
    timeStr: '11:30 AM',
    dateGroup: 'Sep 24',
    paymentMethod: 'Net Banking',
    notes: 'BESCOM August consumption',
    group: 'Family',
  },
  {
    id: 'exp-6',
    merchant: 'Blue Tokai Coffee',
    category: 'Food',
    amount: 380,
    type: 'expense',
    dateStr: 'Sep 24',
    timeStr: '10:15 AM',
    dateGroup: 'Sep 24',
    paymentMethod: 'UPI',
    notes: 'Iced Latte & Croissant',
  },
  {
    id: 'exp-7',
    merchant: 'Zara Indiranagar',
    category: 'Shopping',
    amount: 3490,
    type: 'expense',
    dateStr: 'Sep 23',
    timeStr: '6:30 PM',
    dateGroup: 'Sep 23',
    paymentMethod: 'ICICI Coral Card',
    notes: 'Weekend outfit',
  },
  {
    id: 'exp-8',
    merchant: 'Salary Credit',
    category: 'Income',
    amount: 85000,
    type: 'income',
    dateStr: 'Sep 01',
    timeStr: '9:00 AM',
    dateGroup: 'Earlier',
    paymentMethod: 'Direct Bank Transfer',
    notes: 'Monthly salary payout',
  },
];

export const mockGroups: GroupItem[] = [
  {
    id: 'grp-1',
    name: 'Family',
    spentThisMonth: 18420,
    membersCount: 4,
    yourShare: 6400,
    avatarBg: '#0A2855',
  },
  {
    id: 'grp-2',
    name: 'Trip Goa',
    spentThisMonth: 12840,
    membersCount: 6,
    yourShare: 4280,
    avatarBg: '#2A72B8',
  },
  {
    id: 'grp-3',
    name: 'Roommates',
    spentThisMonth: 8240,
    membersCount: 3,
    yourShare: 2746,
    avatarBg: '#102F60',
  },
];

export const mockMonthlyTrends: MonthlyBarData[] = [
  { month: 'Jan', amount: 34200 },
  { month: 'Feb', amount: 41500 },
  { month: 'Mar', amount: 36800 },
  { month: 'Apr', amount: 52100 },
  { month: 'May', amount: 48900 },
  { month: 'Jun', amount: 39400 },
  { month: 'Jul', amount: 45200 },
  { month: 'Aug', amount: 46800 },
  { month: 'Sep', amount: 42680, isCurrent: true },
];

export const formatCurrency = (amount: number, includeSign = false): string => {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(absAmount);

  if (includeSign) {
    return `${isNegative ? '-' : '+'}₹${formatted}`;
  }
  return `₹${formatted}`;
};

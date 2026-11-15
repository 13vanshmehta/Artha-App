export type DateGroupType =
  | 'Today'
  | 'Yesterday'
  | 'Nov 12'
  | 'Nov 10'
  | 'Nov 05'
  | 'Nov 02'
  | 'Sep 24'
  | 'Sep 23'
  | 'Earlier'
  | string;

export interface MockTransaction {
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

export type ExpenseItem = MockTransaction;

export const mockTransactions: MockTransaction[] = [
  {
    id: 'txn_001',
    merchant: 'Starbucks',
    title: 'Starbucks',
    category: 'Food',
    amount: 450,
    type: 'expense',
    dateStr: 'Today',
    timeStr: '4:15 PM',
    dateGroup: 'Today',
    paymentMethod: 'UPI',
    notes: 'Iced Americano & Croissant',
  },
  {
    id: 'txn_002',
    merchant: 'Uber',
    title: 'Uber',
    category: 'Transport',
    amount: 320,
    type: 'expense',
    dateStr: 'Today',
    timeStr: '1:20 PM',
    dateGroup: 'Today',
    paymentMethod: 'Card',
    notes: 'Ride to meeting',
  },
  {
    id: 'txn_003',
    merchant: 'Swiggy',
    title: 'Swiggy',
    category: 'Food',
    amount: 620,
    type: 'expense',
    dateStr: 'Yesterday',
    timeStr: '8:40 PM',
    dateGroup: 'Yesterday',
    paymentMethod: 'UPI',
    notes: 'Dinner delivery',
  },
  {
    id: 'txn_004',
    merchant: 'Amazon',
    title: 'Amazon',
    category: 'Shopping',
    amount: 2499,
    type: 'expense',
    dateStr: 'Yesterday',
    timeStr: '3:10 PM',
    dateGroup: 'Yesterday',
    paymentMethod: 'Card',
    notes: 'Ergonomic Desk Mat & Cable Organizers',
  },
  {
    id: 'txn_005',
    merchant: 'Netflix',
    title: 'Netflix',
    category: 'Entertainment',
    amount: 649,
    type: 'expense',
    dateStr: 'Nov 12',
    timeStr: '11:00 AM',
    dateGroup: 'Earlier',
    paymentMethod: 'Auto Debit',
    notes: 'Premium 4K Subscription',
  },
  {
    id: 'txn_006',
    merchant: 'Electricity Bill',
    title: 'Electricity Bill',
    category: 'Bills & Utilities',
    amount: 1850,
    type: 'expense',
    dateStr: 'Nov 10',
    timeStr: '2:30 PM',
    dateGroup: 'Earlier',
    paymentMethod: 'UPI',
    notes: 'Monthly Power Utility',
  },
  {
    id: 'txn_007',
    merchant: 'Apartment Rent',
    title: 'Monthly Rent',
    category: 'Bills & Utilities',
    amount: 25000,
    type: 'expense',
    dateStr: 'Nov 05',
    timeStr: '10:00 AM',
    dateGroup: 'Earlier',
    paymentMethod: 'Direct Bank Transfer',
    notes: 'November Flat Rent',
  },
  {
    id: 'txn_008',
    merchant: 'Nature Basket Groceries',
    title: 'Weekly Pantry Restock',
    category: 'Food',
    amount: 4112,
    type: 'expense',
    dateStr: 'Nov 02',
    timeStr: '6:30 PM',
    dateGroup: 'Earlier',
    paymentMethod: 'UPI',
    notes: 'Fresh veggies, milk & fruits',
  },
  {
    id: 'txn_009',
    merchant: 'Monthly Payout / Salary',
    title: 'TechCorp Salary',
    category: 'Salary',
    amount: 120000,
    type: 'income',
    dateStr: 'Nov 01',
    timeStr: '9:00 AM',
    dateGroup: 'Earlier',
    paymentMethod: 'Direct Bank Transfer',
    notes: 'November Monthly Payroll',
  },
];

export const mockFinancialSummary = {
  totalBalance: 84500,
  income: 120000,
  expenses: 35500,
  currency: '₹',
};

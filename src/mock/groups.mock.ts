export interface GroupMemberItem {
  id: string;
  name: string;
  email: string;
  avatarBg?: string;
  isCurrentUser?: boolean;
}

export interface GroupExpenseItem {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  dateStr: string;
}

export interface GroupBalanceItem {
  memberName: string;
  amount: number;
  type: 'owed' | 'owes' | 'settled';
}

export interface MockGroupItem {
  id: string;
  name: string;
  currency: string;
  membersCount: number;
  members: GroupMemberItem[];
  expenses: GroupExpenseItem[];
  balances: GroupBalanceItem[];
  settlements: {
    from: string;
    to: string;
    amount: number;
  }[];
  totalSpent: number;
  userBalance: {
    status: 'owed' | 'owes' | 'settled';
    amount: number;
  };
}

export const mockGroupsSummary = {
  youAreOwed: 3400,
  youOwe: 1250,
  pendingSettlementsCount: 2,
  activeGroupsCount: 3,
};

export const mockPendingSettlements = [
  {
    id: 'settle_1',
    title: 'Jai Sharma owes you ₹450',
    subtitle: 'Goa Trip · Beach Shack Dinner',
    type: 'incoming' as const,
    amount: 450,
    personName: 'Jai Sharma',
  },
  {
    id: 'settle_2',
    title: 'You owe Krish Patel ₹200',
    subtitle: 'Flat Expenses · Wi-Fi Bill',
    type: 'outgoing' as const,
    amount: 200,
    personName: 'Krish Patel',
  },
];

export const mockGroups: MockGroupItem[] = [
  {
    id: 'grp_001',
    name: 'Goa Trip',
    currency: 'INR',
    membersCount: 4,
    totalSpent: 23800,
    userBalance: {
      status: 'owed',
      amount: 3400,
    },
    members: [
      { id: 'm1', name: 'Vansh Mehta (You)', email: 'vansh@example.com', isCurrentUser: true },
      { id: 'm2', name: 'Jai Sharma', email: 'jai@example.com' },
      { id: 'm3', name: 'Rohan Verma', email: 'rohan@example.com' },
      { id: 'm4', name: 'Aryan Shah', email: 'aryan@example.com' },
    ],
    expenses: [
      { id: 'ge_1', title: 'Villa Booking 3 Nights', amount: 16000, paidBy: 'Vansh Mehta', dateStr: 'Nov 12' },
      { id: 'ge_2', title: 'Scuba Diving & Watersports', amount: 6000, paidBy: 'Rohan Verma', dateStr: 'Nov 13' },
      { id: 'ge_3', title: 'Beach Shack Dinner', amount: 1800, paidBy: 'Vansh Mehta', dateStr: 'Nov 14' },
    ],
    balances: [
      { memberName: 'Jai Sharma', amount: 450, type: 'owes' },
      { memberName: 'Rohan Verma', amount: 1200, type: 'owes' },
      { memberName: 'Aryan Shah', amount: 1750, type: 'owes' },
    ],
    settlements: [
      { from: 'Jai Sharma', to: 'Vansh Mehta', amount: 450 },
      { from: 'Rohan Verma', to: 'Vansh Mehta', amount: 1200 },
      { from: 'Aryan Shah', to: 'Vansh Mehta', amount: 1750 },
    ],
  },
  {
    id: 'grp_002',
    name: 'Flat Expenses',
    currency: 'INR',
    membersCount: 3,
    totalSpent: 5049,
    userBalance: {
      status: 'owes',
      amount: 1250,
    },
    members: [
      { id: 'm1', name: 'Vansh Mehta (You)', email: 'vansh@example.com', isCurrentUser: true },
      { id: 'm5', name: 'Krish Patel', email: 'krish@example.com' },
      { id: 'm6', name: 'Sameer Kulkarni', email: 'sameer@example.com' },
    ],
    expenses: [
      { id: 'ge_4', title: 'Groceries & Pantry Restock', amount: 3400, paidBy: 'Krish Patel', dateStr: 'Nov 11' },
      { id: 'ge_5', title: 'High-speed Fiber Wi-Fi', amount: 999, paidBy: 'Krish Patel', dateStr: 'Nov 08' },
      { id: 'ge_6', title: 'Apartment Cleaning Supplies', amount: 650, paidBy: 'Sameer Kulkarni', dateStr: 'Nov 05' },
    ],
    balances: [
      { memberName: 'Vansh Mehta', amount: 1250, type: 'owes' },
      { memberName: 'Krish Patel', amount: 1950, type: 'owed' },
      { memberName: 'Sameer Kulkarni', amount: 700, type: 'owes' },
    ],
    settlements: [
      { from: 'Vansh Mehta', to: 'Krish Patel', amount: 1250 },
      { from: 'Sameer Kulkarni', to: 'Krish Patel', amount: 700 },
    ],
  },
  {
    id: 'grp_003',
    name: 'College Friends',
    currency: 'INR',
    membersCount: 4,
    totalSpent: 7000,
    userBalance: {
      status: 'settled',
      amount: 0,
    },
    members: [
      { id: 'm1', name: 'Vansh Mehta (You)', email: 'vansh@example.com', isCurrentUser: true },
      { id: 'm7', name: 'Ananya Roy', email: 'ananya@example.com' },
      { id: 'm8', name: 'Kabir Singh', email: 'kabir@example.com' },
      { id: 'm9', name: 'Riya Sen', email: 'riya@example.com' },
    ],
    expenses: [
      { id: 'ge_7', title: 'Annual Alumni Dinner', amount: 4800, paidBy: 'Ananya Roy', dateStr: 'Oct 28' },
      { id: 'ge_8', title: 'Weekend Bowling Arena', amount: 2200, paidBy: 'Kabir Singh', dateStr: 'Oct 29' },
    ],
    balances: [
      { memberName: 'All balances settled', amount: 0, type: 'settled' },
    ],
    settlements: [],
  },
];

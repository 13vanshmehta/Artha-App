import { colors } from '../theme/colors';

export interface MockCategory {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
  iconName: string;
}

export const mockCategories: MockCategory[] = [
  { id: 'cat_food', name: 'Food', amount: 14200, percentage: 40, color: colors.bluePrimary, iconName: 'Utensils' },
  { id: 'cat_transport', name: 'Transport', amount: 6800, percentage: 19, color: '#F59E0B', iconName: 'Car' },
  { id: 'cat_shopping', name: 'Shopping', amount: 10300, percentage: 29, color: colors.navyPrimary, iconName: 'ShoppingBag' },
  { id: 'cat_entertainment', name: 'Entertainment', amount: 4200, percentage: 12, color: '#8B5CF6', iconName: 'Film' },
];

export const mockAllCategories: MockCategory[] = [
  { id: 'cat_food', name: 'Food', amount: 14200, percentage: 40, color: colors.bluePrimary, iconName: 'Utensils' },
  { id: 'cat_transport', name: 'Transport', amount: 6800, percentage: 19, color: '#F59E0B', iconName: 'Car' },
  { id: 'cat_shopping', name: 'Shopping', amount: 10300, percentage: 29, color: colors.navyPrimary, iconName: 'ShoppingBag' },
  { id: 'cat_entertainment', name: 'Entertainment', amount: 4200, percentage: 12, color: '#8B5CF6', iconName: 'Film' },
  { id: 'cat_bills', name: 'Bills & Utilities', amount: 9100, percentage: 20, color: colors.blueLight, iconName: 'Zap' },
  { id: 'cat_health', name: 'Health & Wellness', amount: 2500, percentage: 6, color: '#10B981', iconName: 'HeartPulse' },
];

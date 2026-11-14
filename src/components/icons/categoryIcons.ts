import { AppIconName } from './AppIcon';
import { colors } from '../../theme/colors';

export interface CategoryIconConfig {
  iconName: AppIconName;
  iconColor: string;
  backgroundColor: string;
  label: string;
}

export const CATEGORY_ICON_REGISTRY: Record<string, CategoryIconConfig> = {
  Food: {
    iconName: 'Utensils',
    iconColor: '#EA580C',
    backgroundColor: '#FFF3E8',
    label: 'Food & Dining',
  },
  'Food & Dining': {
    iconName: 'Utensils',
    iconColor: '#EA580C',
    backgroundColor: '#FFF3E8',
    label: 'Food & Dining',
  },
  Transport: {
    iconName: 'Car',
    iconColor: '#2563EB',
    backgroundColor: '#EBF5FF',
    label: 'Transport',
  },
  Transportation: {
    iconName: 'Car',
    iconColor: '#2563EB',
    backgroundColor: '#EBF5FF',
    label: 'Transport',
  },
  Shopping: {
    iconName: 'ShoppingBag',
    iconColor: '#16A34A',
    backgroundColor: '#E6F4EA',
    label: 'Shopping',
  },
  Health: {
    iconName: 'HeartPulse',
    iconColor: '#D97706',
    backgroundColor: '#FEF3C7',
    label: 'Health & Wellness',
  },
  Bills: {
    iconName: 'Zap',
    iconColor: '#475569',
    backgroundColor: '#F1F5F9',
    label: 'Bills & Utilities',
  },
  'Bills & Utilities': {
    iconName: 'Zap',
    iconColor: '#475569',
    backgroundColor: '#F1F5F9',
    label: 'Bills & Utilities',
  },
  Entertainment: {
    iconName: 'Film',
    iconColor: '#9333EA',
    backgroundColor: '#F3E8FF',
    label: 'Entertainment',
  },
  Travel: {
    iconName: 'Plane',
    iconColor: '#0284C7',
    backgroundColor: '#E0F2FE',
    label: 'Travel',
  },
  Education: {
    iconName: 'GraduationCap',
    iconColor: '#0891B2',
    backgroundColor: '#ECFEFF',
    label: 'Education',
  },
  Groceries: {
    iconName: 'Utensils',
    iconColor: '#15803D',
    backgroundColor: '#DCFCE7',
    label: 'Groceries',
  },
  Income: {
    iconName: 'ArrowDownLeft',
    iconColor: '#16A34A',
    backgroundColor: '#DCFCE7',
    label: 'Income',
  },
  Salary: {
    iconName: 'Banknote',
    iconColor: '#16A34A',
    backgroundColor: '#DCFCE7',
    label: 'Salary',
  },
  Investments: {
    iconName: 'Wallet',
    iconColor: colors.navyPrimary,
    backgroundColor: colors.borderNavy,
    label: 'Investments',
  },
  Other: {
    iconName: 'Tag',
    iconColor: '#64748B',
    backgroundColor: '#F1F5F9',
    label: 'Other',
  },
};

export function getCategoryIconConfig(categoryName: string): CategoryIconConfig {
  const normalized = categoryName.trim();
  if (CATEGORY_ICON_REGISTRY[normalized]) {
    return CATEGORY_ICON_REGISTRY[normalized];
  }

  // Fallback case-insensitive search
  const foundKey = Object.keys(CATEGORY_ICON_REGISTRY).find(
    (key) => key.toLowerCase() === normalized.toLowerCase(),
  );

  if (foundKey) {
    return CATEGORY_ICON_REGISTRY[foundKey];
  }

  return {
    iconName: 'Tag',
    iconColor: '#64748B',
    backgroundColor: '#F1F5F9',
    label: categoryName,
  };
}

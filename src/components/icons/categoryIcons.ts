import { AppIconName } from './AppIcon';
import { colors } from '../../theme/colors';

export interface CategoryIconConfig {
  iconName: AppIconName;
  iconColor: string;
  backgroundColor: string;
  darkBackgroundColor?: string;
  darkIconColor?: string;
  label: string;
}

export const CATEGORY_ICON_REGISTRY: Record<string, CategoryIconConfig> = {
  Food: {
    iconName: 'Utensils',
    iconColor: '#EA580C',
    backgroundColor: '#FFF3E8',
    darkBackgroundColor: 'rgba(234, 88, 12, 0.16)',
    darkIconColor: '#FB923C',
    label: 'Food & Dining',
  },
  'Food & Dining': {
    iconName: 'Utensils',
    iconColor: '#EA580C',
    backgroundColor: '#FFF3E8',
    darkBackgroundColor: 'rgba(234, 88, 12, 0.16)',
    darkIconColor: '#FB923C',
    label: 'Food & Dining',
  },
  Transport: {
    iconName: 'Car',
    iconColor: '#2563EB',
    backgroundColor: '#EBF5FF',
    darkBackgroundColor: 'rgba(37, 99, 235, 0.16)',
    darkIconColor: '#60A5FA',
    label: 'Transport',
  },
  Transportation: {
    iconName: 'Car',
    iconColor: '#2563EB',
    backgroundColor: '#EBF5FF',
    darkBackgroundColor: 'rgba(37, 99, 235, 0.16)',
    darkIconColor: '#60A5FA',
    label: 'Transport',
  },
  Shopping: {
    iconName: 'ShoppingBag',
    iconColor: '#16A34A',
    backgroundColor: '#E6F4EA',
    darkBackgroundColor: 'rgba(22, 163, 74, 0.16)',
    darkIconColor: '#4ADE80',
    label: 'Shopping',
  },
  Health: {
    iconName: 'HeartPulse',
    iconColor: '#D97706',
    backgroundColor: '#FEF3C7',
    darkBackgroundColor: 'rgba(217, 119, 6, 0.16)',
    darkIconColor: '#FBBF24',
    label: 'Health & Wellness',
  },
  Bills: {
    iconName: 'Zap',
    iconColor: '#475569',
    backgroundColor: '#F1F5F9',
    darkBackgroundColor: 'rgba(148, 163, 184, 0.16)',
    darkIconColor: '#CBD5E1',
    label: 'Bills & Utilities',
  },
  'Bills & Utilities': {
    iconName: 'Zap',
    iconColor: '#475569',
    backgroundColor: '#F1F5F9',
    darkBackgroundColor: 'rgba(148, 163, 184, 0.16)',
    darkIconColor: '#CBD5E1',
    label: 'Bills & Utilities',
  },
  Entertainment: {
    iconName: 'Film',
    iconColor: '#9333EA',
    backgroundColor: '#F3E8FF',
    darkBackgroundColor: 'rgba(147, 51, 234, 0.16)',
    darkIconColor: '#C084FC',
    label: 'Entertainment',
  },
  Travel: {
    iconName: 'Plane',
    iconColor: '#0284C7',
    backgroundColor: '#E0F2FE',
    darkBackgroundColor: 'rgba(2, 132, 199, 0.16)',
    darkIconColor: '#38BDF8',
    label: 'Travel',
  },
  Education: {
    iconName: 'GraduationCap',
    iconColor: '#0891B2',
    backgroundColor: '#ECFEFF',
    darkBackgroundColor: 'rgba(8, 145, 178, 0.16)',
    darkIconColor: '#22D3EE',
    label: 'Education',
  },
  Groceries: {
    iconName: 'Utensils',
    iconColor: '#15803D',
    backgroundColor: '#DCFCE7',
    darkBackgroundColor: 'rgba(21, 128, 61, 0.16)',
    darkIconColor: '#4ADE80',
    label: 'Groceries',
  },
  Income: {
    iconName: 'ArrowDownLeft',
    iconColor: '#16A34A',
    backgroundColor: '#DCFCE7',
    darkBackgroundColor: 'rgba(22, 163, 74, 0.16)',
    darkIconColor: '#4ADE80',
    label: 'Income',
  },
  Salary: {
    iconName: 'Banknote',
    iconColor: '#16A34A',
    backgroundColor: '#DCFCE7',
    darkBackgroundColor: 'rgba(22, 163, 74, 0.16)',
    darkIconColor: '#4ADE80',
    label: 'Salary',
  },
  Investments: {
    iconName: 'Wallet',
    iconColor: colors.navyPrimary,
    backgroundColor: colors.borderNavy,
    darkBackgroundColor: 'rgba(245, 138, 7, 0.16)',
    darkIconColor: '#F58A07',
    label: 'Investments',
  },
  Other: {
    iconName: 'Tag',
    iconColor: '#64748B',
    backgroundColor: '#F1F5F9',
    darkBackgroundColor: 'rgba(148, 163, 184, 0.16)',
    darkIconColor: '#CBD5E1',
    label: 'Other',
  },
};

export function getCategoryIconConfig(
  categoryName: string,
  isDark: boolean = false,
): CategoryIconConfig {
  const normalized = categoryName.trim();
  let base: CategoryIconConfig | undefined = CATEGORY_ICON_REGISTRY[normalized];

  if (!base) {
    const foundKey = Object.keys(CATEGORY_ICON_REGISTRY).find(
      (key) => key.toLowerCase() === normalized.toLowerCase(),
    );
    if (foundKey) {
      base = CATEGORY_ICON_REGISTRY[foundKey];
    }
  }

  if (!base) {
    base = {
      iconName: 'Tag',
      iconColor: '#64748B',
      backgroundColor: '#F1F5F9',
      darkBackgroundColor: 'rgba(148, 163, 184, 0.16)',
      darkIconColor: '#CBD5E1',
      label: categoryName,
    };
  }

  if (isDark) {
    return {
      ...base,
      backgroundColor: base.darkBackgroundColor || 'rgba(255, 255, 255, 0.08)',
      iconColor: base.darkIconColor || base.iconColor,
    };
  }

  return base;
}

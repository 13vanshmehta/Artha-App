import { AppIconName } from './AppIcon';

export type NavTabKey = 'Home' | 'PE Tracker' | 'Groups' | 'Account';

export interface NavIconConfig {
  iconName: AppIconName;
  label: string;
}

export const NAVIGATION_ICONS: Record<NavTabKey, NavIconConfig> = {
  Home: {
    iconName: 'Home',
    label: 'Home',
  },
  'PE Tracker': {
    iconName: 'ReceiptText',
    label: 'PE Tracker',
  },
  Groups: {
    iconName: 'Users',
    label: 'Groups',
  },
  Account: {
    iconName: 'User',
    label: 'Account',
  },
};

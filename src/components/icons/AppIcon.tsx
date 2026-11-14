import React from 'react';
import { colors } from '../../theme/colors';
import {
  Home,
  ReceiptText,
  Wallet,
  Users,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Utensils,
  Bus,
  Car,
  ShoppingBag,
  ShoppingCart,
  HeartPulse,
  Zap,
  Film,
  Gift,
  Plane,
  Laptop,
  Smartphone,
  Tablet,
  Key,
  Mail,
  AlertTriangle,
  Plus,
  Minus,
  Search,
  SlidersHorizontal,
  X,
  Check,
  Trash2,
  Pencil,
  Calendar,
  Eye,
  EyeOff,
  Bell,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Lightbulb,
  Shield,
  Lock,
  LogOut,
  CircleHelp,
  Share2,
  Coffee,
  GraduationCap,
  Tag,
  CircleAlert,
  HelpCircle,
  BarChart3,
  Flag,
  MoreVertical,
  LucideProps,
} from 'lucide-react-native';

export type AppIconName =
  | 'Home'
  | 'ReceiptText'
  | 'Wallet'
  | 'Users'
  | 'User'
  | 'ArrowDownLeft'
  | 'ArrowUpRight'
  | 'Banknote'
  | 'Utensils'
  | 'Bus'
  | 'Car'
  | 'ShoppingBag'
  | 'ShoppingCart'
  | 'HeartPulse'
  | 'Zap'
  | 'Film'
  | 'Gift'
  | 'Plane'
  | 'Laptop'
  | 'Smartphone'
  | 'Tablet'
  | 'Key'
  | 'Mail'
  | 'AlertTriangle'
  | 'Plus'
  | 'Minus'
  | 'Search'
  | 'SlidersHorizontal'
  | 'X'
  | 'Check'
  | 'Trash2'
  | 'Pencil'
  | 'Calendar'
  | 'Eye'
  | 'EyeOff'
  | 'Bell'
  | 'ChevronRight'
  | 'ChevronLeft'
  | 'ChevronDown'
  | 'ChevronUp'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowRight'
  | 'Lightbulb'
  | 'Shield'
  | 'Lock'
  | 'LogOut'
  | 'CircleHelp'
  | 'Share2'
  | 'Coffee'
  | 'GraduationCap'
  | 'Tag'
  | 'CircleAlert'
  | 'HelpCircle'
  | 'BarChart3'
  | 'Flag'
  | 'MoreVertical';

const ICON_MAP: Record<AppIconName, React.FC<LucideProps>> = {
  Home,
  ReceiptText,
  Wallet,
  Users,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Utensils,
  Bus,
  Car,
  ShoppingBag,
  ShoppingCart,
  HeartPulse,
  Zap,
  Film,
  Gift,
  Plane,
  Laptop,
  Smartphone,
  Tablet,
  Key,
  Mail,
  AlertTriangle,
  Plus,
  Minus,
  Search,
  SlidersHorizontal,
  X,
  Check,
  Trash2,
  Pencil,
  Calendar,
  Eye,
  EyeOff,
  Bell,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Lightbulb,
  Shield,
  Lock,
  LogOut,
  CircleHelp,
  Share2,
  Coffee,
  GraduationCap,
  Tag,
  CircleAlert,
  HelpCircle,
  BarChart3,
  Flag,
  MoreVertical,
};

export interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  color = colors.navyDeep,
  strokeWidth = 2,
}) => {
  const IconComponent = ICON_MAP[name] || CircleHelp;
  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} />;
};

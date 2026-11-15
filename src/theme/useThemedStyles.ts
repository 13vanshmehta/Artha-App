import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Palette } from './colors';

/**
 * Hook to create themed style objects that update dynamically whenever theme changes.
 */
export function useThemedStyles<T>(make: (colors: Palette, isDark: boolean) => T): T {
  const { colors, isDark } = useTheme();
  return useMemo(() => make(colors, isDark), [colors, isDark, make]);
}

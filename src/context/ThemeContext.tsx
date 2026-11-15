import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { sunsetNavyColors, oledDarkColors, ThemeColors } from '../theme/colors';
import {
  readThemePreference,
  writeThemePreference,
  migrateLegacyThemePreference,
  ThemePreference,
} from '../services/themePreferenceStore';
import { secureStorage } from '../services/secureStorage';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  isDark: false,
  colors: sunsetNavyColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();

  // Instant synchronous MMKV read (< 0.01ms):
  // If the user already set a theme ('light' | 'dark'), read it immediately on frame 0.
  // If the user never chose a theme (null), use 'system' as default.
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = readThemePreference();
    return stored ?? 'system';
  });

  // Background migration for legacy Keychain entries (if any)
  useEffect(() => {
    let mounted = true;
    migrateLegacyThemePreference()
      .then((migrated) => {
        if (!mounted || !migrated) return;
        setThemeState((current) => (current === 'system' ? migrated : current));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (newTheme === 'light' || newTheme === 'dark') {
      writeThemePreference(newTheme);
    }
    secureStorage.saveStoredTheme(newTheme).catch(() => {});
  }, []);

  const isDark = useMemo(() => {
    if (theme === 'system') {
      const activeSystemScheme = systemColorScheme ?? Appearance.getColorScheme();
      return activeSystemScheme === 'dark';
    }
    return theme === 'dark';
  }, [theme, systemColorScheme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const activeSystemScheme = systemColorScheme ?? Appearance.getColorScheme();
      const currentDark = prev === 'system' ? activeSystemScheme === 'dark' : prev === 'dark';
      const next: ThemePreference = currentDark ? 'light' : 'dark';
      writeThemePreference(next);
      secureStorage.saveStoredTheme(next).catch(() => {});
      return next;
    });
  }, [systemColorScheme]);

  const activeColors = useMemo(
    () => (isDark ? oledDarkColors : sunsetNavyColors),
    [isDark],
  );

  const value = useMemo(
    () => ({
      theme,
      isDark,
      colors: activeColors,
      toggleTheme,
      setTheme,
    }),
    [theme, isDark, activeColors, toggleTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

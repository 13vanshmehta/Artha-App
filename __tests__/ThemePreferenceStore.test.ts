import {
  readThemePreference,
  writeThemePreference,
  migrateLegacyThemePreference,
  __resetThemePreferenceStoreForTests,
} from '../src/services/themePreferenceStore';
import { secureStorage } from '../src/services/secureStorage';

describe('themePreferenceStore', () => {
  beforeEach(() => {
    __resetThemePreferenceStoreForTests();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('defaults to null when no preference has been set by the user (falls back to system)', () => {
    expect(readThemePreference()).toBeNull();
  });

  it('stores and synchronously reads "light" preference', () => {
    writeThemePreference('light');
    expect(readThemePreference()).toBe('light');
  });

  it('stores and synchronously reads "dark" preference', () => {
    writeThemePreference('dark');
    expect(readThemePreference()).toBe('dark');
  });

  it('migrates legacy stored theme from secureStorage if present and not set locally', async () => {
    jest.spyOn(secureStorage, 'loadStoredTheme').mockResolvedValueOnce('dark');
    const clearSpy = jest.spyOn(secureStorage, 'clearStoredTheme').mockResolvedValueOnce();

    const migrated = await migrateLegacyThemePreference();
    expect(migrated).toBe('dark');
    expect(readThemePreference()).toBe('dark');
    expect(clearSpy).toHaveBeenCalled();
  });

  it('skips migration if a theme is already set', async () => {
    writeThemePreference('light');
    const loadSpy = jest.spyOn(secureStorage, 'loadStoredTheme');

    const migrated = await migrateLegacyThemePreference();
    expect(migrated).toBeNull();
    expect(loadSpy).not.toHaveBeenCalled();
    expect(readThemePreference()).toBe('light');
  });
});

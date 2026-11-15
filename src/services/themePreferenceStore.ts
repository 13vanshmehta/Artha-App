/**
 * Device-local storage for the user's appearance choice.
 *
 * The choice must be known on the very first render — before the splash screen
 * draws — so it is read SYNCHRONOUSLY (< 1-2 ms):
 * 1. On iOS: iOS NSUserDefaults via SettingsManager TurboModule (read synchronously from memory, 0 extra pods).
 * 2. On Nitro-enabled platforms: MMKV memory-mapped key/value store, safely probed via TurboModuleRegistry.get so it never throws if missing.
 * 3. In-memory cache + background secureStorage fallback.
 *
 * `null` means "the user never chose" → the app follows the system appearance.
 */
import { Platform } from 'react-native';
import type { MMKV } from 'react-native-mmkv';
import { secureStorage } from './secureStorage';

export type ThemePreference = 'light' | 'dark';

const STORE_ID = 'artha.preferences';
const THEME_KEY = 'appearance.theme';

let inMemoryPreference: ThemePreference | null = null;
let mmkvStore: MMKV | null | undefined;
let cachedSettingsDict: Record<string, unknown> | null = null;

function parse(value: unknown): ThemePreference | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/**
 * Safely queries TurboModuleRegistry using non-throwing .get() instead of .getEnforcing().
 * This completely avoids Invariant Violation crashes in bridgeless/Fabric and Jest environments.
 */
function getTurboModule<T = any>(name: string): T | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TurboModuleRegistry } = require('react-native');
    return (TurboModuleRegistry?.get?.(name) as T) ?? null;
  } catch {
    return null;
  }
}

interface SettingsManagerSpec {
  getConstants: () => { settings?: Record<string, unknown> };
  setValues: (values: Record<string, unknown>) => void;
  deleteValues?: (keys: string[]) => void;
}

function getSettingsManager(): SettingsManagerSpec | null {
  if (Platform.OS !== 'ios') return null;
  return getTurboModule<SettingsManagerSpec>('SettingsManager');
}

function readFromNativeSettings(): ThemePreference | null {
  try {
    const sm = getSettingsManager();
    if (!sm) return null;
    if (!cachedSettingsDict) {
      cachedSettingsDict = sm.getConstants()?.settings ?? {};
    }
    const val = cachedSettingsDict[THEME_KEY];
    return parse(val);
  } catch {
    return null;
  }
}

function writeToNativeSettings(preference: ThemePreference | null): void {
  try {
    const sm = getSettingsManager();
    if (!sm) return;
    if (!cachedSettingsDict) {
      cachedSettingsDict = sm.getConstants()?.settings ?? {};
    }
    if (preference) {
      cachedSettingsDict[THEME_KEY] = preference;
      sm.setValues({ [THEME_KEY]: preference });
    } else {
      delete cachedSettingsDict[THEME_KEY];
      if (typeof sm.deleteValues === 'function') {
        sm.deleteValues([THEME_KEY]);
      } else {
        sm.setValues({ [THEME_KEY]: null });
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Lazily creates the MMKV instance only if NitroModules is registered.
 * If NitroModules is not linked into the running binary, returns null cleanly
 * without throwing or triggering redbox warnings.
 */
function getMMKVStore(): MMKV | null {
  if (mmkvStore !== undefined) {
    return mmkvStore;
  }
  const nitro = getTurboModule('NitroModules');
  if (!nitro) {
    mmkvStore = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    mmkvStore = createMMKV({ id: STORE_ID });
  } catch {
    mmkvStore = null;
  }
  return mmkvStore;
}

/**
 * Synchronous: safe to call during the first render before splash screen draws.
 * Runs in < 0.1ms.
 */
export function readThemePreference(): ThemePreference | null {
  if (inMemoryPreference !== null) {
    return inMemoryPreference;
  }

  // 1. Try iOS NSUserDefaults via SettingsManager
  const nativeVal = readFromNativeSettings();
  if (nativeVal !== null) {
    inMemoryPreference = nativeVal;
    return nativeVal;
  }

  // 2. Try MMKV (if TurboModules / Nitro is linked)
  try {
    const mmkvVal = parse(getMMKVStore()?.getString(THEME_KEY));
    if (mmkvVal !== null) {
      inMemoryPreference = mmkvVal;
      return mmkvVal;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Persists the user's theme selection synchronously to native storage + memory,
 * and asynchronously to secureStorage for permanent redundancy.
 */
export function writeThemePreference(preference: ThemePreference): void {
  inMemoryPreference = preference;

  // 1. Write to native iOS NSUserDefaults
  writeToNativeSettings(preference);

  // 2. Write to MMKV if available
  try {
    getMMKVStore()?.set(THEME_KEY, preference);
  } catch {
    // ignore
  }

  // 3. Redundant persistent backup
  secureStorage.saveStoredTheme(preference).catch(() => {});
}

/**
 * One-time migration from the legacy Keychain entry so existing users keep
 * their choice. Runs after first paint; after it, every launch is synchronous.
 * Resolves to the migrated preference, or null if there was nothing to move.
 */
export async function migrateLegacyThemePreference(): Promise<ThemePreference | null> {
  const current = readThemePreference();
  if (current !== null) {
    return null;
  }

  try {
    const legacy = parse(await secureStorage.loadStoredTheme());
    if (legacy) {
      writeThemePreference(legacy);
      await secureStorage.clearStoredTheme();
      return legacy;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Test helper: forget the in-process instance so a test can start clean. */
export function __resetThemePreferenceStoreForTests(): void {
  inMemoryPreference = null;
  writeToNativeSettings(null);
  try {
    getMMKVStore()?.remove(THEME_KEY);
  } catch {
    // ignore
  }
}

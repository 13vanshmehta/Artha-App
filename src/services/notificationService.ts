import { Platform, NativeModules, PermissionsAndroid } from 'react-native';
import type { MMKV } from 'react-native-mmkv';
import { AppIconName } from '../components/icons/AppIcon';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string; // e.g. "9:25 am"
  createdAt: number; // epoch ms
  dateGroup: string; // e.g. "Today, Nov 15", "Yesterday, Nov 14", "Earlier this week", "Older"
  read: boolean;
  iconName: AppIconName;
  iconColor: string;
  iconBg: string;
  payload?: Record<string, unknown>;
}

export interface CreateNotificationParams {
  title: string;
  message: string;
  iconName?: AppIconName;
  iconColor?: string;
  iconBg?: string;
  payload?: Record<string, unknown>;
}

const STORAGE_KEY = 'artha.notifications.store';
const MAX_NOTIFICATIONS = 50;

let mmkvStore: MMKV | null | undefined;
let inMemoryStore: NotificationItem[] = [];
let hasLoadedFromStorage = false;
const listeners = new Set<(notifications: NotificationItem[]) => void>();

function getMMKV(): MMKV | null {
  if (mmkvStore !== undefined) {
    return mmkvStore;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    mmkvStore = createMMKV({ id: 'artha.notifications' });
    return mmkvStore;
  } catch {
    mmkvStore = null;
    return null;
  }
}

export function computeDateGroup(timestampMs: number): string {
  const now = new Date();
  const date = new Date(timestampMs);

  const isToday =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    yesterday.getFullYear() === date.getFullYear() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getDate() === date.getDate();

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();

  if (isToday) {
    return `Today, ${month} ${day}`;
  }
  if (isYesterday) {
    return `Yesterday, ${month} ${day}`;
  }

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) {
    return 'Earlier this week';
  }
  return 'Older';
}

export function formatNotificationTime(timestampMs: number): string {
  const d = new Date(timestampMs);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${minutesStr} ${ampm}`;
}

function loadFromStorage(): NotificationItem[] {
  if (hasLoadedFromStorage) {
    return inMemoryStore;
  }
  try {
    const mmkv = getMMKV();
    if (mmkv) {
      const raw = mmkv.getString(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          inMemoryStore = parsed;
          hasLoadedFromStorage = true;
          return inMemoryStore;
        }
      }
    }
  } catch {
    // Non-fatal: fallback to memory store
  }
  hasLoadedFromStorage = true;
  return inMemoryStore;
}

function persistToStorage(items: NotificationItem[]): void {
  inMemoryStore = items;
  try {
    const mmkv = getMMKV();
    if (mmkv) {
      mmkv.set(STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    // Silent fallback
  }
}

function notifySubscribers(): void {
  const current = [...inMemoryStore];
  listeners.forEach((listener) => {
    try {
      listener(current);
    } catch {
      // Ignore listener error
    }
  });
}

/**
 * Triggers native system tray notification (Android NotificationManager).
 */
async function triggerSystemTrayNotification(
  title: string,
  message: string,
  id: number,
): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // Request permission if Android 13+ (API 33+)
    if (Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (!granted) {
          const res = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          if (res !== PermissionsAndroid.RESULTS.GRANTED) {
            return;
          }
        }
      } catch {
        // Continue attempting native module
      }
    }

    const nativeManager = NativeModules.ArthaNotificationManager;
    if (nativeManager && typeof nativeManager.showNotification === 'function') {
      await nativeManager.showNotification(title, message, id);
    }
  } catch {
    // Graceful fallback for environments without native modules
  }
}

export const notificationService = {
  /**
   * Get all current real notifications.
   */
  getNotifications(): NotificationItem[] {
    return loadFromStorage();
  },

  /**
   * Unread notification count.
   */
  getUnreadCount(): number {
    return loadFromStorage().filter((n) => !n.read).length;
  },

  /**
   * Adds a real-time notification to in-app notification center and triggers system tray alert.
   */
  async addNotification(params: CreateNotificationParams): Promise<NotificationItem> {
    const now = Date.now();
    const numericId = Math.floor(Math.random() * 900000) + 100000;
    const newItem: NotificationItem = {
      id: `artha-notif-${now}-${numericId}`,
      title: params.title,
      message: params.message,
      createdAt: now,
      timestamp: formatNotificationTime(now),
      dateGroup: computeDateGroup(now),
      read: false,
      iconName: params.iconName ?? 'Bell',
      iconColor: params.iconColor ?? '#084887',
      iconBg: params.iconBg ?? '#E0F2FE',
      payload: params.payload,
    };

    const current = loadFromStorage();
    const updated = [newItem, ...current].slice(0, MAX_NOTIFICATIONS);
    persistToStorage(updated);
    notifySubscribers();

    // Trigger Android system notification tray
    await triggerSystemTrayNotification(newItem.title, newItem.message, numericId);

    return newItem;
  },

  /**
   * Mark a specific notification as read.
   */
  markAsRead(id: string): void {
    const current = loadFromStorage();
    const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
    persistToStorage(updated);
    notifySubscribers();
  },

  /**
   * Mark all notifications as read.
   */
  markAllAsRead(): void {
    const current = loadFromStorage();
    const updated = current.map((n) => ({ ...n, read: true }));
    persistToStorage(updated);
    notifySubscribers();
  },

  /**
   * Delete a single notification.
   */
  deleteNotification(id: string): void {
    const current = loadFromStorage();
    const updated = current.filter((n) => n.id !== id);
    persistToStorage(updated);
    notifySubscribers();
  },

  /**
   * Clear all notifications.
   */
  clearAll(): void {
    persistToStorage([]);
    notifySubscribers();
  },

  /**
   * Subscribe to real-time notification updates.
   */
  subscribe(listener: (notifications: NotificationItem[]) => void): () => void {
    listeners.add(listener);
    listener([...loadFromStorage()]);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Request system notification permission (Android 13+).
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      if (Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
      const nativeManager = NativeModules.ArthaNotificationManager;
      if (nativeManager && typeof nativeManager.areNotificationsEnabled === 'function') {
        return await nativeManager.areNotificationsEnabled();
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * For testing or reset purposes.
   */
  __resetForTesting(initialItems: NotificationItem[] = []): void {
    inMemoryStore = initialItems;
    hasLoadedFromStorage = true;
    try {
      const mmkv = getMMKV();
      if (mmkv) {
        if (initialItems.length > 0) {
          mmkv.set(STORAGE_KEY, JSON.stringify(initialItems));
        } else {
          mmkv.remove(STORAGE_KEY);
        }
      }
    } catch {
      // Ignored in test
    }
    notifySubscribers();
  },
};

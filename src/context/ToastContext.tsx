import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo } from 'react-native';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastOptions {
  id?: string;
  title?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration: number;
  createdAt: number;
}

export const DEFAULT_TOAST_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info: 3000,
  warning: 4000,
  error: 4000,
};

export const DEFAULT_TOAST_TITLES: Record<ToastType, string> = {
  success: 'Success',
  info: 'Information',
  warning: 'Warning',
  error: 'Something went wrong',
};

export const MAX_VISIBLE_TOASTS = 3;

interface ToastStateSnapshot {
  visible: ToastItem[];
  queue: ToastItem[];
}

type ToastListener = (snapshot: ToastStateSnapshot) => void;

const INTERNAL_DETAIL_PATTERN =
  /ARTHA_|\.env|Client ID|idToken|identityToken|Exception|Stack|Prisma|SQL|Keychain|https?:\/\//i;

function resolveSafeErrorTitle(
  rawMessage: string,
  explicitTitle?: string,
): string {
  const cleanExplicit = explicitTitle?.trim();
  if (cleanExplicit && !INTERNAL_DETAIL_PATTERN.test(cleanExplicit)) {
    return cleanExplicit;
  }
  if (
    rawMessage &&
    rawMessage.length <= 48 &&
    !INTERNAL_DETAIL_PATTERN.test(rawMessage)
  ) {
    return rawMessage;
  }
  return DEFAULT_TOAST_TITLES.error;
}

class CentralizedToastManager {
  private visible: ToastItem[] = [];
  private queue: ToastItem[] = [];
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private listeners = new Set<ToastListener>();
  private counter = 0;

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): ToastStateSnapshot {
    return {
      visible: [...this.visible],
      queue: [...this.queue],
    };
  }

  private emit() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  show(
    type: ToastType,
    message: string,
    titleOrOptions?: string | ToastOptions,
    maybeOptions?: number | ToastOptions,
  ): string {
    const cleanMessage = (message || '').trim();
    const extraOptions: ToastOptions =
      typeof maybeOptions === 'number'
        ? { duration: maybeOptions }
        : maybeOptions ?? {};
    const resolvedOptions: ToastOptions =
      typeof titleOrOptions === 'string'
        ? { ...extraOptions, title: titleOrOptions }
        : titleOrOptions ?? extraOptions;

    const isError = type === 'error';
    const title = isError
      ? resolveSafeErrorTitle(cleanMessage, resolvedOptions.title)
      : (resolvedOptions.title?.trim() || DEFAULT_TOAST_TITLES[type]).trim();

    // Error toasts never expose root cause or detailed error body in the UI; log to system console instead
    const isJest = Boolean((globalThis as Record<string, unknown>).jest);
    if (
      isError &&
      cleanMessage &&
      cleanMessage !== title &&
      typeof __DEV__ !== 'undefined' &&
      __DEV__ &&
      !isJest
    ) {
      console.warn(`[Artha Error Toast] ${title}:`, cleanMessage);
    }

    const displayMessage = isError ? '' : cleanMessage;

    const duration =
      typeof resolvedOptions.duration === 'number' &&
      resolvedOptions.duration > 0
        ? resolvedOptions.duration
        : DEFAULT_TOAST_DURATIONS[type];

    // Deduplicate identical active toast to prevent timer conflicts on rapid taps
    const existingVisibleIndex = this.visible.findIndex(
      (item) =>
        item.type === type &&
        item.title === title &&
        item.message === displayMessage,
    );

    if (existingVisibleIndex !== -1) {
      const existing = this.visible[existingVisibleIndex];
      const updated: ToastItem = {
        ...existing,
        duration,
        createdAt: Date.now(),
      };
      this.visible[existingVisibleIndex] = updated;
      this.scheduleAutoDismiss(updated.id, duration);
      this.emit();
      return updated.id;
    }

    const existingQueueIndex = this.queue.findIndex(
      (item) =>
        item.type === type &&
        item.title === title &&
        item.message === displayMessage,
    );
    if (existingQueueIndex !== -1) {
      return this.queue[existingQueueIndex].id;
    }

    this.counter += 1;
    const id =
      resolvedOptions.id || `artha-toast-${Date.now()}-${this.counter}`;

    const newItem: ToastItem = {
      id,
      type,
      title,
      message: displayMessage,
      duration,
      createdAt: Date.now(),
    };

    try {
      AccessibilityInfo.announceForAccessibility?.(
        displayMessage ? `${title}. ${displayMessage}` : title,
      );
    } catch {
      // Ignore accessibility announcement errors in non-native environments
    }

    if (this.visible.length < MAX_VISIBLE_TOASTS) {
      this.visible = [...this.visible, newItem];
      this.scheduleAutoDismiss(newItem.id, newItem.duration);
    } else {
      this.queue = [...this.queue, newItem];
    }

    this.emit();
    return id;
  }

  private scheduleAutoDismiss(id: string, duration: number) {
    const existingTimer = this.timers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.timers.delete(id);
      this.dismiss(id);
    }, duration);

    this.timers.set(id, timer);
  }

  dismiss(id: string) {
    const existingTimer = this.timers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.timers.delete(id);
    }

    const wasVisible = this.visible.some((item) => item.id === id);
    const wasQueued = this.queue.some((item) => item.id === id);

    if (!wasVisible && !wasQueued) {
      return;
    }

    this.visible = this.visible.filter((item) => item.id !== id);
    this.queue = this.queue.filter((item) => item.id !== id);

    while (
      this.visible.length < MAX_VISIBLE_TOASTS &&
      this.queue.length > 0
    ) {
      const [next, ...rest] = this.queue;
      this.queue = rest;
      const promoted: ToastItem = {
        ...next,
        createdAt: Date.now(),
      };
      this.visible = [...this.visible, promoted];
      this.scheduleAutoDismiss(promoted.id, promoted.duration);
    }

    this.emit();
  }

  dismissAll() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.visible = [];
    this.queue = [];
    this.emit();
  }
}

export const toastManager = new CentralizedToastManager();

export const toast = {
  success: (
    message: string,
    titleOrOptions?: string | ToastOptions,
    options?: number | ToastOptions,
  ) => toastManager.show('success', message, titleOrOptions, options),

  info: (
    message: string,
    titleOrOptions?: string | ToastOptions,
    options?: number | ToastOptions,
  ) => toastManager.show('info', message, titleOrOptions, options),

  warning: (
    message: string,
    titleOrOptions?: string | ToastOptions,
    options?: number | ToastOptions,
  ) => toastManager.show('warning', message, titleOrOptions, options),

  error: (
    message: string,
    titleOrOptions?: string | ToastOptions,
    options?: number | ToastOptions,
  ) => toastManager.show('error', message, titleOrOptions, options),

  dismiss: (id: string) => toastManager.dismiss(id),

  dismissAll: () => toastManager.dismissAll(),

  getSnapshot: () => toastManager.getSnapshot(),
};

export interface ToastContextValue {
  toasts: ToastItem[];
  queuedCount: number;
  success: typeof toast.success;
  info: typeof toast.info;
  warning: typeof toast.warning;
  error: typeof toast.error;
  dismiss: typeof toast.dismiss;
  dismissAll: typeof toast.dismissAll;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [snapshot, setSnapshot] = useState<ToastStateSnapshot>(() =>
    toastManager.getSnapshot(),
  );

  useEffect(() => {
    return toastManager.subscribe(setSnapshot);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts: snapshot.visible,
      queuedCount: snapshot.queue.length,
      success: toast.success,
      info: toast.info,
      warning: toast.warning,
      error: toast.error,
      dismiss: toast.dismiss,
      dismissAll: toast.dismissAll,
    }),
    [snapshot.queue.length, snapshot.visible],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx) {
    return ctx;
  }
  const snap = toastManager.getSnapshot();
  return {
    toasts: snap.visible,
    queuedCount: snap.queue.length,
    success: toast.success,
    info: toast.info,
    warning: toast.warning,
    error: toast.error,
    dismiss: toast.dismiss,
    dismissAll: toast.dismissAll,
  };
}

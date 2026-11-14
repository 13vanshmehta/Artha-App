import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { AppIconName } from '../components/icons/AppIcon';

export type AlertType = 'danger' | 'warning' | 'info' | 'success';

export interface AlertOptions {
  id?: string;
  title: string;
  message?: string;
  type?: AlertType;
  icon?: AppIconName;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  dismissOnBackdropPress?: boolean;
}

export interface AlertConfirmOptions {
  title: string;
  message?: string;
  type?: AlertType;
  icon?: AppIconName;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  dismissOnBackdropPress?: boolean;
}

export interface ActiveAlert extends AlertOptions {
  id: string;
  isResolving?: boolean;
}

type AlertListener = (activeAlert: ActiveAlert | null) => void;

class CentralizedAlertManager {
  private currentAlert: ActiveAlert | null = null;
  private listeners = new Set<AlertListener>();
  private counter = 0;

  subscribe(listener: AlertListener): () => void {
    this.listeners.add(listener);
    listener(this.currentAlert);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.currentAlert));
  }

  getCurrentAlert(): ActiveAlert | null {
    return this.currentAlert;
  }

  show(options: AlertOptions): string {
    const id = options.id || `alert-${Date.now()}-${++this.counter}`;
    const type = options.type || (options.isDestructive ? 'danger' : 'info');

    this.currentAlert = {
      ...options,
      id,
      type,
      confirmText: options.confirmText ?? (type === 'danger' ? 'Delete' : 'Confirm'),
      cancelText: options.cancelText ?? 'Cancel',
      isDestructive: options.isDestructive ?? (type === 'danger'),
    };
    this.emit();
    return id;
  }

  confirm(options: AlertConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.show({
        ...options,
        onConfirm: () => {
          this.dismiss();
          resolve(true);
        },
        onCancel: () => {
          this.dismiss();
          resolve(false);
        },
      });
    });
  }

  danger(
    title: string,
    message?: string,
    confirmText = 'Delete',
    cancelText = 'Cancel',
  ): Promise<boolean> {
    return this.confirm({
      title,
      message,
      type: 'danger',
      isDestructive: true,
      confirmText,
      cancelText,
      icon: 'Trash2',
    });
  }

  dismiss() {
    this.currentAlert = null;
    this.emit();
  }
}

export const alert = new CentralizedAlertManager();

interface AlertContextValue {
  activeAlert: ActiveAlert | null;
  show: (options: AlertOptions) => string;
  confirm: (options: AlertConfirmOptions) => Promise<boolean>;
  dismiss: () => void;
}

const AlertContext = createContext<AlertContextValue>({
  activeAlert: null,
  show: (opts) => alert.show(opts),
  confirm: (opts) => alert.confirm(opts),
  dismiss: () => alert.dismiss(),
});

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);

  useEffect(() => {
    return alert.subscribe((nextAlert) => {
      setActiveAlert(nextAlert);
    });
  }, []);

  const value = useMemo(
    () => ({
      activeAlert,
      show: (options: AlertOptions) => alert.show(options),
      confirm: (options: AlertConfirmOptions) => alert.confirm(options),
      dismiss: () => alert.dismiss(),
    }),
    [activeAlert],
  );

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  );
};

export function useAlert(): AlertContextValue {
  return useContext(AlertContext);
}

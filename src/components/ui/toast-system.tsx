'use client';

import * as React from 'react';
import { DSButton, DSToast, DSToastViewport } from '@/components/ui/primitives';

export type ToastTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastItem, 'id'> & { id?: string }) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

function newToastId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DSToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  const pushToast = React.useCallback(
    (toast: Omit<ToastItem, 'id'> & { id?: string }) => {
      const id = toast.id ?? newToastId();
      const durationMs = toast.durationMs ?? 4200;
      const item: ToastItem = {
        id,
        title: toast.title,
        description: toast.description,
        tone: toast.tone,
        durationMs,
      };

      setToasts((prev) => [...prev, item]);

      if (durationMs > 0) {
        window.setTimeout(() => {
          removeToast(id);
        }, durationMs);
      }

      return id;
    },
    [removeToast]
  );

  const value = React.useMemo(
    () => ({ pushToast, removeToast, clearToasts }),
    [pushToast, removeToast, clearToasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <DSToastViewport>
        {toasts.map((toast) => (
          <DSToast
            key={toast.id}
            title={toast.title}
            description={toast.description}
            tone={toast.tone}
            action={
              <DSButton
                type="button"
                variant="ghost"
                size="sm"
                className="pointer-events-auto px-2 py-1"
                onClick={() => removeToast(toast.id)}
              >
                Fermer
              </DSButton>
            }
          />
        ))}
      </DSToastViewport>
    </ToastContext.Provider>
  );
}

export function useDSToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useDSToast must be used within DSToastProvider');
  }
  return context;
}

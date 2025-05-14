'use client';

import * as React from 'react';

import type { ToastActionElement, ToastProps } from '@/components/ui/toast';

type ToastType = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const ToastContext = React.createContext<{
  toasts: ToastType[];
  addToast: (props: Omit<ToastType, 'id'>) => void;
  removeToast: (id: string) => void;
}>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastType[]>([]);

  const addToast = React.useCallback(
    (props: Omit<ToastType, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, ...props }]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 5000);
    },
    [setToasts],
  );

  const removeToast = React.useCallback(
    (id: string) => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    },
    [setToasts],
  );

  const contextValue = React.useMemo(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

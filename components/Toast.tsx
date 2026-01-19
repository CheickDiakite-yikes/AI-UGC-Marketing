'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastOptions = {
  message: string;
  type?: ToastType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
};

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextType {
  showToast: (message: string | ToastOptions, type?: ToastType, duration?: number) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((input: string | ToastOptions, type: ToastType = 'info', duration: number = 5000) => {
    const options = typeof input === 'string' ? { message: input, type, duration } : input;
    const toastType = options.type ?? type;
    const toastDuration = options.duration ?? duration;
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, {
      id,
      message: options.message,
      type: toastType,
      duration: toastDuration,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
    }]);
    
    if (toastDuration > 0) {
      setTimeout(() => removeToast(id), toastDuration);
    }
  }, [removeToast]);

  const showError = useCallback((message: string) => {
    showToast(message, 'error', 8000);
  }, [showToast]);

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success', 4000);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const bgColors = {
    success: 'bg-[#D0F042] border-black',
    error: 'bg-[#FF6B6B] border-black text-white',
    warning: 'bg-[#FFFD82] border-black',
    info: 'bg-[#80F0F0] border-black'
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div 
      className={`${bgColors[toast.type]} border-2 rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-slide-in flex items-start gap-3`}
      role="alert"
    >
      <span className="text-lg font-bold">{icons[toast.type]}</span>
      <p className="flex-1 font-medium text-sm">{toast.message}</p>
      {toast.actionLabel && toast.onAction && (
        <button
          onClick={() => {
            toast.onAction?.();
            onDismiss();
          }}
          className="text-xs font-bold uppercase tracking-widest border-2 border-black px-2 py-1 bg-white hover:bg-black hover:text-white transition-all"
        >
          {toast.actionLabel}
        </button>
      )}
      <button 
        onClick={onDismiss}
        className="text-lg font-bold hover:opacity-70 transition-opacity"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};

export default ToastProvider;

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CheckCircle2, X } from "lucide-react";
import styles from "./toast.module.css";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (t: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Minimal toast provider — no external deps. Use `useToast()` to push a toast.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((t: Omit<ToastItem, "id">) => {
    setItems((curr) => [...curr, { ...t, id: Date.now() + Math.random() }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((curr) => curr.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={styles.viewport} role="region" aria-label="Notifications">
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 4500);
    return () => clearTimeout(id);
  }, [onDismiss]);

  return (
    <div className={styles.toast} role="status">
      <CheckCircle2 size={18} className={styles.icon} aria-hidden />
      <div className={styles.body}>
        <div className={styles.title}>{item.title}</div>
        {item.description && (
          <div className={styles.desc}>{item.description}</div>
        )}
      </div>
      <button
        className={styles.close}
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside a <ToastProvider>");
  }
  return ctx;
}

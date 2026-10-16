"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { toastIn } from "../design/animations";

type ToastType = "success" | "warning" | "error";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fc-toast-region" aria-live="polite" aria-atomic="false">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <motion.div
              key={t.id}
              className={`fc-toast fc-toast--${t.type}`}
              variants={toastIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              <ToastIcon type={t.type} />
              <p className="fc-toast__message">{t.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être dans ToastProvider");
  return ctx;
}

function ToastIcon({ type }: { type: ToastType }) {
  const color =
    type === "success" ? "var(--fc-emerald)" :
    type === "warning" ? "var(--fc-amber)" :
    "var(--fc-coral)";

  if (type === "success") {
    return (
      <svg className="fc-toast__icon fc-toast__icon--success" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="9" stroke={color} strokeWidth="1.5"/>
        <path d="M6 10.5l3 3 5-5.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (type === "warning") {
    return (
      <svg className="fc-toast__icon fc-toast__icon--warning" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2L18.66 17H1.34L10 2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M10 8v4M10 14.5v.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }
  return (
    <svg className="fc-toast__icon fc-toast__icon--error" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke={color} strokeWidth="1.5"/>
      <path d="M7 7l6 6M13 7l-6 6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

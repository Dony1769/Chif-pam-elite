/**
 * FC CAREER — SharedUI : pile de notifications (toasts animés).
 * Lit UIContext.toasts et affiche des toasts slide-in avec auto-dismiss
 * (le dismiss est géré par UIProvider via durationMs).
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, Sparkles, X, XCircle } from "lucide-react";
import { useUIContext } from "../../context/UIContext";
import type { ToastKind } from "../../types/ui";

const ICONS: Record<ToastKind, React.ReactNode> = {
  info: <Info size={16} className="text-sky-400" />,
  success: <CheckCircle2 size={16} className="text-emerald-400" />,
  warning: <AlertTriangle size={16} className="text-amber-400" />,
  error: <XCircle size={16} className="text-rose-400" />,
  achievement: <Sparkles size={16} className="text-yellow-300" />,
};

const BORDERS: Record<ToastKind, string> = {
  info: "border-sky-500/30",
  success: "border-emerald-500/30",
  warning: "border-amber-500/30",
  error: "border-rose-500/30",
  achievement: "border-yellow-400/40",
};

export default function Notifications() {
  const { ui, dispatch } = useUIContext();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {ui.toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-slate-900/95 p-3 text-white shadow-xl backdrop-blur ${BORDERS[toast.kind]}`}
            role="status"
          >
            <span className="mt-0.5 shrink-0">{ICONS[toast.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 text-xs text-slate-400">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Fermer la notification"
              onClick={() => dispatch({ type: "DISMISS_TOAST", payload: toast.id })}
              className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:text-white"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

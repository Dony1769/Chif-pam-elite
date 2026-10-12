/**
 * FC CAREER — SharedUI : modale avec transition smooth (scale + fade).
 * Pilotable en local ou via UIContext (ModalId).
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Largeur max (défaut : md). */
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

export default function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  // Fermeture au clavier (Escape).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {/* Overlay cliquable */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${SIZES[size]} rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-white shadow-2xl`}
          >
            {title && (
              <div className="mb-4 flex items-start justify-between gap-4">
                <h3 className="text-lg font-black uppercase italic tracking-tight">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/10 p-2 text-slate-400 transition-colors hover:border-white/30 hover:text-white"
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

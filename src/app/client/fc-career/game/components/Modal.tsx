"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { backdrop, modalSheet } from "../design/animations";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  // Fermeture clavier Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Verrou scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fc-modal-backdrop"
          variants={backdrop}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
          aria-modal="true"
          role="dialog"
          aria-label={title}
        >
          <motion.div
            className="fc-modal"
            variants={modalSheet}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle mobile */}
            <div className="fc-modal__handle" aria-hidden="true" />

            {/* Header */}
            {title && (
              <div className="fc-modal__header">
                <h2 className="fc-modal__title">{title}</h2>
                <button className="fc-modal__close" onClick={onClose} aria-label="Fermer">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Body */}
            <div className="fc-modal__body">{children}</div>

            {/* Footer */}
            {footer && <div className="fc-modal__footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

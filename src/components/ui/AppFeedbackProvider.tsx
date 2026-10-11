"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, HelpCircle, Info } from "lucide-react";
import { DSButton, DSModal, DSToast } from "@/components/ui/primitives";

type ToastTone = "default" | "success" | "warning" | "danger" | "info";
type FeedbackContextValue = {
  notify: (message: string, tone?: ToastTone) => void;
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
};
type ToastItem = { id: number; message: string; tone: ToastTone };
type DialogState = { type: "confirm" | "prompt"; message: string; title: string; defaultValue?: string; resolve: (value: boolean | string | null) => void } | null;

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") return <CheckCircle2 className="text-emerald-300" size={18} />;
  if (tone === "danger") return <AlertCircle className="text-rose-300" size={18} />;
  if (tone === "warning") return <HelpCircle className="text-amber-300" size={18} />;
  return tone === "info" ? <Info className="text-cyan-300" size={18} /> : null;
}

export function AppFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [promptValue, setPromptValue] = useState("");

  const notify = useCallback((message: string, tone: ToastTone = "default") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4000);
  }, []);

  const confirm = useCallback((message: string, title = "Confirmation") => new Promise<boolean>((resolve) => {
    setDialog({ type: "confirm", message, title, resolve: (value) => resolve(Boolean(value)) });
  }), []);

  const prompt = useCallback((message: string, defaultValue = "", title = "Votre saisie") => new Promise<string | null>((resolve) => {
    setPromptValue(defaultValue);
    setDialog({ type: "prompt", message, title, defaultValue, resolve: (value) => resolve(typeof value === "string" ? value : null) });
  }), []);

  const closeDialog = useCallback((value: boolean | string | null) => {
    if (!dialog) return;
    dialog.resolve(value);
    setDialog(null);
  }, [dialog]);

  const contextValue = useMemo(() => ({ notify, confirm, prompt }), [confirm, notify, prompt]);

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog(dialog.type === "confirm" ? false : null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeDialog, dialog]);

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-80 grid w-[min(92vw,420px)] gap-2">
        {toasts.map((toast) => (
          <DSToast key={toast.id} title={toast.message} tone={toast.tone} className="pointer-events-auto" action={<ToastIcon tone={toast.tone} />} />
        ))}
      </div>
      <DSModal open={Boolean(dialog)} title={dialog?.title} description={dialog?.message} onClose={() => closeDialog(dialog?.type === "confirm" ? false : null)} footer={dialog ? <div className="flex justify-end gap-2"><DSButton type="button" variant="ghost" onClick={() => closeDialog(dialog.type === "confirm" ? false : null)}>Annuler</DSButton><DSButton type="button" onClick={() => closeDialog(dialog.type === "confirm" ? true : promptValue)}>{dialog.type === "confirm" ? "Confirmer" : "Valider"}</DSButton></div> : null}>
        {dialog?.type === "prompt" && <input autoFocus value={promptValue} onChange={(event) => setPromptValue(event.target.value)} className="w-full rounded-md border border-(--border-subtle) bg-(--surface-2) px-4 py-3 text-sm text-(--fg-1) outline-none focus:border-(--accent)" />}
      </DSModal>
    </FeedbackContext.Provider>
  );
}

export function useAppFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useAppFeedback doit être utilisé dans AppFeedbackProvider");
  return context;
}

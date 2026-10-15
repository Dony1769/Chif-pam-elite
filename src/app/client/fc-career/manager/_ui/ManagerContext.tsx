"use client";

/**
 * FC CAREER 27 — Mode Manager : état partagé de l'interface.
 * Charge la sauvegarde, applique les actions via managerStep, sauvegarde
 * après chaque changement, garde le match en direct entre deux écrans.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ManagerState } from "../../game/manager/types";
import type { ManagerAction } from "../../game/manager/reducer";
import { managerStep } from "../../game/manager/reducer";
import { loadManager, saveManager } from "../../game/manager/storage";
import type { LiveMatch } from "../../game/manager/matchSim";

export interface Toast {
  id: number;
  ok: boolean;
  text: string;
}

interface Ctx {
  state: ManagerState | null;
  ready: boolean;
  /** Raison si la sauvegarde existante est illisible (jamais écrasée automatiquement) */
  loadProblem: "corrupt" | "unavailable" | null;
  run: (action: ManagerAction) => { ok: boolean; text: string } | null;
  toasts: Toast[];
  notify: (ok: boolean, text: string) => void;
  live: LiveMatch | null;
  setLive: (m: LiveMatch | null) => void;
}

const ManagerCtx = createContext<Ctx | null>(null);

export function ManagerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ManagerState | null>(null);
  const [ready, setReady] = useState(false);
  const [loadProblem, setLoadProblem] = useState<Ctx["loadProblem"]>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [live, setLive] = useState<LiveMatch | null>(null);
  const stateRef = useRef<ManagerState | null>(null);
  const toastId = useRef(0);

  const notify = useCallback((ok: boolean, text: string) => {
    const id = ++toastId.current;
    setToasts(t => [...t.slice(-2), { id, ok, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ok ? 3800 : 5500);
  }, []);

  useEffect(() => {
    const r = loadManager();
    if (r.ok) {
      const loaded = managerStep(null, { type: "LOAD", state: r.state }).state;
      stateRef.current = loaded;
      setState(loaded);
    } else if (r.reason !== "empty") {
      setLoadProblem(r.reason);
    }
    setReady(true);
  }, []);

  const run = useCallback((action: ManagerAction) => {
    const step = managerStep(stateRef.current, action);
    if (step.state && step.state !== stateRef.current) {
      stateRef.current = step.state;
      setState(step.state);
      if (!saveManager(step.state)) notify(false, "Sauvegarde impossible (stockage plein). Votre dernière sauvegarde reste intacte.");
    }
    if (step.message) notify(step.message.ok, step.message.text);
    return step.message;
  }, [notify]);

  const value = useMemo<Ctx>(() => ({ state, ready, loadProblem, run, toasts, notify, live, setLive }),
    [state, ready, loadProblem, run, toasts, notify, live]);

  return <ManagerCtx.Provider value={value}>{children}</ManagerCtx.Provider>;
}

export function useManager(): Ctx {
  const c = useContext(ManagerCtx);
  if (!c) throw new Error("useManager hors de ManagerProvider");
  return c;
}

/** Variante pour les écrans qui exigent une partie chargée. */
export function useGame(): Omit<Ctx, "state"> & { state: ManagerState } {
  const c = useManager();
  if (!c.state) throw new Error("Aucune partie chargée");
  return c as Omit<Ctx, "state"> & { state: ManagerState };
}

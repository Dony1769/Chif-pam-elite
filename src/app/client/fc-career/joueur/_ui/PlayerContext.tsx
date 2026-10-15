"use client";

/** FC CAREER 27 — Carrière Joueur v2 : état partagé de l'interface (chargement, actions, sauvegarde). */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PlayerCareerState } from "../../game/player2/types";
import type { PlayerAction } from "../../game/player2/reducer";
import { playerStep } from "../../game/player2/reducer";
import { loadPlayerCareer, savePlayerCareer } from "../../game/player2/storage";
import type { PlayerLive } from "../../game/player2/live";

interface Toast { id: number; ok: boolean; text: string }

interface Ctx {
  state: PlayerCareerState | null;
  ready: boolean;
  loadProblem: "corrupt" | "unavailable" | null;
  run: (action: PlayerAction) => { ok: boolean; text: string } | null;
  toasts: Toast[];
  notify: (ok: boolean, text: string) => void;
  live: PlayerLive | null;
  setLive: (m: PlayerLive | null) => void;
}

const PlayerCtx = createContext<Ctx | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlayerCareerState | null>(null);
  const [ready, setReady] = useState(false);
  const [loadProblem, setLoadProblem] = useState<Ctx["loadProblem"]>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [live, setLive] = useState<PlayerLive | null>(null);
  const ref = useRef<PlayerCareerState | null>(null);
  const tid = useRef(0);

  const notify = useCallback((ok: boolean, text: string) => {
    const id = ++tid.current;
    setToasts(t => [...t.slice(-2), { id, ok, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ok ? 3800 : 5500);
  }, []);

  useEffect(() => {
    const r = loadPlayerCareer();
    if (r.ok) {
      const loaded = playerStep(null, { type: "LOAD", state: r.state }).state;
      ref.current = loaded;
      setState(loaded);
    } else if (r.reason !== "empty") setLoadProblem(r.reason);
    setReady(true);
  }, []);

  const run = useCallback((action: PlayerAction) => {
    const step = playerStep(ref.current, action);
    if (step.state && step.state !== ref.current) {
      ref.current = step.state;
      setState(step.state);
      if (!savePlayerCareer(step.state)) notify(false, "Sauvegarde impossible (stockage plein). Votre dernière sauvegarde reste intacte.");
    }
    if (step.message) notify(step.message.ok, step.message.text);
    return step.message;
  }, [notify]);

  const value = useMemo<Ctx>(() => ({ state, ready, loadProblem, run, toasts, notify, live, setLive }),
    [state, ready, loadProblem, run, toasts, notify, live]);
  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}

export function usePlayer(): Ctx {
  const c = useContext(PlayerCtx);
  if (!c) throw new Error("usePlayer hors de PlayerProvider");
  return c;
}

export function usePlayerGame(): Omit<Ctx, "state"> & { state: PlayerCareerState } {
  const c = usePlayer();
  if (!c.state) throw new Error("Aucune carrière chargée");
  return c as Omit<Ctx, "state"> & { state: PlayerCareerState };
}

"use client";

/** FC CAREER 27 — Carrière Joueur v2 : état partagé de l'interface (chargement, actions, sauvegarde). */

import { hydrateGameStore, onWriteError } from "../../game/persistence/gameStore";
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
  /** Une semaine est en train d'être calculée */
  busy: boolean;
}

/** Actions lourdes (le monde entier joue) : calculées en arrière-plan. */
const HEAVY = new Set<PlayerAction["type"]>(["PLAY_WEEK", "SKIP_CUP", "PLAY_CUP"]);

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
    let alive = true;
    const off = onWriteError(() => notify(false, "Sauvegarde impossible (stockage plein). Votre dernière sauvegarde reste intacte."));
    hydrateGameStore().then(info => {
      if (!alive) return;
      if (info.purgedNow) notify(true, "Toutes les anciennes sauvegardes ont été effacées : nouveau départ.");
      const r = loadPlayerCareer();
      if (r.ok) {
        const loaded = playerStep(null, { type: "LOAD", state: r.state }).state;
        ref.current = loaded;
        setState(loaded);
      } else if (r.reason !== "empty") setLoadProblem(r.reason);
      setReady(true);
    });
    return () => { alive = false; off(); };
  }, [notify]);

  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const worker = useRef<Worker | null | undefined>(undefined);
  const reqId = useRef(0);

  const commit = useCallback((step: ReturnType<typeof playerStep>) => {
    if (step.state && step.state !== ref.current) {
      ref.current = step.state;
      setState(step.state);
      if (!savePlayerCareer(step.state)) notify(false, "Sauvegarde impossible (stockage plein). Votre dernière sauvegarde reste intacte.");
    }
    if (step.message) notify(step.message.ok, step.message.text);
  }, [notify]);

  const getWorker = useCallback((): Worker | null => {
    if (worker.current !== undefined) return worker.current;
    try { worker.current = typeof Worker !== "undefined" ? new Worker(new URL("./weekWorker.ts", import.meta.url)) : null; } catch { worker.current = null; }
    return worker.current;
  }, []);
  useEffect(() => () => { worker.current?.terminate(); }, []);

  const run = useCallback((action: PlayerAction) => {
    if (busyRef.current) return null; // une semaine à la fois
    const w = HEAVY.has(action.type) && ref.current ? getWorker() : null;
    if (w && ref.current) {
      const id = ++reqId.current;
      const from = ref.current;
      busyRef.current = true; setBusy(true);
      const done = (step: ReturnType<typeof playerStep> | null) => {
        busyRef.current = false; setBusy(false);
        // Le calcul en arrière-plan a échoué : on le refait ici, rien n'est perdu
        commit(step ?? playerStep(from, action));
      };
      const onMsg = (e: MessageEvent<{ id: number; ok: boolean; step?: ReturnType<typeof playerStep> }>) => {
        if (e.data.id !== id) return;
        w.removeEventListener("message", onMsg); w.removeEventListener("error", onErr);
        done(e.data.ok && e.data.step ? e.data.step : null);
      };
      const onErr = () => { w.removeEventListener("message", onMsg); w.removeEventListener("error", onErr); worker.current = null; w.terminate(); done(null); };
      w.addEventListener("message", onMsg); w.addEventListener("error", onErr);
      w.postMessage({ id, state: from, action });
      return null;
    }
    const step = playerStep(ref.current, action);
    commit(step);
    return step.message;
  }, [commit, getWorker]);

  const value = useMemo<Ctx>(() => ({ state, ready, loadProblem, run, toasts, notify, live, setLive, busy }),
    [state, ready, loadProblem, run, toasts, notify, live, busy]);
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

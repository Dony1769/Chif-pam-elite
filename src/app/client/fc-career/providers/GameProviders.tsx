/**
 * FC CAREER — Providers globaux (Game + Player + UI).
 *
 * Enveloppe l'application FC Career :
 * - GameProvider : état global (save versionnée, joueur, wallet, dernier match)
 *                  avec hydratation localStorage + auto-sauvegarde débouncée.
 * - UIProvider   : toasts (auto-dismiss), modales, transitions, réglages motion.
 * - PlayerContext : valeur dérivée { player, club } recalculée à chaque changement
 *                   de joueur (buildPlayerContext résout le club du contrat).
 *
 * Consommation dans les composants :
 *   useGameContext(), usePlayerContext(), useUIContext()
 */

"use client";

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import {
  GameContext,
  gameReducer,
  initialGameState,
  useGameContext,
} from "../context/GameContext";
import { PlayerContext, buildPlayerContext } from "../context/PlayerContext";
import {
  UIContext,
  uiReducer,
  initialUIState,
  type UIContextValue,
} from "../context/UIContext";
import { loadGame, saveGame } from "../utils/storage";
import type { Toast } from "../types/ui";

/* ------------------------------------------------------------------ */
/* Provider : état global du jeu                                       */
/* ------------------------------------------------------------------ */

function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const hydratedRef = useRef(false);

  // Hydratation depuis le localStorage (client uniquement).
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const save = loadGame();
    const meta = save?.meta ?? null;
    dispatch({
      type: "HYDRATE",
      payload: {
        ...initialGameState,
        hydrated: true,
        locked: false, // le PIN est déjà géré par FcCareerGuard
        meta,
        player: save?.player ?? null,
        wallet: save?.wallet ?? null,
        season: meta?.season ?? null,
      },
    });
  }, []);

  // Auto-sauvegarde débouncée (400 ms) à chaque changement persistable.
  useEffect(() => {
    if (!state.hydrated || !state.meta) return;
    const t = window.setTimeout(() => {
      saveGame({ meta: state.meta!, player: state.player, wallet: state.wallet });
    }, 400);
    return () => window.clearTimeout(t);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Provider : contexte joueur (dérivé de GameProvider)                 */
/* ------------------------------------------------------------------ */

function PlayerBridge({ children }: { children: ReactNode }) {
  const { state } = useGameContext();
  const value = useMemo(() => buildPlayerContext(state.player), [state.player]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Provider : UI (toasts, modales, motion)                             */
/* ------------------------------------------------------------------ */

function UIProvider({ children }: { children: ReactNode }) {
  const [ui, dispatch] = useReducer(uiReducer, initialUIState);

  // Auto-dismiss des toasts (durationMs par toast, défaut 5 s).
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const existing = new Set(ui.toasts.map((t) => t.id));
    // Nettoie les timers des toasts disparus.
    for (const [id, timer] of timersRef.current.entries()) {
      if (!existing.has(id)) {
        window.clearTimeout(timer);
        timersRef.current.delete(id);
      }
    }
    // Programme la fermeture des nouveaux toasts.
    for (const toast of ui.toasts) {
      if (!timersRef.current.has(toast.id)) {
        const timer = window.setTimeout(() => {
          dispatch({ type: "DISMISS_TOAST", payload: toast.id });
          timersRef.current.delete(toast.id);
        }, toast.durationMs ?? 5000);
        timersRef.current.set(toast.id, timer);
      }
    }
  }, [ui.toasts]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
    };
  }, []);

  const value = useMemo<UIContextValue>(
    () => ({
      ui,
      dispatch,
      notify: (toast) => {
        const id =
          toast.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        dispatch({
          type: "PUSH_TOAST",
          payload: {
            ...toast,
            id,
            durationMs: toast.durationMs ?? 5000,
          } as Toast,
        });
      },
    }),
    [ui],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Export principal                                                    */
/* ------------------------------------------------------------------ */

export default function GameProviders({ children }: { children: ReactNode }) {
  return (
    <GameProvider>
      <UIProvider>
        <PlayerBridge>{children}</PlayerBridge>
      </UIProvider>
    </GameProvider>
  );
}

// Ré-export pratique pour les composants enfants.
export { useGameContext } from "../context/GameContext";
export { usePlayerContext } from "../context/PlayerContext";
export { useUIContext } from "../context/UIContext";

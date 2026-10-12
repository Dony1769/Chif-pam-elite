/**
 * FC CAREER — UIContext : état UI (toasts, modales, transitions, thème).
 */

"use client";

import { createContext, useContext } from "react";
import type { UIState, Toast, ModalId, RouteView, MotionContextValue } from "../types/ui";

export type UIAction =
  | { type: "SET_ROUTE"; payload: RouteView }
  | { type: "OPEN_MODAL"; payload: Exclude<ModalId, null> }
  | { type: "CLOSE_MODAL" }
  | { type: "PUSH_TOAST"; payload: Toast }
  | { type: "DISMISS_TOAST"; payload: string } // toast id
  | { type: "SET_TRANSITIONING"; payload: boolean }
  | { type: "TOGGLE_THEME" }
  | { type: "SET_MOTION"; payload: Partial<MotionContextValue> };

export const initialUIState: UIState = {
  route: "dashboard",
  activeModal: null,
  toasts: [],
  isTransitioning: false,
  theme: "dark",
  motion: { enabled: true, speedMultiplier: 1, staggerDelayMs: 40 },
};

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SET_ROUTE":
      return { ...state, route: action.payload, activeModal: null };
    case "OPEN_MODAL":
      return { ...state, activeModal: action.payload };
    case "CLOSE_MODAL":
      return { ...state, activeModal: null };
    case "PUSH_TOAST":
      // Un seul toast max par id (remplace l'ancien si même identifiant).
      return {
        ...state,
        toasts: [...state.toasts.filter((t) => t.id !== action.payload.id), action.payload].slice(-5),
      };
    case "DISMISS_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };
    case "SET_TRANSITIONING":
      return { ...state, isTransitioning: action.payload };
    case "TOGGLE_THEME":
      return { ...state, theme: state.theme === "dark" ? "light" : "dark" };
    case "SET_MOTION":
      return { ...state, motion: { ...state.motion, ...action.payload } };
    default:
      return state;
  }
}

export interface UIContextValue {
  ui: UIState;
  dispatch: React.Dispatch<UIAction>;
  /** Helper pratique : empile un toast auto-dismiss. */
  notify: (toast: Omit<Toast, "id" | "durationMs"> & { id?: string; durationMs?: number }) => void;
}

export const UIContext = createContext<UIContextValue | null>(null);

export function useUIContext(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUIContext doit être utilisé dans <UIProvider>");
  return ctx;
}

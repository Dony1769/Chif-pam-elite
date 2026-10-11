/**
 * FC CAREER — États UI, animations, transitions (motion design)
 */

export type ToastKind = "info" | "success" | "warning" | "error" | "achievement";

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  durationMs: number;
}

export type ModalId =
  | "player-creation"
  | "contract-details"
  | "transfer-incoming"
  | "lineup-editor"
  | "settings"
  | null;

export type RouteView =
  | "dashboard"
  | "season"
  | "match"
  | "training"
  | "club"
  | "profile"
  | "onboarding";

/** Contexte global de motion design (prefers-reduced-motion, vitesse...). */
export interface MotionContextValue {
  enabled: boolean; // false si reduced motion
  speedMultiplier: number; // 0.5 = x2 rapide, 2 = slow-mo
  staggerDelayMs: number; // délai entre éléments d'une liste
}

export interface UIState {
  route: RouteView;
  activeModal: ModalId;
  toasts: Toast[];
  isTransitioning: boolean;
  theme: "light" | "dark";
  motion: MotionContextValue;
}

/** Transitions standard utilisées par les composants partagés. */
export const UI_TRANSITIONS = {
  pageEnter: { durationMs: 320, easing: "ease-out" },
  modalOpen: { durationMs: 240, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  statPop: { durationMs: 600, easing: "ease-spring" },
  listStagger: { perItemMs: 40 },
} as const;

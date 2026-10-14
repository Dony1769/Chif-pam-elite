/**
 * FC CAREER — Design System : Variants Framer Motion
 * Importer uniquement dans des composants "use client".
 */

import type { Variants } from "framer-motion";

/* ── Fade + slide vertical (entrée de page) ─────────────────────
   Usage : <motion.div variants={pageFade} initial="hidden" animate="visible">
*/
export const pageFade: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

/* ── Conteneur staggeré ────────────────────────────────────────
   Wrapper qui fait entrer ses enfants un par un.
   Enfants : utiliser itemFade.
*/
export const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

export const itemFade: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ── Modal bottom-sheet (mobile) ───────────────────────────────
   La modale arrive du bas sur mobile, fade + scale sur desktop.
*/
export const modalSheet: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
};

export const modalDesktop: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

export const backdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
};

/* ── Sidebar mobile ─────────────────────────────────────────────
   Slide depuis la gauche.
*/
export const sidebarSlide: Variants = {
  hidden: { x: "-100%" },
  visible: {
    x: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    x: "-100%",
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
};

/* ── Toast ──────────────────────────────────────────────────────
   Remonte depuis le bas.
*/
export const toastIn: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: 16,
    scale: 0.96,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

/* ── StatBar fill (largeur animée) ────────────────────────────── */
export const barFill = (pct: number) => ({
  initial: { width: 0 },
  animate: {
    width: `${pct}%`,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 },
  },
});

/* ── Pulse vert (gain de PA) ────────────────────────────────────
   Appliqué ponctuellement sur un élément via `animate`.
*/
export const emeraldPulse = {
  animate: {
    boxShadow: [
      "0 0 0px rgba(55,217,154,0)",
      "0 0 20px rgba(55,217,154,0.4)",
      "0 0 0px rgba(55,217,154,0)",
    ],
    transition: { duration: 0.9, ease: "easeInOut" },
  },
};

/* ── Tap scale (bouton) ─────────────────────────────────────────
   whileTap sur un bouton pour retour haptique visuel.
*/
export const tapScale = {
  whileTap: { scale: 0.96, transition: { duration: 0.1 } },
};

/* ── Nombre incrémental (compteur) ─────────────────────────────
   Simple fade-in quand la valeur change.
*/
export const numberChange: Variants = {
  hidden:  { opacity: 0, y: -6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  exit:    { opacity: 0, y: 6, transition: { duration: 0.15 } },
};

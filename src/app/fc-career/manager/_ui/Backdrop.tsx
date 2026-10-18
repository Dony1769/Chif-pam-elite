"use client";

/**
 * Fond du jeu : uni et léger (le décor 3D a été retiré pour la fluidité).
 * Garde seulement l'onde au clic sur les boutons.
 */

import { useEffect } from "react";

export function Backdrop({ club }: { club?: string }) {
  void club;
  useEffect(() => {
    const press = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".mg-btn, .pc-option, .mg-seg button");
      if (!el || (el as HTMLButtonElement).disabled) return;
      const r = el.getBoundingClientRect();
      const dot = document.createElement("span");
      dot.className = "mg-ripple";
      const size = Math.max(r.width, r.height) * 2.2;
      dot.style.width = dot.style.height = `${size}px`;
      dot.style.left = `${e.clientX - r.left - size / 2}px`;
      dot.style.top = `${e.clientY - r.top - size / 2}px`;
      el.appendChild(dot);
      window.setTimeout(() => dot.remove(), 650);
    };
    document.addEventListener("pointerdown", press, { passive: true });
    return () => document.removeEventListener("pointerdown", press);
  }, []);
  return null;
}

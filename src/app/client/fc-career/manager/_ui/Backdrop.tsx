"use client";

/**
 * Décor 3D chargé à la demande (Three.js n'alourdit pas le premier affichage)
 * + effets de clic : onde lumineuse à l'endroit du clic et inclinaison 3D des
 * éléments marqués data-tilt.
 */

import React, { useEffect } from "react";
import dynamic from "next/dynamic";

const Stage3D = dynamic(() => import("./Stage3D"), { ssr: false, loading: () => null });

function canWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

export function Backdrop({ club }: { club?: string }) {
  const [ok, setOk] = React.useState(false);
  useEffect(() => { setOk(canWebGL()); }, []);

  useEffect(() => {
    const press = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".mg-btn, .mg-tab, .pc-option, .mg-seg button, .mg-gamebar a, .mg-gamebar button, .mg-nav a, .mg-nav button");
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
    const tilt = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-tilt]");
      document.querySelectorAll<HTMLElement>("[data-tilt].is-tilting").forEach(x => { if (x !== el) { x.classList.remove("is-tilting"); x.style.removeProperty("--rx"); x.style.removeProperty("--ry"); } });
      if (!el || e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.classList.add("is-tilting");
      el.style.setProperty("--rx", `${(0.5 - py) * 14}deg`);
      el.style.setProperty("--ry", `${(px - 0.5) * 18}deg`);
      el.style.setProperty("--mx", `${px * 100}%`);
      el.style.setProperty("--my", `${py * 100}%`);
    };
    document.addEventListener("pointerdown", press, { passive: true });
    document.addEventListener("pointermove", tilt, { passive: true });
    return () => { document.removeEventListener("pointerdown", press); document.removeEventListener("pointermove", tilt); };
  }, []);

  return ok ? <Stage3D club={club} /> : <div className="mg-stage mg-stage--flat" aria-hidden="true" />;
}

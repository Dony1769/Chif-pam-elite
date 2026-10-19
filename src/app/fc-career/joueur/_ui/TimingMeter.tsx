"use client";

/**
 * FC CAREER 27 — Le geste : une jauge de timing après le choix de l'action.
 * Arrête le curseur dans la zone verte (Espace, Entrée ou un tap) pour
 * soigner l'exécution. La zone est plus large quand ton attribut est élevé.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

export type Grade = "perfect" | "good" | "ok" | "miss";
export const GRADE_BONUS: Record<Grade, number> = { perfect: 0.12, good: 0.05, ok: 0, miss: -0.08 };
const GRADE_LABEL: Record<Grade, string> = { perfect: "Parfait !", good: "Bien", ok: "Correct", miss: "Raté" };

export function TimingMeter({ label, level, onDone }: { label: string; level: number; onDone: (bonus: number, grade: Grade) => void }) {
  // Zone verte : 10 % de large à 50, 22 % à 99
  const zone = Math.max(0.08, Math.min(0.24, 0.1 + (level - 50) * 0.0024));
  const center = 0.62;
  const [pos, setPos] = useState(0);
  const [grade, setGrade] = useState<Grade | null>(null);
  const start = useRef<number | null>(null);
  const raf = useRef(0);
  const posRef = useRef(0);

  const stop = useCallback(() => {
    if (grade) return;
    cancelAnimationFrame(raf.current);
    const d = Math.abs(posRef.current - center);
    const g: Grade = d <= zone * 0.18 ? "perfect" : d <= zone / 2 ? "good" : d <= zone ? "ok" : "miss";
    setGrade(g);
    setTimeout(() => onDone(GRADE_BONUS[g], g), 650);
  }, [grade, zone, onDone]);

  useEffect(() => {
    const tick = (t: number) => {
      if (start.current === null) start.current = t;
      const el = (t - start.current) / 1000;
      // Aller-retour en 1,1 s ; au bout de 3,3 s le geste part tout seul
      const ph = (el / 1.1) % 2;
      const p = ph < 1 ? ph : 2 - ph;
      posRef.current = p; setPos(p);
      if (el > 3.3) { stop(); return; }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [stop]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); stop(); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [stop]);

  return (
    <div className="pc-timing" role="dialog" aria-label="Exécution du geste">
      <div className="pc-moment__head"><b>{label}</b><span className="mg-small">Arrête le curseur dans la zone verte</span></div>
      <button type="button" className="pc-timing__bar" onClick={stop} aria-label="Frapper maintenant">
        <i className="pc-timing__zone" style={{ left: `${(center - zone) * 100}%`, width: `${zone * 200}%` }} />
        <i className="pc-timing__sweet" style={{ left: `${(center - zone * 0.18) * 100}%`, width: `${zone * 36}%` }} />
        <i className="pc-timing__cursor" style={{ left: `${pos * 100}%` }} />
      </button>
      <p className={`pc-timing__grade${grade ? ` is-${grade}` : ""}`} aria-live="assertive">{grade ? `${GRADE_LABEL[grade]} ${GRADE_BONUS[grade] > 0 ? `+${Math.round(GRADE_BONUS[grade] * 100)} %` : GRADE_BONUS[grade] < 0 ? `${Math.round(GRADE_BONUS[grade] * 100)} %` : ""}` : "Espace, Entrée ou tape sur la jauge"}</p>
    </div>
  );
}

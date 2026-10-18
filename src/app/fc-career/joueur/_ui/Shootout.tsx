"use client";

/** FC CAREER 27 — Séance de tirs au but rejouée tir par tir après un nul en élimination directe. */

import React, { useEffect, useState } from "react";
import type { ShootoutKick } from "../../game/player2/cup";
import { goalRoar, save, whistle } from "./sound";

export function Shootout({ kicks, mineName, theirName }: { kicks: ShootoutKick[]; mineName: string; theirName: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= kicks.length) return;
    const t = setTimeout(() => {
      const k = kicks[n];
      if (k.scored) goalRoar(k.mine); else save();
      if (n + 1 === kicks.length) setTimeout(() => whistle("end"), 700);
      setN(n + 1);
    }, n === 0 ? 900 : 1500);
    return () => clearTimeout(t);
  }, [n, kicks]);
  const shown = kicks.slice(0, n);
  const score = (mine: boolean) => shown.filter(k => k.mine === mine && k.scored).length;
  const row = (mine: boolean) => kicks.filter(k => k.mine === mine).map((k, i) => {
    const idx = kicks.indexOf(k);
    const st = idx < n ? (k.scored ? "is-in" : "is-out") : idx === n ? "is-next" : "";
    return <span key={i} className={`pc-pen ${st}${k.you ? " is-you" : ""}`} title={k.you ? "Votre tir" : undefined}>{idx < n ? (k.scored ? "●" : "✕") : "○"}</span>;
  });
  const last = shown[shown.length - 1];
  const done = n >= kicks.length;
  const mineWon = score(true) > score(false);
  return (
    <div className="pc-shootout" aria-live="polite">
      <div className="pc-shootout__head"><b>Tirs au but</b><span className="pc-shootout__score">{score(true)} - {score(false)}</span></div>
      <div className="pc-shootout__row"><span>{mineName}</span><div>{row(true)}</div></div>
      <div className="pc-shootout__row"><span>{theirName}</span><div>{row(false)}</div></div>
      <p className="mg-small" style={{ margin: 0 }}>
        {done ? (mineWon ? `Qualifiés aux tirs au but, ${score(true)}-${score(false)} !` : `Éliminés aux tirs au but, ${score(true)}-${score(false)}.`)
          : last ? `${last.mine ? (last.you ? "Vous" : mineName) : theirName} : ${last.scored ? "transformé" : "manqué"}${n >= 10 ? " · mort subite" : ""}`
          : "Les tireurs se dirigent vers le point de penalty…"}
      </p>
      {!done && <button type="button" className="mg-btn mg-btn--ghost" onClick={() => setN(kicks.length)}>Voir le résultat</button>}
    </div>
  );
}

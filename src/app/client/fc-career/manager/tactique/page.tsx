"use client";

/** FC CAREER 27 — Mode Manager : tactique (terrain, formation, consignes, remplaçants). */

import React, { useState } from "react";
import { useGame } from "../_ui/ManagerContext";
import { Ovr, Pos, Section, playerName } from "../_ui/kit";
import {
  FORMATIONS, FORMATION_IDS, MENTALITY_LABEL, STYLE_LABEL, computeTeamRatings, positionFit,
} from "../../game/manager/tactics";
import { getSquad, lineupIssues } from "../../game/manager/engine";
import type { Mentality, PlayStyle } from "../../game/manager/types";
import { POS_FR } from "../_ui/kit";

const MENTALITIES: Mentality[] = ["very_defensive", "defensive", "balanced", "attacking", "very_attacking"];
const STYLES: PlayStyle[] = ["balanced", "possession", "counter", "direct", "pressing"];
const STYLE_HINT: Record<PlayStyle, string> = {
  balanced: "Aucun excès, aucun point faible particulier.",
  possession: "Garde le ballon, occasions plus nettes. Souffre face au contre.",
  counter: "Cède le ballon, frappe en transition. Punit le pressing haut.",
  direct: "Beaucoup d'occasions, moins nettes. Passe au-dessus du pressing.",
  pressing: "Étouffe l'adversaire mais fatigue beaucoup les joueurs.",
};

export default function TacticsPage() {
  const { state, run } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const squad = getSquad(state);
  const byId = new Map(squad.map(p => [p.id, p]));
  const slots = FORMATIONS[state.tactic.formation];
  const starters = state.lineup.starters.map(id => byId.get(id) ?? null);
  const bench = state.lineup.bench.map(id => byId.get(id)).filter(Boolean) as typeof squad;
  const others = squad.filter(p => !state.lineup.starters.includes(p.id) && !state.lineup.bench.includes(p.id));
  const ratings = computeTeamRatings(starters, state.tactic.formation);
  const issues = lineupIssues(state);

  /** Premier clic : sélection ; second clic : échange des deux joueurs. */
  function tap(id: string) {
    if (!selected) { setSelected(id); return; }
    if (selected !== id) run({ type: "SWAP_PLAYERS", a: selected, b: id });
    setSelected(null);
  }

  const unavailable = (id: string) => {
    const p = byId.get(id);
    return !!p && ((p.injury?.weeksRemaining ?? 0) > 0 || (state.suspensions[id] ?? 0) > 0);
  };

  return (
    <div className="mg-grid">
      <div className="mg-col-6 mg-stack">
        <div className="mg-pagehead">
          <div>
            <h1>Tactique</h1>
            <p>{selected ? "Touchez un second joueur pour l'échanger." : "Touchez deux joueurs (terrain ou banc) pour les échanger."}</p>
          </div>
          <button type="button" className="mg-btn" onClick={() => { setSelected(null); run({ type: "AUTO_LINEUP" }); }}>Compo auto</button>
        </div>
        <div className="mg-pitch" aria-label={`Terrain, formation ${state.tactic.formation}`}>
          <svg className="mg-pitch__lines" viewBox="0 0 68 92" preserveAspectRatio="none" aria-hidden>
            <g fill="none" stroke="rgba(255,255,255,.45)" strokeWidth=".4">
              <line x1="0" y1="46" x2="68" y2="46" /><circle cx="34" cy="46" r="7" />
              <rect x="14" y="0" width="40" height="14" /><rect x="24" y="0" width="20" height="5" />
              <rect x="14" y="78" width="40" height="14" /><rect x="24" y="87" width="20" height="5" />
            </g>
          </svg>
          {slots.map((slot, i) => {
            const p = starters[i];
            const fit = p ? positionFit(p.position, slot.pos) : 0;
            const cls = ["mg-slot", p ? "" : "is-empty", p && selected === p.id ? "is-selected" : "", fit < 0.75 && p ? "is-bad" : fit < 1 && p ? "is-misfit" : ""].filter(Boolean).join(" ");
            return (
              <button key={i} type="button" className={cls} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                onClick={() => p && tap(p.id)} aria-label={p ? `${POS_FR[slot.pos]} : ${playerName(p)}, note ${p.overall}` : `${POS_FR[slot.pos]} vide`}>
                <span className="mg-slot__disc">{p?.overall ?? "–"}</span>
                <span className="mg-slot__name">{p ? `${p.lastName}${state.lineup.captainId === p.id ? " (C)" : ""}` : "Vide"}</span>
                <span className="mg-slot__pos">{POS_FR[slot.pos]}{p && fit < 1 ? ` · ${POS_FR[p.position]}` : ""}</span>
              </button>
            );
          })}
        </div>
        {issues.length > 0 && <p className="mg-warn">{issues.map(i => i.message).join(" ")}</p>}
      </div>

      <div className="mg-col-6 mg-stack">
        <Section title="Formation">
          <div className="mg-seg" role="group" aria-label="Formation">
            {FORMATION_IDS.map(f => (
              <button key={f} type="button" aria-pressed={state.tactic.formation === f} onClick={() => run({ type: "SET_TACTIC", tactic: { ...state.tactic, formation: f } })}>{f}</button>
            ))}
          </div>
        </Section>
        <Section title="Mentalité">
          <div className="mg-seg" role="group" aria-label="Mentalité">
            {MENTALITIES.map(v => (
              <button key={v} type="button" aria-pressed={state.tactic.mentality === v} onClick={() => run({ type: "SET_TACTIC", tactic: { ...state.tactic, mentality: v } })}>{MENTALITY_LABEL[v]}</button>
            ))}
          </div>
        </Section>
        <Section title="Style de jeu">
          <div className="mg-seg" role="group" aria-label="Style de jeu">
            {STYLES.map(v => (
              <button key={v} type="button" aria-pressed={state.tactic.style === v} onClick={() => run({ type: "SET_TACTIC", tactic: { ...state.tactic, style: v } })}>{STYLE_LABEL[v]}</button>
            ))}
          </div>
          <p className="mg-small" style={{ marginTop: 8 }}>{STYLE_HINT[state.tactic.style]}</p>
        </Section>
        <Section title="Force de l'équipe">
          <div className="mg-kpis">
            <div className="mg-kpi"><span>Attaque</span><b>{Math.round(ratings.attack)}</b></div>
            <div className="mg-kpi"><span>Milieu</span><b>{Math.round(ratings.midfield)}</b></div>
            <div className="mg-kpi"><span>Défense</span><b>{Math.round(ratings.defense)}</b></div>
            <div className="mg-kpi"><span>Gardien</span><b>{Math.round(ratings.goalkeeping)}</b></div>
          </div>
        </Section>
        <Section title={`Remplaçants (${bench.length})`}>
          <BenchList players={bench} selected={selected} onTap={tap} unavailable={unavailable} />
        </Section>
        {others.length > 0 && (
          <Section title={`Tribune (${others.length})`}>
            <BenchList players={others} selected={selected} onTap={tap} unavailable={unavailable} />
          </Section>
        )}
      </div>
    </div>
  );
}

function BenchList({ players, selected, onTap, unavailable }: {
  players: ReturnType<typeof getSquad>; selected: string | null; onTap: (id: string) => void; unavailable: (id: string) => boolean;
}) {
  return (
    <table className="mg-table">
      <tbody>
        {players.map(p => (
          <tr key={p.id} className={`is-click${selected === p.id ? " is-selected" : ""}`} onClick={() => onTap(p.id)} tabIndex={0}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap(p.id); } }}>
            <td><Pos pos={p.position} /></td>
            <td><b>{playerName(p)}</b> {unavailable(p.id) && <span className="mg-tag mg-tag--red">Indisponible</span>}</td>
            <td className="num"><Ovr value={p.overall} small /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

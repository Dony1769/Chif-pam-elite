"use client";

/** FC CAREER 27 — Carrière Joueur v2 : progression et entraînement. */

import React from "react";
import { usePlayerGame } from "../_ui/PlayerContext";
import { PlayerCard } from "../_ui/PlayerCard";
import { Empty, Section } from "../../manager/_ui/kit";
import { ATTR_KEYS, attrLabel, keyAttrs, overallOf } from "../../game/player2/attributes";
import { avgRating, me, myClub, xpNeeded } from "../../game/player2/engine";

export default function ProgressionPage() {
  const { state, run } = usePlayerGame();
  const p = me(state);
  const pos = state.profile.position;
  const key = keyAttrs(pos);
  const focus = state.profile.trainingFocus;
  const ovr = overallOf(state.profile.attrs, pos);
  const clubName = (id: string) => state.shadow.world.clubs.find(c => c.id === id)?.shortName ?? "?";

  return (
    <div className="mg-grid">
      <div className="mg-col-4 mg-stack">
        <Section>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PlayerCard name={`${state.profile.firstName.charAt(0)}. ${state.profile.lastName}`} overall={p.overall} position={pos}
              attrs={state.profile.attrs} club={myClub(state)} potential={state.profile.potential} />
          </div>
          <dl className="mg-dl" style={{ marginTop: 14 }}>
            <dt>Note globale</dt><dd>{ovr}</dd>
            <dt>Potentiel</dt><dd>{state.profile.potential}</dd>
            <dt>Marge de progression</dt><dd>{Math.max(0, state.profile.potential - ovr)}</dd>
            <dt>Âge</dt><dd>{p.age} ans</dd>
            <dt>Forme · moral</dt><dd>{p.form} · {p.morale}</dd>
          </dl>
        </Section>
      </div>

      <div className="mg-col-8 mg-stack">
        <Section title="Entraînement" aside={<span className="mg-small">Choisissez la caractéristique travaillée cette semaine</span>}>
          <p className="mg-small" style={{ marginTop: 0 }}>
            La caractéristique travaillée reçoit toute l&apos;expérience de la semaine, les autres un quart. Jouer, et bien jouer, accélère tout.
            Pour votre poste, les plus importantes sont : {key.slice(0, 3).map(k => attrLabel(k, pos)).join(", ")}.
          </p>
          {ATTR_KEYS.map(k => {
            const v = state.profile.attrs[k];
            const xp = state.profile.xp[k];
            const need = xpNeeded(v);
            return (
              <div key={k} className={`pc-attr${focus === k ? " is-focus" : ""}`}>
                <span>
                  {attrLabel(k, pos)}
                  {key.includes(k) && <span className="mg-tag mg-tag--gold" style={{ marginLeft: 6 }}>Clé</span>}
                </span>
                <b>{v}</b>
                <div className="mg-row" style={{ flexWrap: "nowrap" }}>
                  <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <span className="pc-attr__bar" aria-hidden><i style={{ width: `${v}%` }} /></span>
                    <span className="mg-small">Prochain point : {Math.min(99, Math.floor((xp / need) * 100))} %</span>
                  </span>
                  <button type="button" className={`mg-btn mg-btn--sm${focus === k ? " mg-btn--gold" : ""}`} aria-pressed={focus === k}
                    onClick={() => run({ type: "SET_FOCUS", attr: k })}>{focus === k ? "Travaillé" : "Travailler"}</button>
                </div>
              </div>
            );
          })}
        </Section>

        <Section title="Saisons">
          {state.seasons.length === 0 ? <Empty>Votre première saison commence.</Empty> : (
            <div className="mg-tablewrap">
              <table className="mg-table">
                <thead><tr><th>Saison</th><th>Club</th><th className="num">Matchs</th><th className="num">Tit.</th><th className="num">Buts</th><th className="num">Passes</th><th className="num">Note</th><th className="num">HdM</th></tr></thead>
                <tbody>
                  {[...state.seasons].reverse().map(l => (
                    <tr key={`${l.season}-${l.clubId}`}>
                      <td>{l.season}</td><td>{clubName(l.clubId)}</td><td className="num">{l.apps}</td><td className="num">{l.starts}</td>
                      <td className="num">{l.goals}</td><td className="num">{l.assists}</td><td className="num"><b>{l.apps ? avgRating(l).toFixed(2) : "–"}</b></td><td className="num">{l.motm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

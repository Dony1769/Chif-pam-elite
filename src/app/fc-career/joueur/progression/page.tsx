"use client";

/** FC CAREER 27 — Carrière Joueur : sous-attributs, entraînement ciblé, PlayStyles. */

import React, { useState } from "react";
import { INTENSITY } from "../../game/player2/difficulty";
import type { Intensity } from "../../game/player2/difficulty";
import { usePlayerGame } from "../_ui/PlayerContext";
import { PlayerCard, Stars } from "../_ui/PlayerCard";
import { Empty, Meter, POS_FR, Section } from "../../manager/_ui/kit";
import { MASTERED, positionRatings } from "../../game/player2/positions";
import type { WorldPlayerPosition } from "../../game/data/worldPlayers";
import { ATTR_KEYS, attrLabel } from "../../game/player2/attributes";
import type { AttrKey } from "../../game/player2/attributes";
import { GK_SUBS, OVR_WEIGHTS, SUB_GROUPS, SUB_LABEL } from "../../game/player2/subAttributes";
import type { SubKey } from "../../game/player2/subAttributes";
import { PLAYSTYLES, psProgress } from "../../game/player2/playstyles";
import { POS_LABEL, avgRating, effSubs, focusLabel, me, myClub, profileOverall, specialXpNeeded, xpNeeded } from "../../game/player2/engine";
import type { TrainingFocus } from "../../game/player2/types";
import { shortName } from "../../game/utils/names";
import { objectiveRatio, objectiveText, refillObjectives } from "../../game/player2/objectives";

const GK_GROUPS: Record<AttrKey, SubKey[]> = {
  pac: ["gkDiving"], sho: ["gkHandling"], pas: ["gkKicking"], dri: ["gkReflexes"], def: ["gkPositioning"], phy: ["acceleration", "sprintSpeed"],
};

export default function ProgressionPage() {
  const { state, run } = usePlayerGame();
  const [psFilter, setPsFilter] = useState<"mine" | "all">("mine");
  const p = me(state);
  const pr = state.profile;
  const pos = pr.position;
  const isGk = pos === "GK";
  const ovr = profileOverall(pr);
  const focus = pr.trainingFocus;
  const weights = OVR_WEIGHTS[pos];
  const groups = isGk ? GK_GROUPS : SUB_GROUPS;
  const clubName = (id: string) => state.shadow.world.clubs.find(c => c.id === id)?.shortName ?? "?";
  const setFocus = (f: TrainingFocus) => run({ type: "SET_FOCUS", attr: f });
  const eff = effSubs(pr);
  const posRatings = positionRatings(eff, pos, pr.familiarity ?? {});

  const psList = PLAYSTYLES.filter(d => !!d.gk === isGk)
    .map(d => ({ d, owned: pr.playStyles.owned.includes(d.id), plus: pr.playStyles.plus.includes(d.id), prog: psProgress(pr.playStyles, d, pr.sub, pr.playStyles.owned.includes(d.id)) }))
    .sort((a, b) => Number(b.plus) - Number(a.plus) || Number(b.owned) - Number(a.owned) || b.prog - a.prog);
  const shownPs = psFilter === "mine" ? psList.filter(x => x.owned || x.prog >= 0.55).slice(0, 12) : psList;

  return (
    <div className="mg-grid">
      <div className="mg-col-4 mg-stack">
        <Section>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PlayerCard name={`${shortName(pr)}`} overall={p.overall} position={pos}
              attrs={pr.attrs} club={myClub(state)} potential={pr.potential} />
          </div>
          <dl className="mg-dl" style={{ marginTop: 14 }}>
            <dt>Note globale</dt><dd>{ovr}</dd>
            <dt>Potentiel</dt><dd>{pr.potential}</dd>
            <dt>Marge de progression</dt><dd>{Math.max(0, pr.potential - ovr)}</dd>
            <dt>Âge</dt><dd>{p.age} ans</dd>
            <dt>Pied fort</dt><dd>{pr.foot === "left" ? "Gauche" : pr.foot === "both" ? "Les deux" : "Droit"}</dd>
            <dt>Pied faible</dt><dd><Stars n={pr.weakFoot} label="Pied faible" /></dd>
            <dt>Gestes techniques</dt><dd><Stars n={pr.skillMoves} label="Gestes techniques" /></dd>
            <dt>Forme · moral</dt><dd>{p.form} · {p.morale}</dd>
          </dl>
        </Section>

        <Section title="Postes" aside={<span className="mg-small">Principal : <b>{POS_LABEL[pos]}</b></span>}>
          <p className="mg-small" style={{ marginTop: 0 }}>Barré à votre poste, le coach peut vous décaler sur un poste voisin. Chaque titularisation là-bas fait progresser la familiarité ; à {MASTERED}, vous pouvez en faire votre poste principal.</p>
          {isGk ? <Empty>Un gardien ne change pas de poste.</Empty> : (
            <div className="mg-stack" style={{ gap: 8 }}>
              {(Object.entries(pr.familiarity ?? {}) as [WorldPlayerPosition, number][]).sort((a, b) => b[1] - a[1]).map(([k, fam]) => (
                <div key={k} className="pc-posrow">
                  <span className="pc-posrow__name"><b>{POS_FR[k]}</b> <span className="mg-small">{POS_LABEL[k]}</span></span>
                  <span className="pc-posrow__ovr" title="Note à ce poste">{posRatings[k] ?? "–"}</span>
                  <Meter value={fam} tone={fam >= MASTERED ? "green" : "auto"} label={`Familiarité ${POS_LABEL[k]}`} />
                  <span className="mg-small pc-posrow__fam">{fam}/100</span>
                  <button type="button" className="mg-btn mg-btn--sm" disabled={fam < MASTERED} onClick={() => run({ type: "SET_POSITION", position: k })}>Poste principal</button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Entraînement spécial">
          <p className="mg-small" style={{ marginTop: 0 }}>Une semaine sur ce geste ne fait progresser aucun sous-attribut, mais rapproche de l&apos;étoile suivante.</p>
          {(["weakFoot", "skillMoves"] as const).map(k => {
            const stars = pr[k];
            const need = specialXpNeeded(stars);
            const pct = stars >= 5 ? 100 : Math.min(99, Math.floor((pr.specialXp[k] / need) * 100));
            return (
              <div key={k} className={`pc-attr${focus === k ? " is-focus" : ""}`} style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span>{k === "weakFoot" ? "Pied faible" : "Gestes techniques"} <Stars n={stars} label={k} /></span>
                  <span className="pc-attr__bar" aria-hidden><i style={{ width: `${pct}%` }} /></span>
                </span>
                <button type="button" className={`mg-btn mg-btn--sm${focus === k ? " mg-btn--gold" : ""}`} disabled={stars >= 5}
                  aria-pressed={focus === k} onClick={() => setFocus(k)}>{stars >= 5 ? "Maximum" : focus === k ? "Travaillé" : "Travailler"}</button>
              </div>
            );
          })}
        </Section>
      </div>

      <div className="mg-col-8 mg-stack">
        {(() => {
          const obj = (state.career?.objectives?.active.length ? state : refillObjectives(state)).career?.objectives;
          if (!obj) return null;
          return (
            <Section title="Objectifs de développement" aside={<span className="mg-small">{obj.done} réussi{obj.done > 1 ? "s" : ""} · {obj.failed} manqué{obj.failed > 1 ? "s" : ""}</span>}>
              <div className="pc-objectives">
                {obj.active.map(o => {
                  const r = objectiveRatio(o);
                  return (
                    <div key={o.id} className="pc-objective">
                      <div className="pc-objective__head"><b>{objectiveText(o)}</b><span className="pc-objective__reward">+{o.reward.pts} {SUB_LABEL[o.reward.sub]}</span></div>
                      <div className="pc-objective__bar"><i style={{ width: `${Math.round(r * 100)}%` }} /></div>
                      <span className="mg-small">
                        {o.kind === "rating" ? `Moyenne ${o.played ? (o.progress / o.played / 10).toFixed(2).replace(".", ",") : "–"} · ${o.played}/${o.window} matchs` : `${o.progress}/${o.target} · ${o.window - o.played} match${o.window - o.played > 1 ? "s" : ""} restant${o.window - o.played > 1 ? "s" : ""}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Section>
          );
        })()}
        <Section title="Intensité des séances" aside={<span className="mg-small">{INTENSITY[pr.intensity ?? "normal"].desc}</span>}>
          <div className="mg-seg" role="group" aria-label="Intensité">
            {(Object.keys(INTENSITY) as Intensity[]).map(k => <button key={k} type="button" aria-pressed={(pr.intensity ?? "normal") === k} onClick={() => run({ type: "SET_INTENSITY", intensity: k })}>{INTENSITY[k].label}</button>)}
          </div>
        </Section>

        <Section title="Entraînement" aside={<span className="mg-small">Objectif : <b>{focusLabel(focus, pos)}</b></span>}>
          <p className="mg-small" style={{ marginTop: 0 }}>
            Touchez un sous-attribut pour le travailler seul (progression rapide), ou « Toute la famille » pour en travailler plusieurs à la fois.
            Les sous-attributs marqués d&apos;un point comptent dans votre note de {isGk ? "gardien" : "poste"}.
          </p>
          <div className="pc-groups">
            {ATTR_KEYS.map(g => {
              const keys = groups[g];
              const groupFocus = `group:${g}` as TrainingFocus;
              const inGroup = focus === groupFocus || keys.includes(focus as SubKey);
              return (
                <div key={g} className={`pc-group${inGroup ? " is-focus" : ""}`}>
                  <div className="pc-group__head">
                    <h3>{attrLabel(g, pos)}</h3>
                    <b>{pr.attrs[g]}</b>
                  </div>
                  {keys.map(k => {
                    const v = pr.sub[k];
                    const star = (eff[k] ?? v) - v;
                    const xp = pr.subXp[k] ?? 0;
                    const pct = Math.min(99, Math.floor((xp / xpNeeded(v)) * 100));
                    return (
                      <button key={k} type="button" className={`pc-sub${focus === k ? " is-focus" : ""}${weights[k] ? " is-key" : ""}`}
                        aria-pressed={focus === k} onClick={() => setFocus(k)} title={`Prochain point : ${pct} %`}>
                        <span>{SUB_LABEL[k]}</span>
                        <b>{v + star}{star ? <small className={`pc-star ${star > 0 ? "is-up" : "is-down"}`} title="Effet des étoiles (pied faible ou gestes)">{star > 0 ? `+${star}` : star}★</small> : null}</b>
                        <span className="pc-attr__bar" aria-hidden><i style={{ width: `${v}%` }} /></span>
                      </button>
                    );
                  })}
                  {keys.length > 1 && (
                    <button type="button" className={`mg-btn mg-btn--sm${focus === groupFocus ? " mg-btn--gold" : ""}`} aria-pressed={focus === groupFocus}
                      onClick={() => setFocus(groupFocus)}>{focus === groupFocus ? "Famille travaillée" : "Toute la famille"}</button>
                  )}
                </div>
              );
            })}
          </div>
          {!isGk && (
            <details style={{ marginTop: 10 }}>
              <summary className="mg-small" style={{ cursor: "pointer" }}>Sous-attributs de gardien</summary>
              <div className="pc-chips" style={{ marginTop: 8 }}>{GK_SUBS.map(k => <span key={k} className="mg-small">{SUB_LABEL[k]} {pr.sub[k]}</span>)}</div>
            </details>
          )}
        </Section>

        <Section title="PlayStyles" aside={
          <div className="mg-seg" aria-label="Filtre PlayStyles">
            <button type="button" aria-pressed={psFilter === "mine"} onClick={() => setPsFilter("mine")}>Les miens</button>
            <button type="button" aria-pressed={psFilter === "all"} onClick={() => setPsFilter("all")}>Tous ({psList.length})</button>
          </div>
        }>
          <p className="mg-small" style={{ marginTop: 0 }}>
            Un PlayStyle se débloque quand les sous-attributs demandés sont atteints et que vous avez réussi assez d&apos;actions liées en match.
            Le PlayStyle+ demande davantage (3 au maximum). Effet : +5 % de réussite (+10 % en PS+) et parfois une action nouvelle.
          </p>
          {shownPs.length === 0 ? <Empty>Aucun PlayStyle en vue pour l&apos;instant. Progressez dans vos sous-attributs clés.</Empty> : (
            <div className="pc-ps">
              {shownPs.map(({ d, owned, plus, prog }) => (
                <div key={d.id} className={`pc-ps__item${owned ? " is-owned" : ""}${plus ? " is-plus" : ""}`}>
                  {owned && <span className="pc-ps__badge">{plus ? "PlayStyle+" : "PlayStyle"}</span>}
                  <b>{d.name}</b>
                  <span>{d.desc}</span>
                  {!plus && (
                    <>
                      <span className="pc-attr__bar" aria-hidden><i style={{ width: `${Math.round(prog * 100)}%` }} /></span>
                      <span>{owned ? "Vers le PlayStyle+" : "Déblocage"} : {Math.round(prog * 100)} % · {Object.entries(owned ? d.plusReq : d.req).map(([k, v]) => `${SUB_LABEL[k as SubKey]} ${v}`).join(", ")}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
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

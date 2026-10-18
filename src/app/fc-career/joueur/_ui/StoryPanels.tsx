"use client";

/** FC CAREER 27 — L'histoire à l'écran : dilemme, entourage, rival, journal, récit de fin de saison. */

import React from "react";
import { createPortal } from "react-dom";
import type { PlayerCareerState } from "../../game/player2/types";
import type { PlayerAction } from "../../game/player2/reducer";
import { Meter, Section } from "../../manager/_ui/kit";
import { ClubName, PlayerName } from "../../manager/_ui/PlayerSheet";
import { fontVars } from "../../manager/_ui/fonts";
import { seasonLabel } from "../../game/domain/calendar";

type Run = (a: PlayerAction) => unknown;

export function DilemmaCard({ state, run }: { state: PlayerCareerState; run: Run }) {
  const d = state.career?.story?.pending;
  if (!d) return null;
  return (
    <Section className="pc-dilemma" title={d.title} aside={<span className="mg-small">{d.from} · {d.role}</span>}>
      <p className="pc-dilemma__text">{d.text}</p>
      <div className="pc-dilemma__choices">
        {d.choices.map(c => (
          <button key={c.id} type="button" className="pc-dilemma__choice" onClick={() => run({ type: "STORY_CHOICE", choiceId: c.id })}>{c.label}</button>
        ))}
      </div>
      <p className="mg-small" style={{ margin: 0 }}>Sans réponse sous deux semaines, l&apos;occasion passe.</p>
    </Section>
  );
}

export function Entourage({ state }: { state: PlayerCareerState }) {
  const st = state.career?.story;
  if (!st) return null;
  const w = state.shadow.world;
  const coach = w.coaches.find(c => c.clubId === state.contract.clubId && c.teamLevel === "first_team" && c.status === "active");
  const rival = w.players.find(p => p.id === st.rivalId);
  const rl = rival ? w.playerStats.filter(x => x.playerId === rival.id && x.season === w.season) : [];
  const ml = state.seasons.filter(l => l.season === w.season);
  const sum = (a: { goals: number }[]) => a.reduce((t, x) => t + x.goals, 0);
  const rows: [string, string, number][] = [
    ["Coach", coach ? `${coach.firstName} ${coach.lastName}` : "—", state.coachTrust],
    ["Capitaine", "", st.captainRel],
    ["Agent", st.agent, st.agentRel],
    ["Supporters", "", state.career?.fans ?? 50],
  ];
  return (
    <Section title="Entourage">
      <div className="pc-entourage">
        {rows.map(([role, name, v]) => (
          <div key={role} className="pc-entourage__row">
            <span className="mg-small">{role}</span>
            <b>{role === "Capitaine" && st.captainId ? <PlayerName world={w} id={st.captainId} /> : name || "—"}</b>
            <Meter value={v} tone={v >= 60 ? "green" : v < 35 ? "red" : "auto"} label={`Relation : ${role}`} />
          </div>
        ))}
      </div>
      {rival && (
        <div className="pc-rival">
          <span className="mg-small">Rival de ta génération</span>
          <b><PlayerName world={w} id={rival.id} /></b>
          <span className="mg-small">{rival.age} ans · note {rival.overall} · <ClubName world={w} id={rival.clubId} crest={14} short /></span>
          <div className="pc-rival__duel"><span>Toi <b>{sum(ml)}</b></span><span>buts cette saison</span><span><b>{sum(rl)}</b> lui</span></div>
        </div>
      )}
      {st.journal.length > 0 && (
        <>
          <h3 className="pc-subhead">Journal</h3>
          <ol className="pc-journal">
            {[...st.journal].reverse().slice(0, 10).map((j, i) => (
              <li key={i} className={`is-${j.tone}`}><span className="mg-small">{w.startYear ? seasonLabel(w.startYear + j.season - 1) : `S${j.season}`} · sem. {j.week}</span>{j.text}</li>
            ))}
          </ol>
        </>
      )}
    </Section>
  );
}

export function SeasonRecapModal({ state, run }: { state: PlayerCareerState; run: Run }) {
  const r = state.career?.story?.recap;
  if (!r || typeof document === "undefined") return null;
  const w = state.shadow.world;
  const label = w.startYear ? seasonLabel(w.startYear + r.season - 1) : `Saison ${r.season}`;
  const rel: [string, number][] = [["Coach", r.relations.coach], ["Vestiaire", r.relations.captain], ["Supporters", r.relations.fans], ["Agent", r.relations.agent]];
  return createPortal(
    <div className={`mg-app mg-portal ${fontVars}`}>
      <div className="pc-sheet" role="dialog" aria-modal="true" aria-label={`Bilan ${label}`}>
        <div className="pc-sheet__panel pc-recap">
          <p className="pc-recap__kicker">Saison {label} · fin de l&apos;histoire</p>
          <h2 className="pc-recap__title">{r.title}</h2>
          <div className="pc-recap__tiles">
            <div><b>{r.numbers.apps}</b><span>matchs</span></div>
            <div><b>{r.numbers.goals}</b><span>buts</span></div>
            <div><b>{r.numbers.assists}</b><span>passes</span></div>
            <div><b>{r.numbers.rating ? r.numbers.rating.toFixed(2).replace(".", ",") : "–"}</b><span>note</span></div>
          </div>
          {r.best && <p className="pc-recap__best">Match de la saison : <b>{r.best.rating.toFixed(1).replace(".", ",")}</b> contre {r.best.vs}{r.best.goals ? `, ${r.best.goals} but${r.best.goals > 1 ? "s" : ""}` : ""}.</p>}
          <div className="pc-recap__story">{r.lines.map((l, i) => <p key={i}>{l}</p>)}</div>
          {r.rival && (
            <div className="pc-recap__rival">
              <span className="mg-small">Duel de la génération</span>
              <div><b>Toi</b> {r.rival.mineGoals} buts · {r.rival.mineAssists} passes</div>
              <div><b>{r.rival.name}</b> ({r.rival.club}) {r.rival.goals} buts · {r.rival.assists} passes</div>
              <em>{r.rival.verdict}</em>
            </div>
          )}
          <div className="pc-recap__rel">
            {rel.map(([k, v]) => <div key={k}><span className="mg-small">{k}</span><Meter value={v} tone={v >= 60 ? "green" : v < 35 ? "red" : "auto"} label={k} /></div>)}
          </div>
          <button type="button" className="mg-btn mg-btn--gold" onClick={() => run({ type: "DISMISS_RECAP" })}>Tourner la page</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

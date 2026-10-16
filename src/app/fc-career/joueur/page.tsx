"use client";

/** FC CAREER 27 — Carrière Joueur v2 : accueil. */

import React from "react";
import Link from "next/link";
import { usePlayerGame } from "./_ui/PlayerContext";
import { PlayerCard, PlayStyleChips, Stars } from "./_ui/PlayerCard";
import { PS_BY_ID } from "../game/player2/playstyles";
import { Crest, Empty, Meter, Section } from "../manager/_ui/kit";
import { SELECTION_LABEL, avgRating, careerTotals, currentSeasonLine, me, myClub, myNextFixture } from "../game/player2/engine";
import { getLeaguePosition, hasMatchThisWeek } from "../game/manager/engine";
import { fixtureDate, worldCalendar } from "../game/domain/calendar";
import { ROLE_LABEL } from "../game/player2/career";
import { shortName } from "../game/utils/names";

export default function PlayerHome() {
  const { state, run } = usePlayerGame();
  const p = me(state);
  const club = myClub(state);
  const fx = myNextFixture(state);
  const clubOf = (id: string) => state.shadow.world.clubs.find(c => c.id === id);
  const line = currentSeasonLine(state);
  const totals = careerTotals(state);
  const last = state.lastMatch;
  const rows = state.shadow.world.standings[club.leagueId] ?? [];
  const pos = getLeaguePosition(state.shadow);
  const league = state.shadow.world.leagues.find(l => l.id === club.leagueId);
  const thisWeek = hasMatchThisWeek(state.shadow);
  const canPlay = !!fx && thisWeek && (state.selection === "starter" || state.selection === "bench");
  const cal = worldCalendar(state.shadow.world);
  const fxDate = fx ? fixtureDate(state.shadow.world, state.shadow.world.schedules[club.leagueId]?.weekOf, fx.matchday) : null;

  return (
    <div className="mg-grid">
      <div className="mg-col-8 mg-stack">
        <Section className="mg-card--accent">
          <div className="pc-hero">
            <PlayerCard name={`${shortName(state.profile)}`} overall={p.overall} position={state.profile.position}
              attrs={state.profile.attrs} club={club} potential={state.profile.potential} />
            <div className="pc-hero__info">
              <span className="mg-small">Cette semaine</span>
              <span className={`pc-status pc-status--${state.selection}`}>{SELECTION_LABEL[state.selection]}</span>
              {fx ? (
                <div className="mg-row">
                  <Crest club={clubOf(fx.homeClubId)} size={26} /><b>{clubOf(fx.homeClubId)?.shortName}</b>
                  <span className="mg-small">contre</span>
                  <b>{clubOf(fx.awayClubId)?.shortName}</b><Crest club={clubOf(fx.awayClubId)} size={26} />
                  <span className="mg-small">· journée {fx.matchday}{fxDate ? ` · ${fxDate}` : ""}</span>
                </div>
              ) : <p className="mg-muted">{cal ? `${cal.phase} : plus de match de championnat avant la saison prochaine.` : "Intersaison : pas de match cette semaine."}</p>}
              {fx && !thisWeek && <p className="mg-small" style={{ margin: 0 }}>Pas de match cette semaine ({cal?.phase === "Intersaison" ? "préparation" : "trêve"}) : entraînement uniquement.</p>}
              <div className="mg-row mg-row--between">
                <span className="mg-small">Confiance du coach</span>
                <span className="mg-row"><Meter value={state.coachTrust} label="Confiance du coach" /><b>{state.coachTrust}</b></span>
              </div>
              <div className="mg-row mg-row--between">
                <span className="mg-small">Rôle · contrat</span>
                <b>{ROLE_LABEL[state.contract.role]} · {state.contract.seasonsLeft} saison(s)</b>
              </div>
              <div className="mg-row mg-row--between">
                <span className="mg-small">Pied faible · gestes</span>
                <span className="mg-row"><Stars n={state.profile.weakFoot} label="Pied faible" /><Stars n={state.profile.skillMoves} label="Gestes techniques" /></span>
              </div>
              <PlayStyleChips owned={state.profile.playStyles.owned} plus={state.profile.playStyles.plus}
                names={Object.fromEntries(Object.values(PS_BY_ID).map(d => [d.id, d.name]))} />
              {state.retired ? (
                <p className="mg-warn">Carrière terminée à {state.retired.age} ans. Votre palmarès reste consultable ; une nouvelle carrière archivera celle-ci.</p>
              ) : (
              <div className="mg-row">
                {canPlay
                  ? <Link href="/fc-career/joueur/match" className="mg-btn mg-btn--gold">Continuer la carrière</Link>
                  : <button type="button" className="mg-btn mg-btn--gold" onClick={() => run({ type: "PLAY_WEEK" })}>Continuer la carrière</button>}
                {canPlay && <button type="button" className="mg-btn" onClick={() => run({ type: "PLAY_WEEK" })}>Simuler la semaine</button>}
                {!thisWeek && cal && <button type="button" className="mg-btn" onClick={() => run({ type: "ADVANCE_TO_MATCH" })}>Aller au prochain match</button>}
                <Link href="/fc-career/joueur/progression" className="mg-btn mg-btn--ghost">Entraînement</Link>
              </div>
              )}
            </div>
          </div>
        </Section>

        {last && (
          <Section title="Dernier match">
            <div className="mg-row mg-row--between">
              <div className="mg-row"><Crest club={clubOf(last.report.homeClubId)} size={24} /><b>{clubOf(last.report.homeClubId)?.shortName}</b></div>
              <strong style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{last.report.home.goals} - {last.report.away.goals}</strong>
              <div className="mg-row"><b>{clubOf(last.report.awayClubId)?.shortName}</b><Crest club={clubOf(last.report.awayClubId)} size={24} /></div>
            </div>
            <p className="mg-small" style={{ marginBottom: 0 }}>
              {last.played
                ? `${last.started ? "Titulaire" : "Entré en jeu"} · note ${last.rating?.toFixed(1)}${last.goals ? ` · ${last.goals} but(s)` : ""}${last.assists ? ` · ${last.assists} passe(s) déc.` : ""}${last.motm ? " · homme du match" : ""}`
                : "Vous n'avez pas joué."}
            </p>
          </Section>
        )}

        <Section title="Messages" aside={<Link href="/fc-career/joueur/messages" className="mg-link">Tout voir</Link>}>
          {state.inbox.slice(0, 4).map(m => (
            <div key={m.id} className={`mg-msg${m.read ? "" : " is-unread"}`}><b>{m.title}</b><span>{m.body}</span></div>
          ))}
          {state.inbox.length === 0 && <Empty>Aucun message.</Empty>}
        </Section>
      </div>

      <div className="mg-col-4 mg-stack">
        <Section title={cal ? `Saison ${cal.season}` : `Saison ${state.shadow.world.season}`} aside={<Link href="/fc-career/joueur/monde" className="mg-link">Compétitions</Link>}>
          <div className="mg-kpis" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <div className="mg-kpi"><span>Matchs</span><b>{line.apps}</b></div>
            <div className="mg-kpi"><span>Buts</span><b>{line.goals}</b></div>
            <div className="mg-kpi"><span>Passes déc.</span><b>{line.assists}</b></div>
            <div className="mg-kpi"><span>Note moy.</span><b>{line.apps ? avgRating(line).toFixed(2) : "–"}</b></div>
          </div>
        </Section>
        <Section title="Carrière">
          <dl className="mg-dl">
            <dt>Matchs</dt><dd>{totals.apps}</dd>
            <dt>Buts</dt><dd>{totals.goals}</dd>
            <dt>Passes décisives</dt><dd>{totals.assists}</dd>
            <dt>Réputation</dt><dd>{Math.round(state.profile.reputation)}/100</dd>
            <dt>Sélections</dt><dd>{state.career?.national.caps ?? 0}</dd>
            <dt>Trophées</dt><dd>{state.career?.awards.length ?? 0}</dd>
          </dl>
        </Section>
        <Section title={league?.name ?? "Classement"}>
          <table className="mg-table">
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.clubId} className={r.clubId === club.id ? "is-me" : ""}>
                  <td>{i + 1}</td><td><span className="mg-pname"><Crest club={clubOf(r.clubId)} size={16} />{clubOf(r.clubId)?.shortName}</span></td>
                  <td className="num">{r.played}</td><td className="num"><b>{r.points}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mg-small" style={{ marginBottom: 0 }}>{club.name} est {pos}e.</p>
        </Section>
      </div>
    </div>
  );
}

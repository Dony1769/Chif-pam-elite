"use client";

/** FC CAREER 27 — Carrière Joueur v2 : accueil. */

import React from "react";
import Link from "next/link";
import { usePlayerGame } from "./_ui/PlayerContext";
import { PlayerCard, PlayStyleChips, Stars } from "./_ui/PlayerCard";
import { PS_BY_ID } from "../game/player2/playstyles";
import { Crest, Empty, Meter, Section } from "../manager/_ui/kit";
import { myCupMatch, cupDate, cupLabel } from "../game/player2/cup";
import { TONE_EFFECT } from "../game/player2/press";
import { leagueZones, teamName } from "../game/domain/competitions";
import { ClubName, WeekResults, useSheets } from "../manager/_ui/PlayerSheet";
import { POS_LABEL, SELECTION_LABEL, avgRating, careerTotals, currentSeasonLine, me, myClub, myNextFixture } from "../game/player2/engine";
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
  const { openMatch } = useSheets();
  const lastSheet = last ? (state.shadow.world.weekSheets ?? []).find(x => x.id === last.report.fixtureId) : undefined;
  const zones = leagueZones(state.shadow.world, club.leagueId);
  const rows = state.shadow.world.standings[club.leagueId] ?? [];
  const pos = getLeaguePosition(state.shadow);
  const league = state.shadow.world.leagues.find(l => l.id === club.leagueId);
  const thisWeek = hasMatchThisWeek(state.shadow);
  const cup = myCupMatch(state);
  const blocked = state.selection === "injured" || state.selection === "suspended";
  const canPlay = (!!cup && cup.selection !== "out") || (!!fx && thisWeek && (state.selection === "starter" || state.selection === "bench"));
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
              <span className={`pc-status pc-status--${state.selection}`}>{SELECTION_LABEL[state.selection]}{state.selection === "starter" && state.playedAs ? ` · ${POS_LABEL[state.playedAs]}` : ""}</span>
              {fx ? (
                <div className="mg-row">
                  <Crest club={clubOf(fx.homeClubId)} size={26} /><b>{clubOf(fx.homeClubId)?.shortName}</b>
                  <span className="mg-small">contre</span>
                  <b>{clubOf(fx.awayClubId)?.shortName}</b><Crest club={clubOf(fx.awayClubId)} size={26} />
                  <span className="mg-small">· journée {fx.matchday}{fxDate ? ` · ${fxDate}` : ""}</span>
                </div>
              ) : <p className="mg-muted">{cal ? `${cal.phase} : plus de match de championnat avant la saison prochaine.` : "Intersaison : pas de match cette semaine."}</p>}
              {cup && (
                <div className={`pc-cupbanner${cup.stage === "Finale" ? " is-final" : ""}`}>
                  <span className="mg-small">{cupDate(state, cup) ?? (cup.national ? "Sélection" : "En semaine")}</span>
                  <b>{cupLabel(cup)}</b>
                  <span className="mg-small">contre {teamName(state.shadow.world, cup.opponent)} · {cup.selection === "starter" ? "titulaire" : cup.selection === "bench" ? "remplaçant" : "non retenu"}</span>
                </div>
              )}
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
                  ? <Link href="/fc-career/joueur/match" className="mg-btn mg-btn--gold">Jouer le match</Link>
                  : cup
                    ? <button type="button" className="mg-btn mg-btn--gold" onClick={() => run({ type: "SKIP_CUP" })}>Passer cette étape</button>
                    : <button type="button" className="mg-btn mg-btn--gold" onClick={() => run({ type: "PLAY_WEEK" })}>{blocked ? "Passer cette étape" : thisWeek && fx ? "Passer le match" : "Passer la semaine"}</button>}
                {canPlay && <button type="button" className="mg-btn" onClick={() => run({ type: cup ? "SKIP_CUP" : "PLAY_WEEK" })}>Simuler le match</button>}
                {!thisWeek && !cup && cal && <button type="button" className="mg-btn" onClick={() => run({ type: "ADVANCE_TO_MATCH" })}>Aller au prochain match</button>}
                <Link href="/fc-career/joueur/progression" className="mg-btn mg-btn--ghost">Entraînement</Link>
              </div>
              )}
            </div>
          </div>
        </Section>

        {last && (
          <Section title="Dernier match" aside={lastSheet ? <button type="button" className="mg-link" onClick={() => openMatch(lastSheet)}>Feuille de match</button> : undefined}>
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

        {state.career?.press && (
          <Section className="pc-press" title="Conférence de presse" aside={<span className="mg-small">{state.career.press.journalist}</span>}>
            <p className="pc-press__q">« {state.career.press.question} »</p>
            <div className="pc-press__answers">
              {state.career.press.answers.map(a => (
                <button key={a.id} type="button" className={`pc-press__a is-${a.id}`} onClick={() => run({ type: "PRESS_ANSWER", tone: a.id })}>
                  <span className="pc-press__tone">{TONE_EFFECT[a.id].label}</span>{a.text}
                </button>
              ))}
            </div>
            <p className="mg-small" style={{ margin: 0 }}>Sans réponse avant le prochain match : « pas de commentaire », les supporters n&apos;aiment pas.</p>
          </Section>
        )}

        <WeekResults world={state.shadow.world} clubId={club.id} limit={2} />

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
            <dt>Supporters</dt><dd>{state.career?.fans ?? 50}/100</dd>
            <dt>Sélections</dt><dd>{state.career?.national.caps ?? 0}</dd>
            <dt>Trophées</dt><dd>{state.career?.awards.length ?? 0}</dd>
          </dl>
        </Section>
        <Section title={league?.name ?? "Classement"}>
          <table className="mg-table">
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.clubId} className={`${r.clubId === club.id ? "is-me" : ""}${zones[i] ? ` pc-zrow is-${zones[i]}` : ""}`}>
                  <td><span className="pc-rank">{i + 1}</span></td><td><ClubName world={state.shadow.world} id={r.clubId} short /></td>
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

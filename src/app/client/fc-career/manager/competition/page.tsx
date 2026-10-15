"use client";

/** FC CAREER 27 — Mode Manager : compétition (classement, calendrier, buteurs, autres ligues). */

import React, { useState } from "react";
import { useGame } from "../_ui/ManagerContext";
import { Crest, Empty, Section, playerName } from "../_ui/kit";
import { getManagedClub } from "../../game/manager/engine";
import { AwardsPanel, LeadersPanel } from "../_ui/WorldPanels";
import { fixtureDate, worldCalendar } from "../../game/domain/calendar";

export default function CompetitionPage() {
  const { state } = useGame();
  const club = getManagedClub(state);
  const [leagueId, setLeagueId] = useState(club.leagueId);
  const league = state.world.leagues.find(l => l.id === leagueId)!;
  const rows = state.world.standings[leagueId] ?? [];
  const sch = state.world.schedules[leagueId];
  const [md, setMd] = useState<number | null>(null);
  const matchday = md ?? Math.min(sch?.currentMatchday ?? 1, sch?.totalMatchdays ?? 1);
  const clubOf = (id: string) => state.world.clubs.find(c => c.id === id);
  const n = rows.length;
  const tier = league.tier;

  const scorers = state.world.playerStats
    .filter(s => s.season === state.world.season && s.leagueId === leagueId && s.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, 10);
  const myFixtures = (state.world.schedules[club.leagueId]?.fixtures ?? [])
    .filter(f => f.homeClubId === club.id || f.awayClubId === club.id)
    .sort((a, b) => a.matchday - b.matchday);

  return (
    <div className="mg-stack">
      <div className="mg-pagehead">
        <div><h1>Compétition</h1><p>{worldCalendar(state.world) ? `Saison ${worldCalendar(state.world)!.season}` : `Saison ${state.world.season}`} · {league.name}</p></div>
        <select className="mg-select" style={{ width: "auto" }} value={leagueId} onChange={e => { setLeagueId(e.target.value); setMd(null); }} aria-label="Championnat">
          {state.world.leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      <div className="mg-grid">
        <div className="mg-col-8 mg-stack">
          <Section title="Classement" aside={<span className="mg-small">{tier === 1 ? "3 derniers relégués" : "2 premiers promus"}</span>}>
            <div className="mg-tablewrap">
              <table className="mg-table">
                <thead><tr><th>#</th><th>Club</th><th className="num">J</th><th className="num">G</th><th className="num">N</th><th className="num">P</th><th className="num">BP</th><th className="num">BC</th><th className="num">Diff</th><th className="num">Pts</th></tr></thead>
                <tbody>
                  {rows.map((r, i) => {
                    const zone = tier === 1 ? (i >= n - 3 ? "mg-zone-down" : "") : (i < 2 ? "mg-zone-up" : "");
                    return (
                      <tr key={r.clubId} className={`${r.clubId === club.id ? "is-me" : ""} ${zone}`}>
                        <td>{i + 1}</td>
                        <td><span className="mg-pname"><Crest club={clubOf(r.clubId)} size={20} />{clubOf(r.clubId)?.name}</span></td>
                        <td className="num">{r.played}</td><td className="num">{r.won}</td><td className="num">{r.drawn}</td><td className="num">{r.lost}</td>
                        <td className="num">{r.goalsFor}</td><td className="num">{r.goalsAgainst}</td>
                        <td className="num">{r.goalsFor - r.goalsAgainst > 0 ? "+" : ""}{r.goalsFor - r.goalsAgainst}</td>
                        <td className="num"><b>{r.points}</b></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          {sch && (
            <Section title={`Journée ${matchday} / ${sch.totalMatchdays}`} aside={
              <span className="mg-row">
                <button type="button" className="mg-btn mg-btn--sm" disabled={matchday <= 1} onClick={() => setMd(matchday - 1)} aria-label="Journée précédente">‹</button>
                <button type="button" className="mg-btn mg-btn--sm" disabled={matchday >= sch.totalMatchdays} onClick={() => setMd(matchday + 1)} aria-label="Journée suivante">›</button>
              </span>
            }>
              <div className="mg-tablewrap"><table className="mg-table">
                <tbody>
                  {sch.fixtures.filter(f => f.matchday === matchday).map(f => (
                    <tr key={f.id} className={f.homeClubId === club.id || f.awayClubId === club.id ? "is-me" : ""}>
                      <td style={{ textAlign: "right" }}><span className="mg-pname" style={{ justifyContent: "flex-end" }}>{clubOf(f.homeClubId)?.name}<Crest club={clubOf(f.homeClubId)} size={18} /></span></td>
                      <td className="num" style={{ textAlign: "center", width: 64 }}><b>{f.result ? `${f.result.scoreHome} - ${f.result.scoreAway}` : "–"}</b></td>
                      <td><span className="mg-pname"><Crest club={clubOf(f.awayClubId)} size={18} />{clubOf(f.awayClubId)?.name}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </Section>
          )}
        </div>

        <div className="mg-col-4 mg-stack">
          <Section title="Buteurs">
            {scorers.length === 0 ? <Empty>Aucun but marqué pour l&apos;instant.</Empty> : (
              <div className="mg-tablewrap"><table className="mg-table">
                <tbody>
                  {scorers.map((s, i) => {
                    const p = state.world.players.find(x => x.id === s.playerId);
                    return (
                      <tr key={s.playerId} className={s.clubId === club.id ? "is-me" : ""}>
                        <td>{i + 1}</td>
                        <td><span className="mg-pname"><Crest club={clubOf(s.clubId)} size={16} />{p ? playerName(p, true) : "?"}</span></td>
                        <td className="num"><b>{s.goals}</b></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            )}
          </Section>
          <Section title={`Calendrier ${club.shortName}`}>
            <div className="mg-tablewrap"><table className="mg-table">
              <tbody>
                {myFixtures.map(f => {
                  const home = f.homeClubId === club.id;
                  const opp = clubOf(home ? f.awayClubId : f.homeClubId);
                  const res = f.result ? (home ? [f.result.scoreHome, f.result.scoreAway] : [f.result.scoreAway, f.result.scoreHome]) : null;
                  const tag = res ? (res[0] > res[1] ? "mg-tag--green" : res[0] < res[1] ? "mg-tag--red" : "") : "";
                  return (
                    <tr key={f.id}>
                      <td className="mg-small">J{f.matchday}{sch?.weekOf || state.world.schedules[club.leagueId]?.weekOf ? <><br />{fixtureDate(state.world, state.world.schedules[club.leagueId]?.weekOf, f.matchday)}</> : null}</td>
                      <td><span className="mg-pname"><Crest club={opp} size={16} />{opp?.shortName} <span className="mg-small">{home ? "dom." : "ext."}</span></span></td>
                      <td className="num">{res ? <span className={`mg-tag ${tag}`}>{res[0]}-{res[1]}</span> : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </Section>
          {state.history.length > 0 && (
            <Section title="Palmarès du manager">
              <div className="mg-tablewrap"><table className="mg-table">
                <tbody>
                  {state.history.map(h => (
                    <tr key={h.season}><td>Saison {h.season}</td><td>{clubOf(h.clubId)?.shortName}</td><td className="num">{h.position}e</td><td>{h.objectiveMet ? <span className="mg-tag mg-tag--green">Objectif</span> : <span className="mg-tag mg-tag--red">Manqué</span>}</td></tr>
                  ))}
                </tbody>
              </table></div>
            </Section>
          )}
        </div>
      </div>
      {state.world.dataset === "cp" && (
        <div className="mg-grid">
          <div className="mg-col-6 mg-stack"><LeadersPanel world={state.world} leagueId={leagueId} /></div>
          <div className="mg-col-6 mg-stack"><LeadersPanel world={state.world} leagueId="all" /></div>
        </div>
      )}
      {state.world.dataset === "cp" && <AwardsPanel world={state.world} leagueId={leagueId} />}
    </div>
  );
}

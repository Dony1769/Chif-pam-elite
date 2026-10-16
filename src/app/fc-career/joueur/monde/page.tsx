"use client";

/** FC CAREER 27 — Carrière Joueur : compétitions, buteurs, passeurs et récompenses du monde. */

import React, { useState } from "react";
import { usePlayerGame } from "../_ui/PlayerContext";
import { Crest, Section } from "../../manager/_ui/kit";
import { AwardsPanel, LeadersPanel } from "../../manager/_ui/WorldPanels";
import { CupsPanel, TrophiesPanel } from "../../manager/_ui/CupsPanel";
import { myClub } from "../../game/player2/engine";
import { worldCalendar } from "../../game/domain/calendar";

export default function WorldPage() {
  const { state } = usePlayerGame();
  const w = state.shadow.world;
  const club = myClub(state);
  const [leagueId, setLeagueId] = useState(club.leagueId);
  const [scope, setScope] = useState<"league" | "all">("league");
  const league = w.leagues.find(l => l.id === leagueId);
  const rows = w.standings[leagueId] ?? [];
  const clubOf = (id: string) => w.clubs.find(c => c.id === id);
  const cal = worldCalendar(w);

  return (
    <div className="mg-stack">
      <div className="mg-pagehead">
        <div><h1>Compétitions</h1><p>{cal ? `Saison ${cal.season} · ${cal.date}` : `Saison ${w.season}`}</p></div>
        <select className="mg-select" style={{ width: "auto" }} value={leagueId} onChange={e => setLeagueId(e.target.value)} aria-label="Championnat">
          {w.leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div className="mg-grid">
        <div className="mg-col-6 mg-stack">
          <Section title={league?.name ?? "Classement"}>
            <div className="mg-tablewrap">
              <table className="mg-table">
                <thead><tr><th>#</th><th>Club</th><th className="num">J</th><th className="num">Diff.</th><th className="num">Pts</th></tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.clubId} className={r.clubId === club.id ? "is-me" : ""}>
                      <td>{i + 1}</td>
                      <td><span className="mg-pname"><Crest club={clubOf(r.clubId)} size={16} />{clubOf(r.clubId)?.name.replace(/^CP /, "")}</span></td>
                      <td className="num">{r.played}</td><td className="num">{r.goalsFor - r.goalsAgainst}</td><td className="num"><b>{r.points}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
        <div className="mg-col-6 mg-stack">
          <div className="mg-seg" aria-label="Périmètre">
            <button type="button" aria-pressed={scope === "league"} onClick={() => setScope("league")}>Ce championnat</button>
            <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>Tous les championnats</button>
          </div>
          <LeadersPanel world={w} leagueId={scope === "all" ? "all" : leagueId} highlight={state.profile.id} />
        </div>
      </div>
      <CupsPanel world={w} me={club.id} nation={state.profile.nationality} />
      <AwardsPanel world={w} leagueId={leagueId} highlight={state.profile.id} />
      <TrophiesPanel world={w} me={club.id} nation={state.profile.nationality} />
    </div>
  );
}

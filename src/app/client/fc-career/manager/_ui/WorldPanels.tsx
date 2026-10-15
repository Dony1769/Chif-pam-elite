"use client";

/**
 * FC CAREER 27 — Panneaux partagés (Joueur et Manager) : meilleurs buteurs et
 * passeurs, palmarès du monde CP (Ballon d'Or, Golden Boy, Soulier d'Or,
 * récompenses de chaque ligue, équipe type, joueur du mois).
 */

import React, { useMemo, useState } from "react";
import type { WorldLiveState } from "../../game/domain/worldState";
import type { WorldAward } from "../../game/domain/worldAwards";
import { Crest, Empty, Section } from "./kit";
import { POS_FR } from "./kit";
import { fullName } from "../../game/utils/names";
import { seasonLabel } from "../../game/domain/calendar";

const seasonName = (w: WorldLiveState, season: number) => (w.startYear ? seasonLabel(w.startYear + season - 1) : `Saison ${season}`);

/** Classements individuels de la saison (une ligue, ou tous les championnats). */
export function LeadersPanel({ world, leagueId, highlight }: { world: WorldLiveState; leagueId: string | "all"; highlight?: string }) {
  const [kind, setKind] = useState<"goals" | "assists">("goals");
  const rows = useMemo(() => {
    const agg = new Map<string, { id: string; clubId: string; goals: number; assists: number; apps: number }>();
    for (const st of world.playerStats) {
      if (st.season !== world.season || (leagueId !== "all" && st.leagueId !== leagueId)) continue;
      const cur = agg.get(st.playerId) ?? { id: st.playerId, clubId: st.clubId, goals: 0, assists: 0, apps: 0 };
      agg.set(st.playerId, { ...cur, goals: cur.goals + st.goals, assists: cur.assists + st.assists, apps: cur.apps + st.appearances });
    }
    return [...agg.values()].filter(r => r[kind] > 0).sort((a, b) => b[kind] - a[kind] || a.apps - b.apps).slice(0, 15);
  }, [world, leagueId, kind]);
  const byId = useMemo(() => new Map(world.players.map(p => [p.id, p])), [world]);
  const clubOf = (id: string) => world.clubs.find(c => c.id === id);
  return (
    <Section title={kind === "goals" ? "Meilleurs buteurs" : "Meilleurs passeurs"} aside={
      <div className="mg-seg" aria-label="Classement individuel">
        <button type="button" aria-pressed={kind === "goals"} onClick={() => setKind("goals")}>Buts</button>
        <button type="button" aria-pressed={kind === "assists"} onClick={() => setKind("assists")}>Passes</button>
      </div>
    }>
      {rows.length === 0 ? <Empty>Aucun {kind === "goals" ? "but" : "passe décisive"} pour l&apos;instant cette saison.</Empty> : (
        <div className="mg-tablewrap">
          <table className="mg-table">
            <thead><tr><th>#</th><th>Joueur</th><th>Club</th><th className="num">Matchs</th><th className="num">{kind === "goals" ? "Buts" : "Passes"}</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const p = byId.get(r.id);
                return (
                  <tr key={r.id} className={r.id === highlight ? "is-me" : ""}>
                    <td>{i + 1}</td>
                    <td><b>{p ? fullName(p) : "—"}</b> <span className="mg-small">{p ? POS_FR[p.position] : ""}</span></td>
                    <td><span className="mg-pname"><Crest club={clubOf(r.clubId)} size={16} />{clubOf(r.clubId)?.shortName}</span></td>
                    <td className="num">{r.apps}</td>
                    <td className="num"><b>{r[kind]}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

const BIG: WorldAward["id"][] = ["ballon_dor", "golden_boy", "golden_shoe", "yachine", "kopa"];

/** Palmarès du monde CP. */
export function AwardsPanel({ world, leagueId, highlight }: { world: WorldLiveState; leagueId?: string; highlight?: string }) {
  const awards = world.awards ?? [];
  const byId = useMemo(() => new Map(world.players.map(p => [p.id, p])), [world]);
  const clubOf = (id?: string) => world.clubs.find(c => c.id === id);
  const who = (a: { playerId?: string; clubId?: string }) => {
    const p = a.playerId ? byId.get(a.playerId) : undefined;
    return (
      <span className="mg-pname">
        <Crest club={clubOf(a.clubId)} size={16} />
        {p ? <b className={a.playerId === highlight ? "pc-me" : ""}>{fullName(p)}</b> : <b>{clubOf(a.clubId)?.name}</b>}
        {p && <span className="mg-small"> {POS_FR[p.position]} · {p.age} ans</span>}
      </span>
    );
  };
  const latest = (id: WorldAward["id"]) => [...awards].reverse().find(a => a.id === id);
  const bdo = latest("ballon_dor");
  const gb = latest("golden_boy");
  const [showRank, setShowRank] = useState<"bdo" | "gb" | null>(null);
  const leagueAwards = leagueId ? awards.filter(a => a.leagueId === leagueId && a.id !== "potm" && a.id !== "tots") : [];
  const lastLeagueSeason = leagueAwards.length ? Math.max(...leagueAwards.map(a => a.season)) : null;
  const tots = leagueId && lastLeagueSeason ? awards.filter(a => a.leagueId === leagueId && a.id === "tots" && a.season === lastLeagueSeason) : [];
  const potm = leagueId ? awards.filter(a => a.leagueId === leagueId && a.id === "potm" && a.atSeason === world.season) : [];

  if (!awards.length) {
    return (
      <Section title="Récompenses">
        <Empty>Les premières récompenses arrivent fin août (joueur du mois). Ballon d&apos;Or CP fin octobre, Golden Boy mi-décembre, trophées de fin de saison fin mai.</Empty>
      </Section>
    );
  }
  const ranking = showRank === "bdo" ? bdo?.ranking : showRank === "gb" ? gb?.ranking : undefined;
  return (
    <Section title="Récompenses du monde">
      <div className="pc-awards">
        {BIG.map(id => {
          const a = latest(id);
          if (!a) return null;
          return (
            <div key={id} className={`pc-award${a.playerId === highlight ? " is-me" : ""}`}>
              <span className="pc-award__label">{a.label}</span>
              {who(a)}
              {(id === "ballon_dor" || id === "golden_boy") && a.ranking && (
                <button type="button" className="mg-link" onClick={() => setShowRank(showRank === (id === "ballon_dor" ? "bdo" : "gb") ? null : id === "ballon_dor" ? "bdo" : "gb")}>
                  {showRank === (id === "ballon_dor" ? "bdo" : "gb") ? "Masquer le classement" : `Classement (${a.ranking.length})`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {ranking && (
        <div className="mg-tablewrap" style={{ marginTop: 10 }}>
          <table className="mg-table">
            <thead><tr><th>#</th><th>Joueur</th><th className="num">Points</th></tr></thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.playerId} className={r.playerId === highlight ? "is-me" : ""}>
                  <td>{i + 1}</td><td>{who(r)}</td><td className="num">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {leagueId && lastLeagueSeason && (
        <>
          <h3 className="pc-subhead">{world.leagues.find(l => l.id === leagueId)?.name} · {seasonName(world, lastLeagueSeason)}</h3>
          <div className="pc-awards">
            {leagueAwards.filter(a => a.season === lastLeagueSeason).map((a, i) => (
              <div key={i} className={`pc-award${a.playerId === highlight ? " is-me" : ""}`}>
                <span className="pc-award__label">{a.label}</span>{who(a)}
              </div>
            ))}
          </div>
          {tots.length > 0 && (
            <>
              <h3 className="pc-subhead">Équipe type</h3>
              <div className="pc-chips">{tots.map(a => { const p = byId.get(a.playerId!); return p ? <span key={a.playerId} className={`pc-chip${a.playerId === highlight ? " is-plus" : ""}`}>{POS_FR[p.position]} {fullName(p)}</span> : null; })}</div>
            </>
          )}
        </>
      )}
      {potm.length > 0 && (
        <>
          <h3 className="pc-subhead">Joueurs du mois</h3>
          <div className="pc-awards">
            {potm.map((a, i) => <div key={i} className={`pc-award${a.playerId === highlight ? " is-me" : ""}`}><span className="pc-award__label">{a.label.split(" · ")[0]}</span>{who(a)}</div>)}
          </div>
        </>
      )}
    </Section>
  );
}

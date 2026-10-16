"use client";

/**
 * FC CAREER 27 — Coupes du monde CP (partagé Joueur et Manager) : coupe nationale,
 * CP Ligue des champions, CP Ligue Europa, CP Euro / Coupe du monde, et palmarès.
 */

import React, { useMemo, useState } from "react";
import type { WorldLiveState } from "../../game/domain/worldState";
import { isNation, progressOf, sortTable, teamName, type Competition, type CupTie } from "../../game/domain/competitions";
import { Crest, Empty, Section } from "./kit";
import { formatDate, matchDate } from "../../game/domain/calendar";

function Team({ w, id, me }: { w: WorldLiveState; id: string; me?: string }) {
  const club = isNation(id) ? undefined : w.clubs.find(c => c.id === id);
  return (
    <span className="mg-pname">
      {club && <Crest club={club} size={16} />}
      {id === me ? <b>{teamName(w, id)}</b> : teamName(w, id)}
    </span>
  );
}

function Tie({ w, t, me }: { w: WorldLiveState; t: CupTie; me?: string }) {
  const played = t.hs !== undefined;
  return (
    <tr className={t.home === me || t.away === me ? "is-me" : ""}>
      <td style={{ textAlign: "right" }}><Team w={w} id={t.home} me={me} /></td>
      <td className="num" style={{ textAlign: "center", width: 84 }}>
        <b>{played ? `${t.hs} - ${t.as}` : "–"}</b>
        {t.pens && <div className="mg-small">t.a.b. {t.pens[0]}-{t.pens[1]}</div>}
      </td>
      <td><Team w={w} id={t.away} me={me} /></td>
    </tr>
  );
}

/** `me` : club (ou sélection) à mettre en avant. */
export function CupsPanel({ world, me, nation }: { world: WorldLiveState; me?: string; nation?: string }) {
  const comps = useMemo(() => (world.competitions ?? []).filter(c => c.season === world.season), [world]);
  const mine = comps.filter(c => (me && (c.groups?.some(g => g.teams.includes(me)) || c.rounds.some(r => r.ties.some(t => t.home === me || t.away === me)) || c.pending.includes(me))) || (nation && c.groups?.some(g => g.teams.includes(nation))));
  const [sel, setSel] = useState<string | null>(null);
  const comp: Competition | undefined = comps.find(c => c.id === sel) ?? mine[0] ?? comps[0];
  const year = (world.startYear ?? 2026) + world.season - 1;
  const highlight = comp?.kind === "national" ? nation : me;

  if (!comps.length) {
    return (
      <Section title="Coupes">
        <Empty>Les coupes commencent à la fin de l&apos;été : coupe nationale dès fin août, CP Ligue des champions et CP Ligue Europa en septembre.</Empty>
      </Section>
    );
  }
  return (
    <Section title="Coupes" aside={
      <select className="mg-select" style={{ width: "auto" }} value={comp?.id} onChange={e => setSel(e.target.value)} aria-label="Coupe">
        {comps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    }>
      {mine.length > 0 && (
        <div className="pc-chips" style={{ marginBottom: 10 }}>
          {mine.map(c => <span key={c.id} className="pc-chip">{c.name} : {progressOf(c, c.kind === "national" ? nation! : me!) ?? "—"}</span>)}
        </div>
      )}
      {comp && (
        <div className="mg-stack">
          {comp.winner && <p><b>Vainqueur : </b><Team w={world} id={comp.winner} me={highlight} /> <span className="mg-small">(finaliste : {teamName(world, comp.runnerUp!)})</span></p>}
          {[...comp.rounds].reverse().map((r, i) => (
            <div key={i}>
              <h3 className="pc-subhead">{r.name} <span className="mg-small">· {formatDate(matchDate(year, r.week, comp.kind !== "national"))}</span></h3>
              <div className="mg-tablewrap"><table className="mg-table"><tbody>
                {r.ties.map(t => <Tie key={t.id} w={world} t={t} me={highlight} />)}
              </tbody></table></div>
            </div>
          ))}
          {comp.groups && (
            <div className="mg-grid">
              {comp.groups.map(g => (
                <div key={g.name} className="mg-col-6">
                  <h3 className="pc-subhead">{g.name}</h3>
                  <div className="mg-tablewrap"><table className="mg-table">
                    <thead><tr><th>Équipe</th><th className="num">J</th><th className="num">Diff.</th><th className="num">Pts</th></tr></thead>
                    <tbody>
                      {sortTable(g.table).map((r, k) => (
                        <tr key={r.id} className={r.id === highlight ? "is-me" : k < 2 ? "mg-zone-up" : ""}>
                          <td><Team w={world} id={r.id} me={highlight} /></td>
                          <td className="num">{r.p}</td><td className="num">{r.gf - r.ga}</td><td className="num"><b>{r.pts}</b></td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                </div>
              ))}
            </div>
          )}
          {comp.pending.length > 0 && comp.rounds.length <= 1 && (
            <p className="mg-small">Exemptés du premier tour : {comp.pending.length} clubs des divisions supérieures.</p>
          )}
        </div>
      )}
    </Section>
  );
}

/** Palmarès des coupes (toutes saisons). */
export function TrophiesPanel({ world, me, nation }: { world: WorldLiveState; me?: string; nation?: string }) {
  const list = [...(world.trophies ?? [])].reverse().slice(0, 30);
  if (!list.length) return null;
  return (
    <Section title="Palmarès des coupes">
      <div className="mg-tablewrap"><table className="mg-table">
        <thead><tr><th>Année</th><th>Compétition</th><th>Vainqueur</th><th>Finaliste</th></tr></thead>
        <tbody>
          {list.map((t, i) => (
            <tr key={i} className={t.winner === me || t.winner === nation ? "is-me" : ""}>
              <td>{t.kind === "national" ? t.year : `${t.year - 1}-${String(t.year % 100).padStart(2, "0")}`}</td>
              <td>{t.name}</td>
              <td><Team w={world} id={t.winner} me={me ?? nation} /></td>
              <td>{t.runnerUp ? teamName(world, t.runnerUp) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </Section>
  );
}

"use client";

/**
 * FC CAREER 27 — Fiche d'un joueur du monde (fenêtre) : saison par saison,
 * buts, passes, matchs et note par compétition, récompenses et trophées.
 */

import React, { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { WorldLiveState } from "../../game/domain/worldState";
import { playerRecord } from "../../game/domain/playerRecord";
import { seasonLabel } from "../../game/domain/calendar";
import { fullName } from "../../game/utils/names";
import { Crest, Empty, Ovr, POS_FR } from "./kit";

const seasonName = (w: WorldLiveState, season: number) => (w.startYear ? seasonLabel(w.startYear + season - 1) : `Saison ${season}`);

export function PlayerSheet({ world, playerId, onClose, highlight }: { world: WorldLiveState; playerId: string; onClose: () => void; highlight?: string }) {
  const p = world.players.find(x => x.id === playerId);
  const record = useMemo(() => playerRecord(world, playerId), [world, playerId]);
  const clubOf = (id: string) => world.clubs.find(c => c.id === id);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!p) return null;
  const club = clubOf(p.clubId);
  const country = world.countries.find(c => c.id === p.countryId);
  const totals = {
    apps: Math.max(p.careerAppearances, record.reduce((a, r) => a + r.apps, 0)),
    goals: Math.max(p.careerGoals, record.reduce((a, r) => a + r.goals, 0)),
    assists: Math.max(p.careerAssists, record.reduce((a, r) => a + r.assists, 0)),
  };
  return createPortal(
    <div className="mg-app mg-portal"><div className="pc-sheet" role="dialog" aria-modal="true" aria-label={`Fiche de ${fullName(p)}`} onClick={onClose}>
      <div className="pc-sheet__panel" onClick={e => e.stopPropagation()}>
        <header className="pc-sheet__head">
          <Crest club={club} size={44} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2>{fullName(p)}{p.id === highlight ? " (vous)" : ""}</h2>
            <p className="mg-small">{POS_FR[p.position]} · {p.age} ans · {country?.name ?? p.nationality} · {p.clubId === "retired" ? "retraité" : club?.name}</p>
          </div>
          <Ovr value={p.overall} />
          <button type="button" className="mg-btn mg-btn--sm mg-btn--ghost" onClick={onClose} aria-label="Fermer la fiche">Fermer</button>
        </header>
        <dl className="pc-sheet__totals">
          <div><dt>Matchs</dt><dd>{totals.apps}</dd></div>
          <div><dt>Buts</dt><dd>{totals.goals}</dd></div>
          <div><dt>Passes déc.</dt><dd>{totals.assists}</dd></div>
          <div><dt>Valeur</dt><dd>{p.marketValue >= 1e6 ? `${(p.marketValue / 1e6).toFixed(1).replace(".", ",")} M€` : `${Math.round(p.marketValue / 1000)} k€`}</dd></div>
        </dl>
        {record.length === 0 ? <Empty>Aucune statistique enregistrée pour ce joueur dans ce monde.</Empty> : record.map(r => (
          <section key={r.season} className="pc-sheet__season">
            <h3>{seasonName(world, r.season)}<span className="mg-small"> · {r.apps} matchs · {r.goals} buts · {r.assists} passes{r.avgRating ? ` · note ${r.avgRating.toFixed(2).replace(".", ",")}` : ""}</span></h3>
            {r.lines.length > 0 && (
              <div className="mg-tablewrap">
                <table className="mg-table">
                  <thead><tr><th>Compétition</th><th>Club</th><th className="num">M</th><th className="num">B</th><th className="num">PD</th><th className="num">Note</th></tr></thead>
                  <tbody>
                    {r.lines.map(l => (
                      <tr key={l.compId + l.clubId}>
                        <td>{l.name}</td>
                        <td><span className="mg-pname"><Crest club={clubOf(l.clubId)} size={14} />{clubOf(l.clubId)?.shortName ?? ""}</span></td>
                        <td className="num">{l.apps}</td><td className="num">{l.goals}</td><td className="num">{l.assists}</td>
                        <td className="num">{l.avgRating ? l.avgRating.toFixed(1).replace(".", ",") : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(r.awards.length > 0 || r.trophies.length > 0) && (
              <div className="pc-chips" style={{ marginTop: 8 }}>
                {r.trophies.map(t => <span key={t.compId} className="pc-chip is-plus">🏆 {t.name}</span>)}
                {r.awards.map((a, i) => <span key={i} className="pc-chip">{a.id === "league_title" ? `🏆 ${a.label}` : a.id === "potm" ? a.label.split(" · ")[0] : a.label}</span>)}
              </div>
            )}
          </section>
        ))}
      </div>
    </div></div>,
    document.body,
  );
}

/** Nom cliquable qui ouvre la fiche. */
export function PlayerLink({ name, onOpen, me }: { name: string; onOpen: () => void; me?: boolean }) {
  return <button type="button" className={`pc-plink${me ? " pc-me" : ""}`} onClick={onOpen}>{name}</button>;
}

"use client";

/** FC CAREER 27 — Vitrine des trophées du joueur (3D) avec le détail de chaque trophée. */

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { PlayerCareerState } from "../../game/player2/types";
import { CELL_H, CELL_W, totalTrophies, trophyCabinet } from "../../game/player2/cabinet";
import { seasonLabel } from "../../game/domain/calendar";
import { teamName } from "../../game/domain/competitions";
import { Crest, Section } from "../../manager/_ui/kit";

const CabinetScene = dynamic(() => import("./CabinetScene"), { ssr: false });

export function TrophyCabinet({ state }: { state: PlayerCareerState }) {
  const shelves = useMemo(() => trophyCabinet(state), [state]);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cols = width && width < 560 ? 3 : 4;
  const rows = Math.ceil(shelves.length / cols);
  const cellH = width ? (width / cols) * (CELL_H / CELL_W) : 0;
  const height = Math.round(rows * cellH);
  const w = state.shadow.world;
  const season = (n: number) => (w.startYear ? seasonLabel(w.startYear + n - 1) : `Saison ${n}`);
  const sel = shelves.find(s => s.key === active) ?? null;
  const total = totalTrophies(shelves);

  return (
    <Section title={`Vitrine (${total})`} aside={<span className="mg-small">Touchez un trophée pour le détail</span>}>
      <div ref={box} className="pc-cabinet" style={{ height: height || 320 }}>
        {width > 0 && <CabinetScene shelves={shelves} cols={cols} width={width} height={height} active={active} hover={hover} />}
        <div className="pc-cabinet__grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: cellH || 160 }}>
          {shelves.map(sh => (
            <button key={sh.key} type="button" className={`pc-cabinet__cell${active === sh.key ? " is-active" : ""}${sh.entries.length ? "" : " is-locked"}`}
              aria-pressed={active === sh.key} aria-label={`${sh.name} : ${sh.entries.length}`}
              onClick={() => setActive(active === sh.key ? null : sh.key)} onPointerEnter={() => setHover(sh.key)} onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(sh.key)} onBlur={() => setHover(null)}>
              <span className="pc-cabinet__count">{sh.entries.length}</span>
              <span className="pc-cabinet__name">{sh.name}</span>
            </button>
          ))}
        </div>
      </div>
      {sel && (
        <div className="pc-cabinet__detail" aria-live="polite">
          <h3>{sel.name} <span className="mg-small">× {sel.entries.length}</span></h3>
          {sel.entries.length === 0 ? <p className="mg-muted" style={{ margin: 0 }}>Pas encore gagné. Il reste une place dans la vitrine.</p> : (
            <div className="mg-tablewrap">
              <table className="mg-table">
                <thead><tr><th>Saison</th><th>Équipe</th><th className="pc-hide-sm">Distinction</th><th className="num">M</th><th className="num">B</th><th className="num">PD</th></tr></thead>
                <tbody>
                  {sel.entries.map((e, i) => {
                    const club = w.clubs.find(c => c.id === e.clubId);
                    return (
                      <tr key={i}>
                        <td>{season(e.season)}</td>
                        <td><span className="mg-pname">{club ? <Crest club={club} size={16} /> : null}{e.clubId ? teamName(w, e.clubId) : "—"}</span></td>
                        <td className="mg-small pc-hide-sm">{e.label}</td>
                        <td className="num">{e.apps}</td><td className="num"><b>{e.goals}</b></td><td className="num">{e.assists}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

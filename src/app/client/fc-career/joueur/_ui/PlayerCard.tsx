"use client";

/** Carte joueur façon FC : note, poste, nom, six caractéristiques, aux couleurs du club. */

import React from "react";
import type { Club } from "../../game/domain/club";
import type { Attrs } from "../../game/player2/attributes";
import { ATTR_KEYS, ATTR_SHORT, GK_ATTR_SHORT } from "../../game/player2/attributes";
import type { WorldPlayerPosition } from "../../game/data/worldPlayers";
import { POS_FR } from "../../manager/_ui/kit";

export function PlayerCard({ name, overall, position, attrs, club, potential, compact }: {
  name: string; overall: number; position: WorldPlayerPosition; attrs: Attrs; club?: Pick<Club, "shortName" | "colors">;
  potential?: number; compact?: boolean;
}) {
  const short = position === "GK" ? GK_ATTR_SHORT : ATTR_SHORT;
  const tier = overall >= 80 ? "gold" : overall >= 70 ? "silver" : "bronze";
  return (
    <div data-tilt className={`pc-card pc-card--${tier}${compact ? " pc-card--compact" : ""}`} style={{ ["--club" as string]: club?.colors.primary ?? "#B9FF39" }}
      role="img" aria-label={`${name}, ${POS_FR[position] ?? position}, note ${overall}`}>
      <div className="pc-card__top">
        <div className="pc-card__ovr">
          <b>{overall}</b>
          <span>{POS_FR[position] ?? position}</span>
        </div>
        {club && <span className="pc-card__club">{club.shortName}</span>}
      </div>
      <div className="pc-card__name">{name}</div>
      <div className="pc-card__attrs">
        {ATTR_KEYS.map(k => (
          <div key={k}><b>{attrs[k]}</b><span>{short[k]}</span></div>
        ))}
      </div>
      {potential !== undefined && <div className="pc-card__pot">Potentiel {potential}</div>}
    </div>
  );
}

export function Stars({ n, label }: { n: number; label: string }) {
  return <span className="pc-stars" aria-label={`${label} : ${n} sur 5`}>{"★".repeat(n)}<i>{"★".repeat(Math.max(0, 5 - n))}</i></span>;
}

/** Pastilles des PlayStyles obtenus (PS+ en premier). */
export function PlayStyleChips({ owned, plus, names }: { owned: string[]; plus: string[]; names: Record<string, string> }) {
  if (!owned.length) return null;
  const sorted = [...owned].sort((a, b) => Number(plus.includes(b)) - Number(plus.includes(a)));
  return (
    <div className="pc-chips" aria-label="PlayStyles">
      {sorted.map(id => <span key={id} className={`pc-chip${plus.includes(id) ? " is-plus" : ""}`}>{names[id] ?? id}{plus.includes(id) ? "+" : ""}</span>)}
    </div>
  );
}

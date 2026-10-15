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
    <div className={`pc-card pc-card--${tier}${compact ? " pc-card--compact" : ""}`} style={{ ["--club" as string]: club?.colors.primary ?? "#B9FF39" }}
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

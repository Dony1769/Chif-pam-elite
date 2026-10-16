"use client";

import { motion } from "framer-motion";
import type { Player } from "../domain/player";
import { itemFade } from "../design/animations";

interface PlayerCardProps {
  player: Player;
  /** Afficher les attributs par famille */
  showStats?: boolean;
}

const FAMILY_LABELS: Record<string, string> = {
  technique: "Technique",
  physique:  "Physique",
  mental:    "Mental",
};

export function PlayerCard({ player, showStats = false }: PlayerCardProps) {
  const { firstName, lastName, position, overall, potential, nationality, age, foot } = player;

  return (
    <motion.div
      className="fc-player-card"
      variants={itemFade}
      initial="hidden"
      animate="visible"
    >
      {/* Bloc overall */}
      <div>
        <div className="fc-player-card__overall">{overall}</div>
        <div className="fc-player-card__overall-label">OVR</div>
      </div>

      {/* Infos */}
      <div className="fc-player-card__info">
        <div className="fc-player-card__name">
          {firstName} {lastName}
        </div>

        <div className="fc-player-card__pos-row">
          <span className="fc-badge fc-badge--pos">{position}</span>
          <span className="fc-badge fc-badge--neutral">{nationality}</span>
          <span className="fc-badge fc-badge--neutral">{foot === "right" ? "Pied D" : foot === "left" ? "Pied G" : "Ambidextre"}</span>
        </div>

        <div className="fc-player-card__meta">
          {age} ans · Potentiel <strong style={{ color: "var(--fc-emerald)" }}>{potential}</strong>
        </div>
      </div>

      {/* Attributs (optionnel) */}
      {showStats && (
        <div style={{ gridColumn: "1 / -1", marginTop: "var(--fc-space-4)" }}>
          <KeyStats player={player} />
        </div>
      )}
    </motion.div>
  );
}

function KeyStats({ player }: { player: Player }) {
  const a = player.attributes;
  const stats = [
    { label: "Finition",    value: a.finishing },
    { label: "Vitesse",     value: a.sprintSpeed },
    { label: "Dribble",     value: a.dribbling },
    { label: "Passe courte",value: a.shortPassing },
    { label: "Force",       value: a.strength },
    { label: "Endurance",   value: a.stamina },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
      {stats.map(s => {
        const pct = Math.min(100, (s.value / 99) * 100);
        return (
          <div key={s.label} className="fc-stat-bar">
            <span className="fc-stat-bar__label">{s.label}</span>
            <div className="fc-stat-bar__track">
              <motion.div
                className="fc-stat-bar__fill"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              />
            </div>
            <span className="fc-stat-bar__value">{s.value}</span>
          </div>
        );
      })}
    </div>
  );
}

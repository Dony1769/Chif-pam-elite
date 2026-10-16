"use client";

/**
 * FC CAREER — Défis de carrière
 * Scénarios optionnels avec objectifs mesurables et récompenses.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGame }  from "../game/hooks/useGame";
import { useToast } from "../game/components/Toast";
import { selectPlayer, selectCareer } from "../game/state/selectors";
import { writeSave } from "../game/persistence/saveRepository";
import {
  buildInitialChallenges,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  CATEGORY_LABELS,
  type CareerChallenge,
  type ChallengeStatus,
} from "../game/domain/challenges";
import { pageFade, stagger, itemFade } from "../game/design/animations";

/* ── Helpers ─────────────────────────────────────────────────────── */

function statusLabel(status: ChallengeStatus): string {
  switch (status) {
    case "locked":    return "Verrouillé";
    case "available": return "Disponible";
    case "active":    return "En cours";
    case "completed": return "Complété";
    case "failed":    return "Échoué";
  }
}

function statusBadgeClass(status: ChallengeStatus): string {
  switch (status) {
    case "locked":    return "fc-badge fc-badge--neutral";
    case "available": return "fc-badge fc-badge--neutral";
    case "active":    return "fc-badge fc-badge--pos";
    case "completed": return "fc-badge fc-badge--pos";
    case "failed":    return "fc-badge fc-badge--warn";
  }
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div style={{ height: 4, background: "var(--fc-surface-2)", borderRadius: 2, overflow: "hidden" }}>
      <motion.div
        style={{ height: "100%", background: "var(--fc-emerald)", borderRadius: 2 }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6 }}
      />
    </div>
  );
}

function ChallengeCard({
  challenge,
  onActivate,
}: {
  challenge: CareerChallenge;
  onActivate: (id: string) => void;
}) {
  const color = DIFFICULTY_COLORS[challenge.difficulty];
  const isLocked = challenge.status === "locked";
  const isActive = challenge.status === "active";
  const isDone   = challenge.status === "completed";
  const isFailed = challenge.status === "failed";

  return (
    <motion.div
      variants={itemFade}
      className="fc-card"
      style={{
        padding: "var(--fc-space-4)",
        opacity: isLocked ? 0.4 : 1,
        borderColor: isDone ? "rgba(55,217,154,0.3)" : isFailed ? "rgba(255,107,107,0.3)" : "var(--fc-border)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-3)", marginBottom: "var(--fc-space-3)" }}>
        <span style={{ fontSize: "1.5rem" }}>{challenge.reward.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-2)", flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "var(--fc-font-display)", fontWeight: 700,
              fontSize: "var(--fc-text-sm)", color: "var(--fc-text)",
            }}>
              {challenge.title}
            </span>
            <span style={{
              fontSize: "var(--fc-text-xs)", fontWeight: 700,
              color, padding: "1px 6px",
              border: `1px solid ${color}`,
              borderRadius: "var(--fc-radius-sm)",
            }}>
              {DIFFICULTY_LABELS[challenge.difficulty]}
            </span>
          </div>
          <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
            {CATEGORY_LABELS[challenge.category]}
          </span>
        </div>
        <span className={statusBadgeClass(challenge.status)} style={{ flexShrink: 0, fontSize: "var(--fc-text-xs)" }}>
          {statusLabel(challenge.status)}
        </span>
      </div>

      {/* Description */}
      <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)", marginBottom: "var(--fc-space-3)", lineHeight: 1.5 }}>
        {challenge.description}
      </p>

      {/* Objectifs */}
      {(isActive || isDone || isFailed) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)", marginBottom: "var(--fc-space-3)" }}>
          {challenge.objectives.map(obj => (
            <div key={obj.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{obj.label}</span>
                <span style={{
                  fontSize: "var(--fc-text-xs)", fontWeight: 600,
                  color: obj.done ? "var(--fc-emerald)" : "var(--fc-text-2)",
                }}>
                  {obj.done ? "✓" : `${obj.current}/${obj.target}`}
                </span>
              </div>
              <ProgressBar current={obj.current} target={obj.target} />
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-emerald)", fontWeight: 600 }}>
          🎁 {challenge.reward.label}
        </span>
        {challenge.status === "available" && (
          <button
            className="fc-btn fc-btn--primary"
            style={{ padding: "4px 12px", fontSize: "var(--fc-text-xs)" }}
            onClick={() => onActivate(challenge.id)}
          >
            Activer
          </button>
        )}
        {challenge.weekLimit && isActive && (
          <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-amber)" }}>
            ⏱ {challenge.weekLimit - challenge.weeksElapsed} semaines
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ── Page principale ─────────────────────────────────────────────── */
export default function ChallengesPage() {
  const { state, dispatch } = useGame();
  const { toast }           = useToast();

  const player = selectPlayer(state);
  const career = selectCareer(state);
  const save   = state.save;

  const [filter, setFilter] = useState<ChallengeStatus | "all">("all");

  const challenges: CareerChallenge[] = save?.challenges ?? buildInitialChallenges();

  const filtered = filter === "all"
    ? challenges
    : challenges.filter(c => c.status === filter);

  const stats = {
    completed: challenges.filter(c => c.status === "completed").length,
    active:    challenges.filter(c => c.status === "active").length,
    total:     challenges.length,
  };

  function handleActivate(challengeId: string) {
    if (!save || !career) return;
    dispatch({ type: "ACTIVATE_CHALLENGE", challengeId });
    if (save) {
      writeSave({ ...save, challenges: (save.challenges ?? buildInitialChallenges()) } as Parameters<typeof writeSave>[0]);
    }
    toast("Défi activé — bonne chance !", "success");
  }

  if (!player || !career || !save) {
    return (
      <div className="fc-page">
        <p style={{ color: "var(--fc-text-3)", textAlign: "center", paddingTop: "var(--fc-space-8)" }}>
          Chargement…
        </p>
      </div>
    );
  }

  return (
    <motion.div className="fc-page" variants={pageFade} initial="hidden" animate="visible">
      {/* En-tête */}
      <div className="fc-section-header">
        <h1 className="fc-section-title">Défis de carrière</h1>
        <span className="fc-badge fc-badge--neutral">{stats.completed}/{stats.total}</span>
      </div>

      {/* Stats globales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--fc-space-3)" }}>
        {[
          { label: "Complétés", value: stats.completed, color: "var(--fc-emerald)" },
          { label: "En cours",  value: stats.active,    color: "var(--fc-amber)" },
          { label: "Total",     value: stats.total,     color: "var(--fc-text)" },
        ].map(s => (
          <div key={s.label} className="fc-card" style={{ textAlign: "center", padding: "var(--fc-space-4)" }}>
            <div style={{ fontFamily: "var(--fc-font-display)", fontWeight: 900, fontSize: "1.8rem", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: "var(--fc-space-2)", flexWrap: "wrap" }}>
        {(["all", "available", "active", "completed"] as const).map(f => (
          <button
            key={f}
            className={`fc-btn ${filter === f ? "fc-btn--primary" : "fc-btn--secondary"}`}
            style={{ padding: "4px 12px", fontSize: "var(--fc-text-xs)" }}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Tous" : statusLabel(f)}
          </button>
        ))}
      </div>

      {/* Liste des défis */}
      <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
        {filtered.length === 0 && (
          <p style={{ color: "var(--fc-text-3)", textAlign: "center", padding: "var(--fc-space-6)" }}>
            Aucun défi dans cette catégorie.
          </p>
        )}
        {filtered.map(c => (
          <ChallengeCard key={c.id} challenge={c} onActivate={handleActivate} />
        ))}
      </motion.div>
    </motion.div>
  );
}

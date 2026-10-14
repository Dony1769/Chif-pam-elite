"use client";

/**
 * FC CAREER — Vestiaire
 * Cohésion, relations, leadership, ambiance de l'équipe.
 */

import { motion } from "framer-motion";
import { useGame } from "../game/hooks/useGame";
import { Spinner } from "../game/components/LoadingState";
import { selectPlayer, selectIsLoading } from "../game/state/selectors";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import { createInitialLockerRoom, leadershipRoleLabel, cohesionPerformanceBonus } from "../game/domain/lockerRoom";
import type { LockerRoomState, RelationshipType, LeadershipRole } from "../game/domain/lockerRoom";
import type { GameSaveV1 } from "../game/persistence/saveSchema";

/* ── Utils ───────────────────────────────────────────────────────── */

const ATMOSPHERE_CONFIG = {
  excellent: { label: "Excellente", color: "var(--fc-emerald)", bg: "rgba(16,185,129,0.1)", emoji: "🔥" },
  positive:  { label: "Positive",   color: "var(--fc-emerald)", bg: "rgba(16,185,129,0.07)", emoji: "😊" },
  neutral:   { label: "Neutre",     color: "var(--fc-text-2)",  bg: "var(--fc-surface-3)",   emoji: "😐" },
  tense:     { label: "Tendue",     color: "var(--fc-amber)",   bg: "rgba(245,158,11,0.1)",  emoji: "😤" },
  toxic:     { label: "Toxique",    color: "var(--fc-red)",     bg: "rgba(239,68,68,0.1)",   emoji: "💀" },
} as const;

const RELATIONSHIP_CONFIG: Record<RelationshipType, { label: string; color: string; emoji: string }> = {
  ally:     { label: "Allié",      color: "var(--fc-emerald)", emoji: "🤝" },
  mentor:   { label: "Mentor",     color: "var(--fc-blue)",    emoji: "🎓" },
  protege:  { label: "Protégé",    color: "var(--fc-blue)",    emoji: "🌱" },
  rival:    { label: "Rival",      color: "var(--fc-amber)",   emoji: "⚔️" },
  neutral:  { label: "Neutre",     color: "var(--fc-text-3)",  emoji: "🤷" },
  tension:  { label: "Tension",    color: "var(--fc-red)",     emoji: "❄️" },
};

const LEADERSHIP_EMOJI: Record<LeadershipRole, string> = {
  none: "👤",
  veteran: "🎖️",
  vocal: "📢",
  vice_captain: "🔷",
  captain: "⭐",
};

function CohesionBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 65 ? "var(--fc-emerald)" : pct >= 40 ? "var(--fc-amber)" : "var(--fc-red)";
  return (
    <div style={{
      height: 8, background: "var(--fc-surface-3)", borderRadius: 99,
      overflow: "hidden", width: "100%",
    }}>
      <div style={{
        height: "100%", width: `${pct}%`, background: color,
        borderRadius: 99, transition: "width 0.4s ease",
      }} />
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────────────── */

export default function LockerRoomPage() {
  const { state } = useGame();
  const isLoading = selectIsLoading(state);
  const player    = selectPlayer(state);

  if (isLoading) return <Spinner />;

  const save = state.save as GameSaveV1 & { lockerRoom?: LockerRoomState };
  const lr: LockerRoomState = save?.lockerRoom ?? createInitialLockerRoom();
  const atmCfg = ATMOSPHERE_CONFIG[lr.atmosphere];
  const perfBonus = cohesionPerformanceBonus(lr.teamCohesion);

  return (
    <motion.div
      variants={pageFade} initial="hidden" animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 720, margin: "0 auto" }}
    >
      {/* Header */}
      <div className="fc-page-header">
        <h1 className="fc-page-title">Vestiaire</h1>
        <p className="fc-page-meta">
          Cohésion · Relations · Leadership
        </p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Ambiance & Cohésion ──────────────────────────────────── */}
        <motion.section variants={itemFade} className="fc-panel" style={{ marginBottom: "var(--fc-space-4)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--fc-space-3)" }}>
            <div>
              <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", margin: 0 }}>
                Ambiance
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-2)", marginTop: "var(--fc-space-1)" }}>
                <span style={{ fontSize: "1.2rem" }}>{atmCfg.emoji}</span>
                <span style={{ fontSize: "var(--fc-text-base)", fontWeight: 700, color: atmCfg.color }}>
                  {atmCfg.label}
                </span>
              </div>
            </div>
            <div style={{
              padding: "4px 10px",
              borderRadius: 99,
              background: perfBonus > 0 ? "rgba(16,185,129,0.1)"
                : perfBonus < 0 ? "rgba(239,68,68,0.1)"
                : "var(--fc-surface-3)",
              color: perfBonus > 0 ? "var(--fc-emerald)"
                : perfBonus < 0 ? "var(--fc-red)"
                : "var(--fc-text-3)",
              fontSize: "var(--fc-text-xs)", fontWeight: 700,
            }}>
              {perfBonus > 0 ? `+${perfBonus}` : perfBonus} OVR effectif
            </div>
          </div>

          <div style={{ marginBottom: "var(--fc-space-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--fc-space-1)" }}>
              <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Cohésion</span>
              <span style={{ fontSize: "var(--fc-text-xs)", fontWeight: 700, color: "var(--fc-text)" }}>
                {Math.round(lr.teamCohesion)}/100
              </span>
            </div>
            <CohesionBar value={lr.teamCohesion} />
          </div>

          <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0 }}>
            Une cohésion élevée améliore les performances de toute l'équipe. Gagnez des matchs et évitez les dramas pour la maintenir.
          </p>
        </motion.section>

        {/* ── Leadership ───────────────────────────────────────────── */}
        <motion.section variants={itemFade} className="fc-panel" style={{ marginBottom: "var(--fc-space-4)" }}>
          <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
            Rôle dans le vestiaire
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-3)", marginBottom: "var(--fc-space-3)" }}>
            <span style={{ fontSize: "1.6rem" }}>{LEADERSHIP_EMOJI[lr.leadershipRole]}</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
                {leadershipRoleLabel(lr.leadershipRole)}
              </p>
              <p style={{ margin: 0, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2 }}>
                {lr.leadershipPoints} pts de leadership
              </p>
            </div>
          </div>

          {/* Progression leadership */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--fc-space-1)" }}>
              <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Progression</span>
              <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
                {lr.leadershipPoints}/200 pts
              </span>
            </div>
            <div style={{ height: 6, background: "var(--fc-surface-3)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(lr.leadershipPoints / 200) * 100}%`,
                background: "linear-gradient(90deg, var(--fc-blue), var(--fc-emerald))",
                borderRadius: 99,
              }} />
            </div>
          </div>

          {/* Paliers */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
            gap: "var(--fc-space-1)", marginTop: "var(--fc-space-3)",
          }}>
            {[
              { label: "Joueur", pts: 0,   role: "none" as LeadershipRole },
              { label: "Vétéran", pts: 30,  role: "veteran" as LeadershipRole },
              { label: "Leader",  pts: 60,  role: "vocal" as LeadershipRole },
              { label: "Vice",    pts: 100, role: "vice_captain" as LeadershipRole },
              { label: "Capitaine", pts: 150, role: "captain" as LeadershipRole },
            ].map(tier => {
              const reached = lr.leadershipPoints >= tier.pts;
              return (
                <div key={tier.role} style={{
                  textAlign: "center", padding: "var(--fc-space-1)",
                  borderRadius: "var(--fc-radius-sm)",
                  background: reached ? "rgba(16,185,129,0.1)" : "var(--fc-surface-3)",
                  border: `1px solid ${reached ? "rgba(16,185,129,0.3)" : "var(--fc-border)"}`,
                }}>
                  <div style={{ fontSize: "1rem" }}>{LEADERSHIP_EMOJI[tier.role]}</div>
                  <p style={{
                    margin: 0, fontSize: 9, fontWeight: 600,
                    color: reached ? "var(--fc-emerald)" : "var(--fc-text-3)",
                  }}>
                    {tier.label}
                  </p>
                  <p style={{ margin: 0, fontSize: 9, color: "var(--fc-text-3)" }}>{tier.pts}pts</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* ── Événements récents ───────────────────────────────────── */}
        {lr.recentEvents.length > 0 && (
          <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
            <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
              Événements récents
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {lr.recentEvents.map(ev => {
                const isPos = ev.cohesionDelta > 0;
                const isNeg = ev.cohesionDelta < 0;
                return (
                  <div key={ev.id} style={{
                    padding: "var(--fc-space-3)",
                    background: isPos ? "rgba(16,185,129,0.05)" : isNeg ? "rgba(239,68,68,0.05)" : "var(--fc-surface-2)",
                    borderRadius: "var(--fc-radius)",
                    borderLeft: `3px solid ${isPos ? "var(--fc-emerald)" : isNeg ? "var(--fc-red)" : "var(--fc-border)"}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--fc-text-xs)", color: "var(--fc-text)" }}>
                        {ev.title}
                      </p>
                      <span style={{
                        fontSize: "var(--fc-text-xs)", fontWeight: 700,
                        color: isPos ? "var(--fc-emerald)" : isNeg ? "var(--fc-red)" : "var(--fc-text-3)",
                      }}>
                        {isPos ? "+" : ""}{ev.cohesionDelta} cohésion
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)", lineHeight: 1.4 }}>
                      {ev.description}
                    </p>
                    <p style={{ margin: 0, marginTop: 4, fontSize: 10, color: "var(--fc-text-3)" }}>
                      S{ev.season} · Semaine {ev.week}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ── Relations ────────────────────────────────────────────── */}
        <motion.section variants={itemFade}>
          <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
            Relations ({lr.relationships.length})
          </h2>

          {lr.relationships.length === 0 ? (
            <div style={{
              padding: "var(--fc-space-8)", textAlign: "center",
              background: "var(--fc-surface-2)", borderRadius: "var(--fc-radius)",
              border: "1px solid var(--fc-border)",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "var(--fc-space-2)" }}>🤝</div>
              <p style={{ color: "var(--fc-text-2)", margin: 0, fontSize: "var(--fc-text-sm)" }}>
                Tes relations avec les coéquipiers se forgeront au fil des saisons.
              </p>
              <p style={{ color: "var(--fc-text-3)", margin: 0, marginTop: "var(--fc-space-2)", fontSize: "var(--fc-text-xs)" }}>
                Joue des matchs, gagne des titres — le vestiaire se construira naturellement.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {lr.relationships
                .sort((a, b) => b.intensity - a.intensity)
                .map(rel => {
                  const cfg = RELATIONSHIP_CONFIG[rel.type];
                  return (
                    <div key={rel.teammateId} style={{
                      padding: "var(--fc-space-3) var(--fc-space-4)",
                      background: "var(--fc-surface-2)",
                      borderRadius: "var(--fc-radius)",
                      border: "1px solid var(--fc-border)",
                      display: "flex", alignItems: "flex-start", gap: "var(--fc-space-3)",
                    }}>
                      <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{cfg.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
                            {rel.teammateName}
                          </p>
                          <span style={{
                            padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                            background: `color-mix(in srgb, ${cfg.color} 15%, transparent)`,
                            color: cfg.color,
                          }}>
                            {cfg.label}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)", lineHeight: 1.4 }}>
                          {rel.story}
                        </p>
                        <div style={{ marginTop: 6 }}>
                          <div style={{ height: 3, background: "var(--fc-surface-3)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${rel.intensity}%`,
                              background: cfg.color, borderRadius: 99,
                            }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </motion.section>

      </motion.div>

      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}

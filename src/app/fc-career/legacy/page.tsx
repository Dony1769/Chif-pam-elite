"use client";

/**
 * FC CAREER — Héritage
 * Bilan de carrière, records, trophées, réputation, retraite.
 */

import { motion } from "framer-motion";
import { useGame } from "../game/hooks/useGame";
import { Spinner } from "../game/components/LoadingState";
import { selectPlayer, selectCareer, selectIsLoading } from "../game/state/selectors";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import {
  computeCareerLegacy,
  LEGACY_TIER_LABELS,
  LEGACY_TIER_COLORS,
  shouldSuggestRetirement,
  type LegacyTier,
} from "../game/domain/legacy";

/* ── Composants ──────────────────────────────────────────────────── */

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      padding: "var(--fc-space-3)",
      background: "var(--fc-surface-2)",
      borderRadius: "var(--fc-radius)",
      border: "1px solid var(--fc-border)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "1.5rem", marginBottom: "var(--fc-space-1)" }}>{icon}</div>
      <p style={{ margin: 0, fontSize: "var(--fc-text-lg)", fontWeight: 800, color: "var(--fc-text)" }}>
        {value}
      </p>
      {sub && <p style={{ margin: 0, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{sub}</p>}
      <p style={{ margin: 0, marginTop: 2, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)" }}>
        {label}
      </p>
    </div>
  );
}

function ReputationMeter({ score, tier }: { score: number; tier: LegacyTier }) {
  const color = LEGACY_TIER_COLORS[tier];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--fc-space-1)" }}>
        <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Score de réputation</span>
        <span style={{ fontSize: "var(--fc-text-xs)", fontWeight: 700, color }}>
          {score}/100
        </span>
      </div>
      <div style={{ height: 8, background: "var(--fc-surface-3)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${score}%`,
          background: `linear-gradient(90deg, var(--fc-blue), ${color})`,
          borderRadius: 99, transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────────────── */

export default function LegacyPage() {
  const { state }  = useGame();
  const isLoading  = selectIsLoading(state);
  const player     = selectPlayer(state);
  const career     = selectCareer(state);

  if (isLoading) return <Spinner />;
  if (!player || !career) return <Spinner />;

  const legacy = computeCareerLegacy(player, career as Parameters<typeof computeCareerLegacy>[1]);
  const retirementCheck = shouldSuggestRetirement(player, career as Parameters<typeof shouldSuggestRetirement>[1]);
  const tierColor = LEGACY_TIER_COLORS[legacy.tier];
  const tierLabel = LEGACY_TIER_LABELS[legacy.tier];

  return (
    <motion.div
      variants={pageFade} initial="hidden" animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 720, margin: "0 auto" }}
    >
      {/* Header */}
      <div className="fc-page-header">
        <h1 className="fc-page-title">Héritage</h1>
        <p className="fc-page-meta">Bilan de carrière · Réputation · Retraite</p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Carte de réputation ──────────────────────────────────── */}
        <motion.section variants={itemFade} className="fc-panel" style={{ marginBottom: "var(--fc-space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-3)", marginBottom: "var(--fc-space-4)" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: `radial-gradient(circle at 35% 35%, color-mix(in srgb, ${tierColor} 30%, var(--fc-surface-2)), var(--fc-surface-3))`,
              border: `2px solid ${tierColor}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.4rem", flexShrink: 0,
            }}>
              {legacy.tier === "legend" ? "👑"
                : legacy.tier === "great" ? "⭐"
                : legacy.tier === "very_good" ? "🔷"
                : legacy.tier === "good" ? "🏅"
                : "🎖️"}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "var(--fc-text-lg)", fontWeight: 800, color: tierColor }}>
                {tierLabel}
              </p>
              <p style={{ margin: 0, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2 }}>
                {player.firstName} {player.lastName} · {player.age} ans · {player.position}
              </p>
            </div>
          </div>

          <ReputationMeter score={legacy.reputationScore} tier={legacy.tier} />

          <div style={{
            marginTop: "var(--fc-space-3)",
            padding: "var(--fc-space-3)",
            background: "var(--fc-surface-3)",
            borderRadius: "var(--fc-radius-sm)",
            fontSize: "var(--fc-text-xs)",
            color: "var(--fc-text-2)",
            lineHeight: 1.6,
            fontStyle: "italic",
          }}>
            "{legacy.narrativeSummary}"
          </div>
        </motion.section>

        {/* ── Statistiques clés ────────────────────────────────────── */}
        <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
            Statistiques de carrière
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--fc-space-2)" }}>
            <StatCard icon="📅" label="Matchs" value={legacy.stats.totalMatches} />
            <StatCard icon="⚽" label="Buts" value={legacy.stats.totalGoals} />
            <StatCard icon="🎯" label="Passes D." value={legacy.stats.totalAssists} />
            <StatCard icon="⭐" label="Note moy." value={legacy.stats.averageRating > 0 ? legacy.stats.averageRating.toFixed(1) : "—"} />
            <StatCard icon="📈" label="OVR max" value={legacy.peakOverall} />
            <StatCard icon="🏟️" label="Saisons" value={legacy.seasonsPlayed} />
          </div>
        </motion.section>

        {/* ── Trophées ─────────────────────────────────────────────── */}
        <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
            Palmarès ({legacy.trophies.length})
          </h2>
          {legacy.trophies.length === 0 ? (
            <div style={{
              padding: "var(--fc-space-6)", textAlign: "center",
              background: "var(--fc-surface-2)", borderRadius: "var(--fc-radius)",
              border: "1px solid var(--fc-border)",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "var(--fc-space-2)" }}>🏆</div>
              <p style={{ color: "var(--fc-text-2)", margin: 0, fontSize: "var(--fc-text-sm)" }}>
                Ton palmarès s'écrira au fil des saisons.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {legacy.trophies
                .sort((a, b) => {
                  const tierOrder = { major: 0, minor: 1, individual: 2 };
                  return tierOrder[a.tier] - tierOrder[b.tier];
                })
                .map(trophy => (
                  <div key={trophy.id} style={{
                    padding: "var(--fc-space-3) var(--fc-space-4)",
                    background: trophy.tier === "major"
                      ? "rgba(245,158,11,0.08)"
                      : "var(--fc-surface-2)",
                    borderRadius: "var(--fc-radius)",
                    border: `1px solid ${trophy.tier === "major" ? "rgba(245,158,11,0.3)" : "var(--fc-border)"}`,
                    display: "flex", alignItems: "center", gap: "var(--fc-space-3)",
                  }}>
                    <span style={{ fontSize: "1.4rem" }}>{trophy.icon}</span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
                        {trophy.label}
                      </p>
                      <p style={{ margin: 0, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
                        {trophy.tier === "major" ? "Titre majeur"
                          : trophy.tier === "individual" ? "Récompense individuelle"
                          : "Trophée"}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </motion.section>

        {/* ── Records ──────────────────────────────────────────────── */}
        {legacy.records.length > 0 && (
          <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
            <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
              Records personnels
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--fc-space-2)" }}>
              {legacy.records.map(rec => (
                <div key={rec.id} style={{
                  padding: "var(--fc-space-3)",
                  background: "var(--fc-surface-2)",
                  borderRadius: "var(--fc-radius)",
                  border: "1px solid var(--fc-border)",
                  display: "flex", alignItems: "center", gap: "var(--fc-space-2)",
                }}>
                  <span style={{ fontSize: "1.2rem" }}>{rec.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
                      {rec.value} <span style={{ fontWeight: 400, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{rec.unit}</span>
                    </p>
                    <p style={{ margin: 0, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)" }}>{rec.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Suggestion retraite ──────────────────────────────────── */}
        {retirementCheck.suggest && (
          <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
            <div style={{
              padding: "var(--fc-space-4)",
              background: "rgba(245,158,11,0.08)",
              borderRadius: "var(--fc-radius)",
              border: "1px solid rgba(245,158,11,0.3)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-2)", marginBottom: "var(--fc-space-2)" }}>
                <span style={{ fontSize: "1.2rem" }}>🎖️</span>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-amber)" }}>
                  L'heure de la retraite ?
                </p>
              </div>
              <p style={{ margin: 0, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)", lineHeight: 1.5 }}>
                {retirementCheck.reason}
              </p>
              <p style={{ margin: 0, marginTop: "var(--fc-space-2)", fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
                Continue à jouer ou mets fin à ta carrière via les Paramètres → Fin de carrière.
              </p>
            </div>
          </motion.section>
        )}

        {/* ── Trajectoire de carrière ──────────────────────────────── */}
        {player.progressionHistory.length > 0 && (
          <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
            <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
              Trajectoire OVR
            </h2>
            <div className="fc-panel" style={{ padding: "var(--fc-space-3)" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
                {player.progressionHistory.map((entry, idx) => {
                  const maxOvr = Math.max(...player.progressionHistory.map(h => h.overall), player.overall);
                  const minOvr = Math.min(...player.progressionHistory.map(h => h.overall));
                  const range = maxOvr - minOvr || 1;
                  const heightPct = ((entry.overall - minOvr) / range) * 70 + 15;
                  const isLast = idx === player.progressionHistory.length - 1;
                  return (
                    <div
                      key={entry.season}
                      style={{
                        flex: 1, display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 2,
                      }}
                    >
                      <span style={{ fontSize: 8, color: "var(--fc-text-3)" }}>{entry.overall}</span>
                      <div style={{
                        width: "100%", height: `${heightPct}%`,
                        background: isLast ? "var(--fc-emerald)" : "var(--fc-blue)",
                        borderRadius: "3px 3px 0 0", minHeight: 4,
                        opacity: isLast ? 1 : 0.6,
                      }} />
                      <span style={{ fontSize: 8, color: "var(--fc-text-3)" }}>S{entry.season}</span>
                    </div>
                  );
                })}
                {/* Saison actuelle */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 8, color: "var(--fc-emerald)", fontWeight: 700 }}>{player.overall}</span>
                  <div style={{
                    width: "100%",
                    height: (() => {
                      const allOvr = player.progressionHistory.map(h => h.overall);
                      const max = Math.max(...allOvr, player.overall);
                      const min = Math.min(...allOvr);
                      const range = max - min || 1;
                      return `${((player.overall - min) / range) * 70 + 15}%`;
                    })(),
                    background: "var(--fc-emerald)",
                    borderRadius: "3px 3px 0 0", minHeight: 4,
                  }} />
                  <span style={{ fontSize: 8, color: "var(--fc-emerald)", fontWeight: 700 }}>Now</span>
                </div>
              </div>
            </div>
          </motion.section>
        )}

      </motion.div>

      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}

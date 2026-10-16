"use client";

/**
 * FC CAREER — Récompenses & Records
 * Trophées, distinctions, records personnels.
 */

import { motion } from "framer-motion";
import { useGame }  from "../game/hooks/useGame";
import { Spinner }  from "../game/components/LoadingState";
import { selectIsLoading, selectPlayer, selectCareer } from "../game/state/selectors";
import { pageFade, stagger, itemFade } from "../game/design/animations";

export default function AwardsPage() {
  const { state } = useGame();
  const isLoading = selectIsLoading(state);
  const player    = selectPlayer(state);
  const career    = selectCareer(state);

  if (isLoading) return <Spinner />;
  if (!state.save || !player || !career) return null;

  const awards = state.save.awards ?? [];

  // Statistiques de carrière
  const stats = player.stats;
  const currentSeasonStats = stats.seasons.find(s => s.season === career.season);

  const records = [
    { label: "Buts (carrière)", value: stats.totalGoals, icon: "⚽", color: "var(--fc-emerald)" },
    { label: "Passes déc. (carrière)", value: stats.totalAssists, icon: "🎯", color: "var(--fc-amber)" },
    { label: "Matchs joués", value: stats.totalAppearances, icon: "📋", color: "var(--fc-text-2)" },
    { label: "Buts (saison)", value: currentSeasonStats?.goals ?? 0, icon: "🔥", color: "var(--fc-coral)" },
    { label: "Passes déc. (saison)", value: currentSeasonStats?.assists ?? 0, icon: "✨", color: "var(--fc-amber)" },
    { label: "Note moy. (saison)", value: currentSeasonStats?.avgRating?.toFixed(1) ?? "—", icon: "⭐", color: "var(--fc-emerald)" },
  ];

  const awardsByCategory: Record<string, typeof awards> = {};
  for (const award of awards) {
    const cat = award.icon;
    if (!awardsByCategory[cat]) awardsByCategory[cat] = [];
    awardsByCategory[cat].push(award);
  }

  return (
    <motion.div
      variants={pageFade} initial="hidden" animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 680, margin: "0 auto" }}
    >
      <div className="fc-page-header">
        <h1 className="fc-page-title">Récompenses</h1>
        <p className="fc-page-meta">
          {awards.length} trophée{awards.length !== 1 ? "s" : ""} · Saison {career.season}
        </p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Records personnels ─────────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <p className="fc-panel__label">RECORDS PERSONNELS</p>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "var(--fc-space-2)", marginTop: "var(--fc-space-2)",
          }}>
            {records.map(r => (
              <div key={r.label} style={{
                padding: "var(--fc-space-3)",
                borderRadius: "var(--fc-radius-sm)",
                background: "var(--fc-surface-2)",
                border: "1px solid var(--fc-border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-1)", marginBottom: 4 }}>
                  <span style={{ fontSize: "0.9rem" }}>{r.icon}</span>
                  <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{r.label}</span>
                </div>
                <p style={{
                  fontFamily: "var(--fc-font-display)", fontWeight: 900,
                  fontSize: "var(--fc-text-xl)", color: r.color, margin: 0,
                }}>
                  {r.value}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Trophées ─────────────────────────────────────────────── */}
        {awards.length > 0 ? (
          <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
            <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-2)" }}>
              Palmarès
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {awards.map(award => (
                <div key={award.id} style={{
                  padding: "var(--fc-space-3)",
                  borderRadius: "var(--fc-radius-sm)",
                  border: "1px solid rgba(245,189,88,0.4)",
                  background: "rgba(245,189,88,0.08)",
                  display: "flex", alignItems: "center", gap: "var(--fc-space-3)",
                }}>
                  <span style={{ fontSize: "1.8rem", flexShrink: 0 }}>{award.icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)", margin: 0 }}>
                      {award.label}
                    </p>
                    <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0, marginTop: 2 }}>
                      Saison {award.season}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        ) : (
          <motion.div variants={itemFade} style={{
            textAlign: "center", padding: "var(--fc-space-6)",
            color: "var(--fc-text-3)", marginBottom: "var(--fc-space-4)",
          }}>
            <p style={{ fontSize: "2rem" }}>🏆</p>
            <p style={{ fontSize: "var(--fc-text-sm)" }}>Aucun trophée pour le moment.</p>
            <p style={{ fontSize: "var(--fc-text-xs)", marginTop: 4 }}>
              Performe en match, remporte des championnats et atteins des jalons pour débloquer des récompenses.
            </p>
          </motion.div>
        )}

        {/* ── Prochains objectifs ─────────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade}>
          <p className="fc-panel__label">PROCHAINS JALONS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)", marginTop: "var(--fc-space-2)" }}>
            {[
              {
                label: "Premier but en championnat",
                done: stats.totalGoals >= 1,
                icon: "⚽",
              },
              {
                label: "10 buts en carrière",
                done: stats.totalGoals >= 10,
                icon: "🎯",
              },
              {
                label: "50 matchs joués",
                done: stats.totalAppearances >= 50,
                icon: "📋",
              },
              {
                label: "Note moyenne > 7.5 (saison)",
                done: (currentSeasonStats?.avgRating ?? 0) > 7.5,
                icon: "⭐",
              },
            ].map(obj => (
              <div key={obj.label} style={{
                display: "flex", alignItems: "center", gap: "var(--fc-space-3)",
                padding: "var(--fc-space-2)",
                opacity: obj.done ? 0.5 : 1,
              }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>{obj.icon}</span>
                <span style={{ flex: 1, fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)" }}>
                  {obj.label}
                </span>
                <span style={{
                  fontSize: "var(--fc-text-sm)",
                  color: obj.done ? "var(--fc-emerald)" : "var(--fc-text-3)",
                }}>
                  {obj.done ? "✓" : "○"}
                </span>
              </div>
            ))}
          </div>
        </motion.section>

      </motion.div>
      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}

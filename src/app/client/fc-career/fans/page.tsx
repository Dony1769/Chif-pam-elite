"use client";

/**
 * FC CAREER — Fans & Popularité
 * Cote de popularité, soutien des supporters, événements.
 */

import { motion } from "framer-motion";
import { useGame }  from "../game/hooks/useGame";
import { Spinner }  from "../game/components/LoadingState";
import { selectIsLoading, selectPlayer, selectCareer } from "../game/state/selectors";
import { pageFade, stagger, itemFade } from "../game/design/animations";

export default function FansPage() {
  const { state } = useGame();
  const isLoading = selectIsLoading(state);
  const player    = selectPlayer(state);
  const career    = selectCareer(state);

  if (isLoading) return <Spinner />;
  if (!state.save || !player || !career) return null;

  const fans = state.save.fans ?? {
    fanRating: 30,
    followers: 1200,
    events: [],
  };

  const rating = fans.fanRating;
  const followers = fans.followers;

  const fanTitle =
    rating >= 85 ? "Légende vivante" :
    rating >= 70 ? "Idol des tribunes" :
    rating >= 50 ? "Chouchou des fans" :
    rating >= 30 ? "Joueur apprécié" :
    "Peu connu";

  const fanColor =
    rating >= 70 ? "var(--fc-emerald)" :
    rating >= 40 ? "var(--fc-amber)" :
    "var(--fc-text-3)";

  const recentEvents = (fans.events ?? []).slice(-5).reverse();

  const eventIcon: Record<string, string> = {
    match_win: "⚽",
    goal: "🎯",
    transfer: "✈️",
    award: "🏆",
    scandal: "⚠️",
  };

  const formatFollowers = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(0)}k` :
    String(n);

  return (
    <motion.div
      variants={pageFade} initial="hidden" animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 680, margin: "0 auto" }}
    >
      <div className="fc-page-header">
        <h1 className="fc-page-title">Fans</h1>
        <p className="fc-page-meta">Saison {career.season} · Popularité</p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Cote de popularité ──────────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <p className="fc-panel__label">POPULARITÉ</p>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-4)", marginTop: "var(--fc-space-2)" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              border: `3px solid ${fanColor}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--fc-surface-3)", flexShrink: 0,
            }}>
              <span style={{ fontSize: "1.6rem" }}>⭐</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, color: fanColor, fontSize: "var(--fc-text-base)", margin: 0 }}>{fanTitle}</p>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0, marginTop: 2 }}>
                {rating}/100 · {formatFollowers(followers)} abonnés
              </p>
              {/* Barre */}
              <div style={{
                marginTop: "var(--fc-space-2)", height: 5, borderRadius: 3,
                background: "var(--fc-surface-3)", overflow: "hidden",
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rating}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ height: "100%", background: fanColor, borderRadius: 3 }}
                />
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Métriques ─────────────────────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <p className="fc-panel__label">MÉTRIQUES</p>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: "var(--fc-space-2)", marginTop: "var(--fc-space-2)",
          }}>
            {[
              { label: "Cote fans", value: `${rating}/100`, color: fanColor },
              { label: "Abonnés", value: formatFollowers(followers), color: "var(--fc-text)" },
              { label: "Événements", value: String(fans.events?.length ?? 0), color: "var(--fc-text)" },
            ].map(m => (
              <div key={m.label} style={{
                textAlign: "center", padding: "var(--fc-space-2)",
                borderRadius: "var(--fc-radius-sm)", background: "var(--fc-surface-2)",
                border: "1px solid var(--fc-border)",
              }}>
                <p style={{
                  fontFamily: "var(--fc-font-display)", fontWeight: 900,
                  fontSize: "var(--fc-text-base)", color: m.color, margin: 0,
                }}>
                  {m.value}
                </p>
                <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0, marginTop: 2 }}>{m.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Comment progresser ─────────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <p className="fc-panel__label">COMMENT GAGNER DES FANS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-1)", marginTop: "var(--fc-space-2)" }}>
            {[
              { icon: "⚽", text: "Marquer des buts importants" },
              { icon: "🏆", text: "Remporter des trophées" },
              { icon: "🎤", text: "Donner des conférences de presse positives" },
              { icon: "📈", text: "Progresser dans le classement" },
              { icon: "🌍", text: "Être sélectionné en équipe nationale" },
            ].map(tip => (
              <div key={tip.text} style={{
                display: "flex", alignItems: "center", gap: "var(--fc-space-2)",
                padding: "var(--fc-space-2) 0",
                borderBottom: "1px solid var(--fc-border)",
              }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>{tip.icon}</span>
                <span style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)" }}>{tip.text}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Événements récents ─────────────────────────────────── */}
        {recentEvents.length > 0 && (
          <motion.section variants={itemFade}>
            <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-2)" }}>
              Événements récents
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-1)" }}>
              {recentEvents.map(ev => (
                <div key={ev.id} style={{
                  padding: "var(--fc-space-2) var(--fc-space-3)",
                  borderRadius: "var(--fc-radius-sm)",
                  border: "1px solid var(--fc-border)",
                  background: "var(--fc-surface-2)",
                  display: "flex", alignItems: "center", gap: "var(--fc-space-2)",
                }}>
                  <span style={{ fontSize: "1rem", flexShrink: 0 }}>{eventIcon[ev.type] ?? "📋"}</span>
                  <span style={{ flex: 1, fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)" }}>{ev.label}</span>
                  <span style={{
                    fontSize: "var(--fc-text-xs)", fontWeight: 700,
                    color: ev.impact > 0 ? "var(--fc-emerald)" : ev.impact < 0 ? "var(--fc-coral)" : "var(--fc-text-3)",
                  }}>
                    {ev.impact > 0 ? `+${ev.impact}` : ev.impact}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {recentEvents.length === 0 && (
          <motion.div variants={itemFade} style={{ textAlign: "center", padding: "var(--fc-space-6)", color: "var(--fc-text-3)" }}>
            <p style={{ fontSize: "2rem" }}>👥</p>
            <p style={{ fontSize: "var(--fc-text-sm)" }}>Aucun événement fan pour le moment.</p>
            <p style={{ fontSize: "var(--fc-text-xs)" }}>Joue des matchs et performe pour développer ta base de fans.</p>
          </motion.div>
        )}

      </motion.div>
      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}

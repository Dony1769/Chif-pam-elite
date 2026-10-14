"use client";

/**
 * FC CAREER — Sélection nationale
 * Convocations, statistiques nationales, compétitions.
 */

import { motion } from "framer-motion";
import { useGame }  from "../game/hooks/useGame";
import { Spinner }  from "../game/components/LoadingState";
import { selectIsLoading, selectPlayer, selectCareer } from "../game/state/selectors";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import { COUNTRIES } from "../game/data/world";

export default function NationalPage() {
  const { state } = useGame();
  const isLoading = selectIsLoading(state);
  const player    = selectPlayer(state);
  const career    = selectCareer(state);

  if (isLoading) return <Spinner />;
  if (!state.save || !player || !career) return null;

  const national = state.save.nationalTeam ?? {
    called: false,
    caps: 0,
    goals: 0,
    lastCallSeason: null,
  };

  const country = COUNTRIES.find(c => c.id === player.nationality) ?? COUNTRIES[0];

  // Critères de convocation
  const overall       = player.overall;
  const season        = career.season;
  const eligibleBase  = overall >= 72;
  const calledThisYear = national.lastCallSeason === season;

  const statusLabel = national.called
    ? "International"
    : eligibleBase
    ? "Sur la liste de surveillance"
    : "Non retenu";

  const statusColor = national.called
    ? "var(--fc-emerald)"
    : eligibleBase
    ? "var(--fc-amber)"
    : "var(--fc-text-3)";

  return (
    <motion.div
      variants={pageFade} initial="hidden" animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 680, margin: "0 auto" }}
    >
      <div className="fc-page-header">
        <h1 className="fc-page-title">Sélection nationale</h1>
        <p className="fc-page-meta">{country.flag} {country.name}</p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Statut national ─────────────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <p className="fc-panel__label">STATUT</p>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-3)", marginTop: "var(--fc-space-2)" }}>
            <span style={{ fontSize: "2rem" }}>{country.flag}</span>
            <div>
              <p style={{ fontWeight: 700, color: statusColor, fontSize: "var(--fc-text-base)", margin: 0 }}>
                {statusLabel}
              </p>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0, marginTop: 2 }}>
                Note globale : {overall} / 99
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── Statistiques nationales ─────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <p className="fc-panel__label">STATISTIQUES NATIONALES</p>
          <div style={{ display: "flex", gap: "var(--fc-space-4)", marginTop: "var(--fc-space-3)", flexWrap: "wrap" }}>
            {[
              { label: "Sélections", value: national.caps, icon: "🌍" },
              { label: "Buts", value: national.goals, icon: "⚽" },
              { label: "Dernière conv.", value: national.lastCallSeason ? `S${national.lastCallSeason}` : "—", icon: "📅" },
            ].map(stat => (
              <div key={stat.label} style={{ flex: "1 1 80px", textAlign: "center" }}>
                <p style={{ fontSize: "1.5rem", margin: 0 }}>{stat.icon}</p>
                <p style={{
                  fontFamily: "var(--fc-font-display)", fontWeight: 900,
                  fontSize: "var(--fc-text-xl)", color: "var(--fc-text)", margin: 0,
                }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Critères de sélection ───────────────────────────────── */}
        <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-2)" }}>
            Critères de convocation
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
            {[
              { label: "Note globale ≥ 72", met: overall >= 72, current: `${overall}` },
              { label: "Convoqué cette saison", met: calledThisYear, current: calledThisYear ? "Oui" : "Non" },
              { label: "International actif", met: national.called, current: national.called ? "Oui" : "Non" },
            ].map(crit => (
              <div key={crit.label} style={{
                padding: "var(--fc-space-2) var(--fc-space-3)",
                borderRadius: "var(--fc-radius-sm)",
                border: `1px solid ${crit.met ? "rgba(55,217,154,0.3)" : "var(--fc-border)"}`,
                background: crit.met ? "var(--fc-emerald-10)" : "var(--fc-surface-2)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)" }}>{crit.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-2)" }}>
                  <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{crit.current}</span>
                  <span style={{ color: crit.met ? "var(--fc-emerald)" : "var(--fc-text-3)" }}>
                    {crit.met ? "✓" : "○"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Prochain rassemblement ──────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade}>
          <p className="fc-panel__label">PROCHAIN RASSEMBLEMENT</p>
          {national.called ? (
            <div style={{ marginTop: "var(--fc-space-2)" }}>
              <p style={{ color: "var(--fc-emerald)", fontWeight: 700, fontSize: "var(--fc-text-sm)", margin: 0 }}>
                🏆 Fenêtre internationale — Semaine {career.week + 4}
              </p>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 4 }}>
                Match amical vs Nordheim ·  {country.flag} {country.name}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-3)", marginTop: "var(--fc-space-2)" }}>
              {eligibleBase
                ? "Tu es sur la liste de surveillance. Continue à performer pour être convoqué."
                : `Atteins la note 72 pour entrer dans le radar du sélectionneur. Actuellement : ${overall}.`}
            </p>
          )}
        </motion.section>

      </motion.div>
      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}

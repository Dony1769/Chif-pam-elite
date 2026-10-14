"use client";

/**
 * FC CAREER — Sélection nationale
 * Convocations, matchs internationaux, compétitions, objectifs.
 */

import { motion } from "framer-motion";
import { useGame }  from "../game/hooks/useGame";
import { Spinner }  from "../game/components/LoadingState";
import { selectIsLoading, selectPlayer, selectCareer } from "../game/state/selectors";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import {
  createInitialNationalTeam,
  nationalCallupThreshold,
  COMPETITION_LABELS,
  COMPETITION_ICONS,
  type NationalTeamState,
} from "../game/domain/nationalTeam";
import type { GameSaveV1 } from "../game/persistence/saveSchema";

const FLAGS: Record<string, string> = {
  BR:"🇧🇷", FR:"🇫🇷", ES:"🇪🇸", AR:"🇦🇷", DE:"🇩🇪",
  PT:"🇵🇹", NG:"🇳🇬", IT:"🇮🇹", HT:"🇭🇹", SN:"🇸🇳",
  CM:"🇨🇲", MA:"🇲🇦", GB:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", US:"🇺🇸", JP:"🇯🇵",
};

const NATIONALITY_NAMES: Record<string, string> = {
  BR:"Brésil", FR:"France", ES:"Espagne", AR:"Argentine", DE:"Allemagne",
  PT:"Portugal", NG:"Nigéria", IT:"Italie", HT:"Haïti", SN:"Sénégal",
  CM:"Cameroun", MA:"Maroc", GB:"Angleterre", US:"États-Unis", JP:"Japon",
};

export default function NationalPage() {
  const { state } = useGame();
  const isLoading = selectIsLoading(state);
  const player    = selectPlayer(state);
  const career    = selectCareer(state);

  if (isLoading) return <Spinner />;
  if (!state.save || !player || !career) return null;

  const save = state.save as GameSaveV1 & { nationalTeam?: NationalTeamState };
  const national: NationalTeamState = save.nationalTeam ?? createInitialNationalTeam();

  const natCode = player.nationality;
  const countryFlag = FLAGS[natCode] ?? "🌍";
  const countryName = NATIONALITY_NAMES[natCode] ?? natCode;
  const overall = player.overall;
  const threshold = nationalCallupThreshold(career.season);
  const eligibleBase = overall >= threshold;

  const statusLabel = national.called
    ? national.squadRank <= 5 ? "Titulaire en sélection" : "International"
    : eligibleBase
    ? "Sur la liste de surveillance"
    : "Non retenu";

  const statusColor = national.called
    ? "var(--fc-emerald)"
    : eligibleBase
    ? "var(--fc-amber)"
    : "var(--fc-text-3)";

  const avgRating = national.matches.length > 0
    ? national.matches.reduce((s, m) => s + m.playerRating, 0) / national.matches.length
    : 0;

  return (
    <motion.div
      variants={pageFade} initial="hidden" animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 680, margin: "0 auto" }}
    >
      <div className="fc-page-header">
        <h1 className="fc-page-title">Sélection nationale</h1>
        <p className="fc-page-meta">{countryFlag} {countryName}</p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Statut national ─────────────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <p className="fc-panel__label">STATUT</p>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-3)", marginTop: "var(--fc-space-2)" }}>
            <span style={{ fontSize: "2rem" }}>{countryFlag}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: statusColor, fontSize: "var(--fc-text-base)", margin: 0 }}>
                {statusLabel}
              </p>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0, marginTop: 2 }}>
                Note globale : {overall} / 99 · Seuil sélection : {threshold}
              </p>
            </div>
            {national.isNationalCaptain && (
              <span style={{ fontSize: "1.4rem" }} title="Capitaine national">🏅</span>
            )}
          </div>
        </motion.section>

        {/* ── Statistiques nationales ─────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <p className="fc-panel__label">STATISTIQUES NATIONALES</p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--fc-space-3)",
            marginTop: "var(--fc-space-3)",
          }}>
            {[
              { label: "Sélections",    value: national.caps,    icon: "🌍" },
              { label: "Buts",          value: national.goals,   icon: "⚽" },
              { label: "Passes D.",     value: national.assists, icon: "🎯" },
              { label: "Note moy.",     value: avgRating > 0 ? avgRating.toFixed(1) : "—", icon: "⭐" },
              { label: "Rang équipe",   value: national.squadRank > 0 ? `#${national.squadRank}` : "—", icon: "📊" },
              { label: "Dern. conv.",   value: national.lastCallSeason ? `S${national.lastCallSeason}` : "—", icon: "📅" },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: "1.3rem", margin: 0 }}>{stat.icon}</p>
                <p style={{
                  fontWeight: 900, fontSize: "var(--fc-text-xl)",
                  color: "var(--fc-text)", margin: 0,
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
              { label: `Note globale ≥ ${threshold}`, met: eligibleBase, current: `${overall}` },
              { label: "Âge ≤ 37 ans", met: player.age <= 37, current: `${player.age} ans` },
              { label: "Convoqué cette saison", met: national.lastCallSeason === career.season, current: national.lastCallSeason === career.season ? "Oui" : "Non" },
              { label: "International actif", met: national.called, current: national.called ? "Oui" : "Non" },
            ].map(crit => (
              <div key={crit.label} style={{
                padding: "var(--fc-space-2) var(--fc-space-3)",
                borderRadius: "var(--fc-radius-sm)",
                border: `1px solid ${crit.met ? "rgba(55,217,154,0.3)" : "var(--fc-border)"}`,
                background: crit.met ? "rgba(16,185,129,0.05)" : "var(--fc-surface-2)",
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

        {/* ── Trophées nationaux ──────────────────────────────────── */}
        {national.majorTrophies.length > 0 && (
          <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
            <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
              Palmarès international
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {national.majorTrophies.map((t, i) => (
                <div key={i} style={{
                  padding: "var(--fc-space-3) var(--fc-space-4)",
                  background: "rgba(245,158,11,0.08)",
                  borderRadius: "var(--fc-radius)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  display: "flex", alignItems: "center", gap: "var(--fc-space-3)",
                }}>
                  <span style={{ fontSize: "1.4rem" }}>{t.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
                      {t.label}
                    </p>
                    <p style={{ margin: 0, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
                      Saison {t.season}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Derniers matchs ─────────────────────────────────────── */}
        {national.matches.length > 0 && (
          <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
            <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
              Derniers matchs ({national.matches.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {national.matches.slice(0, 8).map(match => {
                const resultColor = match.result === "win" ? "var(--fc-emerald)"
                  : match.result === "loss" ? "var(--fc-red)"
                  : "var(--fc-amber)";
                const resultLabel = match.result === "win" ? "V" : match.result === "loss" ? "D" : "N";
                return (
                  <div key={match.id} style={{
                    padding: "var(--fc-space-3) var(--fc-space-4)",
                    background: "var(--fc-surface-2)",
                    borderRadius: "var(--fc-radius)",
                    border: "1px solid var(--fc-border)",
                    display: "flex", alignItems: "center", gap: "var(--fc-space-3)",
                  }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: resultColor, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 900, flexShrink: 0,
                    }}>
                      {resultLabel}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
                          {match.opponentFlag} vs {match.opponentCountry}
                        </p>
                        <span style={{ fontSize: "var(--fc-text-sm)", fontWeight: 800, color: resultColor }}>
                          {match.scoreFor}–{match.scoreAgainst}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                        <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
                          {COMPETITION_ICONS[match.competition]} {COMPETITION_LABELS[match.competition]} · S{match.season}
                        </span>
                        <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)" }}>
                          ⭐ {match.playerRating}
                          {match.playerGoals > 0 && ` · ⚽ ${match.playerGoals}`}
                          {match.playerAssists > 0 && ` · 🎯 ${match.playerAssists}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ── Statut si pas encore convoqué ─────────────────────── */}
        {!national.called && (
          <motion.section className="fc-panel" variants={itemFade}>
            <p className="fc-panel__label">OBJECTIF</p>
            <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)", marginTop: "var(--fc-space-2)" }}>
              {eligibleBase
                ? `Tu es dans le radar du sélectionneur (${overall} OVR ≥ ${threshold}). Maintiens tes performances pour être convoqué l'an prochain.`
                : `Atteins ${threshold} OVR pour entrer dans le radar du sélectionneur. Tu es actuellement à ${overall} — il te manque ${threshold - overall} points.`}
            </p>
          </motion.section>
        )}

      </motion.div>
      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}

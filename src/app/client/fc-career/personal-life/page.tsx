"use client";

/**
 * FC CAREER — Vie personnelle
 * Moral, événements de vie, famille, conséquences carrière.
 */

import { motion } from "framer-motion";
import { useGame } from "../game/hooks/useGame";
import { Spinner } from "../game/components/LoadingState";
import { selectPlayer, selectIsLoading } from "../game/state/selectors";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import {
  createInitialPersonalLife,
  moralOvrBonus,
  CATEGORY_LABELS,
  FAMILY_STATUS_LABELS,
  MORAL_LABEL,
  MORAL_COLOR,
  type PersonalLifeState,
  type PersonalEventCategory,
} from "../game/domain/personalLife";
import type { GameSaveV1 } from "../game/persistence/saveSchema";

/* ── Utilitaires ────────────────────────────────────────────────────── */

const CATEGORY_ICONS: Record<PersonalEventCategory, string> = {
  family:    "👨‍👩‍👧",
  health:    "🧠",
  social:    "🤝",
  finance:   "💰",
  spiritual: "🧘",
  housing:   "🏠",
};

/* ── Composants ─────────────────────────────────────────────────────── */

function MoralBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = MORAL_COLOR(value);
  return (
    <div style={{ height: 8, background: "var(--fc-surface-3)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${pct}%`, background: color,
        borderRadius: 99, transition: "width 0.5s ease",
      }} />
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────────────────── */

export default function PersonalLifePage() {
  const { state } = useGame();
  const isLoading  = selectIsLoading(state);
  const player     = selectPlayer(state);

  if (isLoading) return <Spinner />;
  if (!player) return <Spinner />;

  const save = state.save as GameSaveV1 & { personalLife?: PersonalLifeState };
  const pl: PersonalLifeState = save?.personalLife ?? createInitialPersonalLife();
  const ovrBonus = moralOvrBonus(pl.moral);
  const moralLabel = MORAL_LABEL(pl.moral);
  const moralColor = MORAL_COLOR(pl.moral);

  return (
    <motion.div
      variants={pageFade} initial="hidden" animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 720, margin: "0 auto" }}
    >
      <div className="fc-page-header">
        <h1 className="fc-page-title">Vie personnelle</h1>
        <p className="fc-page-meta">Moral · Famille · Événements de vie</p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Moral & état mental ──────────────────────────────────── */}
        <motion.section variants={itemFade} className="fc-panel" style={{ marginBottom: "var(--fc-space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--fc-space-3)" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)" }}>
                État mental
              </h2>
              <p style={{ margin: 0, marginTop: 4, fontSize: "var(--fc-text-lg)", fontWeight: 800, color: moralColor }}>
                {moralLabel}
              </p>
            </div>
            <div style={{
              padding: "4px 12px", borderRadius: 99,
              background: ovrBonus > 0 ? "rgba(16,185,129,0.1)" : ovrBonus < 0 ? "rgba(239,68,68,0.1)" : "var(--fc-surface-3)",
              color: ovrBonus > 0 ? "var(--fc-emerald)" : ovrBonus < 0 ? "var(--fc-red)" : "var(--fc-text-3)",
              fontSize: "var(--fc-text-xs)", fontWeight: 700,
            }}>
              {ovrBonus > 0 ? `+${ovrBonus}` : ovrBonus} OVR effectif
            </div>
          </div>

          <div style={{ marginBottom: "var(--fc-space-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--fc-space-1)" }}>
              <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Moral</span>
              <span style={{ fontSize: "var(--fc-text-xs)", fontWeight: 700, color: moralColor }}>{Math.round(pl.moral)}/100</span>
            </div>
            <MoralBar value={pl.moral} />
          </div>

          {/* Bonus actifs */}
          {pl.activeBonusWeeksLeft > 0 && (
            <div style={{
              marginTop: "var(--fc-space-3)",
              padding: "var(--fc-space-2) var(--fc-space-3)",
              background: "var(--fc-surface-3)", borderRadius: "var(--fc-radius-sm)",
              fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)",
            }}>
              <span style={{ fontWeight: 700 }}>Effets actifs</span>
              {pl.activeStaminaBonus !== 0 && (
                <span style={{ marginLeft: 8, color: pl.activeStaminaBonus > 0 ? "var(--fc-emerald)" : "var(--fc-red)" }}>
                  {pl.activeStaminaBonus > 0 ? "+" : ""}{pl.activeStaminaBonus} endurance
                </span>
              )}
              {pl.activeTrainingBonus !== 0 && (
                <span style={{ marginLeft: 8, color: pl.activeTrainingBonus > 0 ? "var(--fc-emerald)" : "var(--fc-red)" }}>
                  {pl.activeTrainingBonus > 0 ? "+" : ""}{pl.activeTrainingBonus} training
                </span>
              )}
              <span style={{ marginLeft: 8, color: "var(--fc-text-3)" }}>
                · encore {pl.activeBonusWeeksLeft} sem.
              </span>
            </div>
          )}
        </motion.section>

        {/* ── Situation familiale ───────────────────────────────────── */}
        <motion.section variants={itemFade} className="fc-panel" style={{ marginBottom: "var(--fc-space-4)" }}>
          <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
            Vie familiale
          </h2>
          <div style={{ display: "flex", gap: "var(--fc-space-4)", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 100px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "1.8rem" }}>
                {pl.familyStatus === "single" ? "🧑" : pl.familyStatus === "in_relationship" ? "💑" : pl.familyStatus === "married" ? "💍" : "👨‍👩‍👧"}
              </p>
              <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
                {FAMILY_STATUS_LABELS[pl.familyStatus]}
              </p>
              <p style={{ margin: 0, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Statut civil</p>
            </div>
            {pl.childrenCount > 0 && (
              <div style={{ flex: "1 1 100px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "1.8rem" }}>👶</p>
                <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
                  {pl.childrenCount} enfant{pl.childrenCount > 1 ? "s" : ""}
                </p>
                <p style={{ margin: 0, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Famille</p>
              </div>
            )}
            <div style={{ flex: "1 1 100px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "1.8rem" }}>📅</p>
              <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
                {pl.events.length}
              </p>
              <p style={{ margin: 0, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Événements vécus</p>
            </div>
          </div>
        </motion.section>

        {/* ── Événements de vie ────────────────────────────────────── */}
        <motion.section variants={itemFade}>
          <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
            Événements récents
          </h2>

          {pl.events.length === 0 ? (
            <div style={{
              padding: "var(--fc-space-8)", textAlign: "center",
              background: "var(--fc-surface-2)", borderRadius: "var(--fc-radius)",
              border: "1px solid var(--fc-border)",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "var(--fc-space-2)" }}>🌱</div>
              <p style={{ color: "var(--fc-text-2)", margin: 0, fontSize: "var(--fc-text-sm)" }}>
                Ta vie personnelle s'écrira au fil des saisons.
              </p>
              <p style={{ color: "var(--fc-text-3)", margin: 0, marginTop: "var(--fc-space-2)", fontSize: "var(--fc-text-xs)" }}>
                Joue, progresse, vis — des événements surgiront naturellement.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {pl.events.slice(0, 10).map((ev, idx) => {
                const hasPositive = ev.impacts.some(i => i.delta > 0);
                const hasNegative = ev.impacts.some(i => i.delta < 0);
                const borderColor = hasPositive && !hasNegative ? "var(--fc-emerald)"
                  : hasNegative && !hasPositive ? "var(--fc-red)"
                  : "var(--fc-border)";
                return (
                  <div key={`${ev.id}-${idx}`} style={{
                    padding: "var(--fc-space-3) var(--fc-space-4)",
                    background: "var(--fc-surface-2)",
                    borderRadius: "var(--fc-radius)",
                    borderLeft: `3px solid ${borderColor}`,
                    border: `1px solid var(--fc-border)`,
                    borderLeftColor: borderColor,
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--fc-space-3)" }}>
                      <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{ev.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
                            {ev.title}
                          </p>
                          <span style={{
                            padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                            background: "var(--fc-surface-3)", color: "var(--fc-text-3)",
                            whiteSpace: "nowrap", marginLeft: "var(--fc-space-2)",
                          }}>
                            {CATEGORY_ICONS[ev.category]} {CATEGORY_LABELS[ev.category]}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)", lineHeight: 1.4 }}>
                          {ev.description}
                        </p>
                        {ev.impacts.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fc-space-1)", marginTop: "var(--fc-space-1)" }}>
                            {ev.impacts.map((impact, i) => (
                              <span key={i} style={{
                                fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                                background: impact.delta > 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                                color: impact.delta > 0 ? "var(--fc-emerald)" : "var(--fc-red)",
                              }}>
                                {impact.label}
                              </span>
                            ))}
                          </div>
                        )}
                        <p style={{ margin: 0, marginTop: 4, fontSize: 10, color: "var(--fc-text-3)" }}>
                          S{ev.season} · Sem. {ev.week}
                          {ev.hadChoice && ev.choiceMade && (
                            <span style={{ marginLeft: 6 }}>
                              · {ev.choiceMade === "accept" ? "✓ Accepté" : "✗ Refusé"}
                            </span>
                          )}
                        </p>
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

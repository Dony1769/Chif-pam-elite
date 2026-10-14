"use client";

/**
 * FC CAREER — Page : Coach / Entraîneur
 * Confiance, rôle dans l'équipe, objectif saisonnier, conversations passées.
 */

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useGame }   from "../game/hooks/useGame";
import { useToast }  from "../game/components/Toast";
import { Button }    from "../game/components/Button";
import { Spinner }   from "../game/components/LoadingState";
import { pageFade, itemFade, stagger } from "../game/design/animations";
import { selectPlayer, selectCareer } from "../game/state/selectors";
import {
  generateCoachMessage,
  roleFromTrust,
  type CoachConversation,
} from "../game/domain/coach";

/* ── Helpers ──────────────────────────────────────────────────────── */

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  titulaire:  { label: "Titulaire",  color: "var(--fc-emerald)", bg: "var(--fc-emerald-10)" },
  rotation:   { label: "Rotation",   color: "var(--fc-amber)",   bg: "rgba(251,191,36,.12)"  },
  remplaçant: { label: "Remplaçant", color: "var(--fc-text-2)",  bg: "var(--fc-surface-2)"   },
  espoir:     { label: "Espoir",     color: "var(--fc-blue)",    bg: "rgba(59,130,246,.12)"   },
};

function TrustBar({ trust }: { trust: number }) {
  const pct = Math.max(0, Math.min(100, trust));
  const color = pct >= 80 ? "var(--fc-emerald)"
    : pct >= 55 ? "var(--fc-amber)"
    : pct >= 30 ? "var(--fc-text-3)"
    : "var(--fc-red, #ef4444)";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--fc-space-1)" }}>
        <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Confiance coach</span>
        <span style={{ fontSize: "var(--fc-text-xs)", fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{
        height: 8, borderRadius: 99, background: "var(--fc-surface-2)", overflow: "hidden",
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ height: "100%", background: color, borderRadius: 99 }}
        />
      </div>
    </div>
  );
}

function ObjectiveProgress({ current, target, description }: { current: number; target: number; description: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--fc-space-1)" }}>
        <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{description}</span>
        <span style={{ fontSize: "var(--fc-text-xs)", fontWeight: 700, color: "var(--fc-text)" }}>
          {current} / {target}
        </span>
      </div>
      <div style={{
        height: 6, borderRadius: 99, background: "var(--fc-surface-2)", overflow: "hidden",
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          style={{
            height: "100%",
            background: pct >= 100 ? "var(--fc-emerald)" : "var(--fc-amber)",
            borderRadius: 99,
          }}
        />
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function CoachPage() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const player = selectPlayer(state);
  const career = selectCareer(state);
  const [requesting, setRequesting] = useState(false);

  const coach = state.save?.coach;

  const handleRequestMeeting = useCallback(async () => {
    if (!coach || !career || !player) return;
    setRequesting(true);
    await new Promise(r => setTimeout(r, 600));

    const trigger = coach.trust >= 70
      ? "good_performance"
      : coach.trust <= 30
      ? "demotion_warning"
      : "objective_progress";

    const message = generateCoachMessage(trigger, coach.trust, coach.playerRole, coach.seasonObjective);

    const trustEffect = trigger === "good_performance" ? 3
      : trigger === "demotion_warning" ? -2
      : 0;

    const newTrust = Math.max(0, Math.min(100, coach.trust + trustEffect));
    const newRole  = roleFromTrust(newTrust);

    const conv: CoachConversation = {
      id: `conv-${Date.now()}`,
      season: career.season,
      week: career.week,
      trigger,
      message,
      effect: { trust: trustEffect, role: newRole },
    };

    dispatch({ type: "ADD_COACH_CONVERSATION", conversation: conv });
    toast("💬 Conversation avec le coach", "success");
    setRequesting(false);
  }, [coach, career, player, dispatch, toast]);

  if (state.isLoading) return <Spinner />;
  if (!state.save || !player || !career || !coach) {
    return (
      <div className="fc-page">
        <div className="fc-section-header">
          <h1 className="fc-section-title">Coach</h1>
        </div>
        <div className="fc-card" style={{ padding: "var(--fc-space-8)", textAlign: "center" }}>
          <p style={{ color: "var(--fc-text-3)", fontSize: "var(--fc-text-sm)" }}>
            Aucune carrière active.
          </p>
        </div>
      </div>
    );
  }

  const roleInfo = ROLE_LABELS[coach.playerRole] ?? ROLE_LABELS.espoir;
  const canRequest = coach.conversations.length === 0
    || coach.conversations[coach.conversations.length - 1]?.week !== career.week;

  return (
    <motion.div
      className="fc-page"
      variants={pageFade}
      initial="hidden"
      animate="visible"
    >
      {/* En-tête */}
      <div className="fc-section-header">
        <h1 className="fc-section-title">Entraîneur</h1>
        <span
          className="fc-badge"
          style={{ background: roleInfo.bg, color: roleInfo.color, fontWeight: 700 }}
        >
          {roleInfo.label}
        </span>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible"
        style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-4)" }}
      >
        {/* ── Profil du coach ───────────────────────────── */}
        <motion.div variants={itemFade} className="fc-card"
          style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-4)", marginBottom: "var(--fc-space-4)" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "var(--fc-radius)",
              background: "var(--fc-surface-2)",
              border: "1px solid var(--fc-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.5rem",
            }}>
              🧑‍💼
            </div>
            <div>
              <div style={{
                fontFamily: "var(--fc-font-display)", fontWeight: 800,
                fontSize: "var(--fc-text-lg)", color: "var(--fc-text)",
              }}>
                {coach.name}
              </div>
              <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2 }}>
                Philosophie : <strong style={{ color: "var(--fc-text-2)" }}>{coach.philosophy}</strong>
              </div>
            </div>
          </div>

          <TrustBar trust={coach.trust} />
        </motion.div>

        {/* ── Objectif saisonnier ───────────────────────── */}
        <motion.div variants={itemFade} className="fc-card"
          style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--fc-space-3)" }}>
            <h2 style={{
              fontFamily: "var(--fc-font-display)", fontWeight: 700,
              fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
            }}>
              Objectif saisonnier
            </h2>
            {coach.seasonObjective.completed && (
              <span style={{
                fontSize: "var(--fc-text-xs)", fontWeight: 700,
                color: "var(--fc-emerald)", background: "var(--fc-emerald-10)",
                padding: "2px 8px", borderRadius: 99,
              }}>
                ✓ Accompli
              </span>
            )}
          </div>
          <ObjectiveProgress
            current={coach.seasonObjective.current}
            target={coach.seasonObjective.target}
            description={coach.seasonObjective.description}
          />
        </motion.div>

        {/* ── Demander une réunion ──────────────────────── */}
        <motion.div variants={itemFade} className="fc-card"
          style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}
        >
          <h2 style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 700,
            fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
            marginBottom: "var(--fc-space-2)",
          }}>
            Conversation avec le coach
          </h2>
          <p style={{
            fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)",
            marginBottom: "var(--fc-space-4)", lineHeight: 1.5,
          }}>
            Demandez un entretien pour obtenir un retour sur vos performances
            et vos perspectives dans l'équipe.
          </p>
          <Button
            variant="primary"
            fullWidth
            loading={requesting}
            disabled={!canRequest}
            onClick={handleRequestMeeting}
          >
            💬 {canRequest ? "Demander un entretien" : "Déjà consulté cette semaine"}
          </Button>
        </motion.div>

        {/* ── Historique des conversations ──────────────── */}
        {coach.conversations.length > 0 && (
          <motion.div variants={itemFade} className="fc-card"
            style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}
          >
            <h2 style={{
              fontFamily: "var(--fc-font-display)", fontWeight: 700,
              fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
              marginBottom: "var(--fc-space-3)",
            }}>
              Historique
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
              {[...coach.conversations].reverse().slice(0, 10).map(conv => (
                <div key={conv.id} style={{
                  padding: "var(--fc-space-3)",
                  background: "var(--fc-surface-2)",
                  borderRadius: "var(--fc-radius)",
                  borderLeft: "3px solid var(--fc-emerald)",
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    marginBottom: "var(--fc-space-2)",
                  }}>
                    <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
                      Saison {conv.season} · Sem. {conv.week}
                    </span>
                    {conv.effect?.trust !== undefined && conv.effect.trust !== 0 && (
                      <span style={{
                        fontSize: "var(--fc-text-xs)", fontWeight: 700,
                        color: (conv.effect.trust ?? 0) > 0 ? "var(--fc-emerald)" : "#ef4444",
                      }}>
                        {(conv.effect.trust ?? 0) > 0 ? "+" : ""}{conv.effect.trust} confiance
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: "var(--fc-text-sm)", color: "var(--fc-text)",
                    lineHeight: 1.5, margin: 0,
                    fontStyle: "italic",
                  }}>
                    &ldquo;{conv.message}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}

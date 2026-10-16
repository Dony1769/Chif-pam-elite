"use client";

/**
 * FC CAREER — Médias & Réputation
 * Conférences de presse, manchettes, image publique.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "../game/hooks/useGame";
import { Spinner } from "../game/components/LoadingState";
import { selectIsLoading, selectPlayer, selectCareer } from "../game/state/selectors";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import type { PressConference } from "../game/persistence/saveSchema";

const QUESTIONS: { id: string; question: string; answers: { label: string; impact: number }[] }[] = [
  {
    id: "q1",
    question: "Comment évaluez-vous votre performance ce soir ?",
    answers: [
      { label: "Satisfait, on a bien travaillé.", impact: 3 },
      { label: "Je peux encore progresser.", impact: 1 },
      { label: "C'était insuffisant, honnêtement.", impact: -1 },
    ],
  },
  {
    id: "q2",
    question: "Les fans attendent beaucoup de vous cette saison.",
    answers: [
      { label: "Leur soutien me motive chaque jour.", impact: 4 },
      { label: "La pression fait partie du jeu.", impact: 2 },
      { label: "Je préfère ne pas trop y penser.", impact: -2 },
    ],
  },
  {
    id: "q3",
    question: "Votre avenir dans ce club est-il assuré ?",
    answers: [
      { label: "Je suis ici pour gagner des titres.", impact: 3 },
      { label: "Je me concentre sur le présent.", impact: 1 },
      { label: "Tout dépend des offres.", impact: -3 },
    ],
  },
  {
    id: "q4",
    question: "Quel est votre objectif pour la fin de saison ?",
    answers: [
      { label: "Gagner le championnat avec l'équipe.", impact: 4 },
      { label: "Marquer le plus de buts possible.", impact: 2 },
      { label: "Rester en forme et en bonne santé.", impact: 1 },
    ],
  },
];

export default function MediaPage() {
  const { state, dispatch } = useGame();
  const isLoading = selectIsLoading(state);
  const player    = selectPlayer(state);
  const career    = selectCareer(state);

  const [activeQ, setActiveQ]     = useState<string | null>(null);
  const [answered, setAnswered]   = useState<Set<string>>(new Set());

  if (isLoading) return <Spinner />;
  if (!state.save || !player || !career) return null;

  const media = state.save.media ?? {
    mediaReputation: 40,
    lastHeadline: null,
    pressConferences: [],
  };

  const rep = media.mediaReputation;
  const repLabel =
    rep >= 80 ? "Star médiatique" :
    rep >= 60 ? "Personnalité reconnue" :
    rep >= 40 ? "Joueur respecté" :
    rep >= 20 ? "Peu médiatisé" :
    "Inconnu du grand public";

  const repColor =
    rep >= 60 ? "var(--fc-emerald)" :
    rep >= 40 ? "var(--fc-amber)" :
    "var(--fc-text-3)";

  function handleAnswer(questionId: string, answer: { label: string; impact: number }) {
    if (answered.has(questionId)) return;
    setAnswered(prev => new Set([...prev, questionId]));
    setActiveQ(null);

    const conf: PressConference = {
      id: `pc-${Date.now()}`,
      season: career!.season,
      week: career!.week,
      question: QUESTIONS.find(q => q.id === questionId)?.question ?? "",
      answer: answer.label,
      impact: answer.impact,
    };

    dispatch({
      type: "UPDATE_MEDIA",
      mediaRepDelta: answer.impact,
      conference: conf,
    } as import("../game/state/actions").GameAction);
  }

  const weekConfs = (media.pressConferences ?? []).filter(c => c.season === career.season);
  const lastConf  = weekConfs[weekConfs.length - 1];

  const availableQuestions = QUESTIONS.filter(q => !answered.has(q.id));

  return (
    <motion.div
      variants={pageFade} initial="hidden" animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 680, margin: "0 auto" }}
    >
      <div className="fc-page-header">
        <h1 className="fc-page-title">Médias</h1>
        <p className="fc-page-meta">Saison {career.season} · Réputation médiatique</p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Réputation ─────────────────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <p className="fc-panel__label">IMAGE PUBLIQUE</p>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-4)", marginTop: "var(--fc-space-2)" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              border: `3px solid ${repColor}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--fc-surface-3)",
            }}>
              <span style={{ fontSize: "1.5rem", fontFamily: "var(--fc-font-display)", fontWeight: 900, color: repColor }}>
                {rep}
              </span>
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "var(--fc-text-base)", color: repColor, margin: 0 }}>{repLabel}</p>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2 }}>
                {player.firstName} {player.lastName} · {weekConfs.length} conf. cette saison
              </p>
            </div>
          </div>

          {/* Barre de réputation */}
          <div style={{
            marginTop: "var(--fc-space-3)",
            height: 6, borderRadius: 3,
            background: "var(--fc-surface-3)",
            overflow: "hidden",
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${rep}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ height: "100%", background: repColor, borderRadius: 3 }}
            />
          </div>
        </motion.section>

        {/* ── Dernière manchette ─────────────────────────────────── */}
        {lastConf && (
          <motion.div variants={itemFade} style={{
            padding: "var(--fc-space-3)",
            borderRadius: "var(--fc-radius-sm)",
            border: "1px solid var(--fc-border)",
            background: "var(--fc-surface-2)",
            marginBottom: "var(--fc-space-4)",
          }}>
            <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginBottom: "var(--fc-space-1)" }}>
              DERNIÈRE CONF DE PRESSE — S{lastConf.season} J{lastConf.week}
            </p>
            <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)", fontStyle: "italic", marginBottom: "var(--fc-space-1)" }}>
              « {lastConf.question} »
            </p>
            <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text)", fontWeight: 600 }}>
              {lastConf.answer}
            </p>
            <p style={{
              fontSize: "var(--fc-text-xs)",
              color: lastConf.impact > 0 ? "var(--fc-emerald)" : lastConf.impact < 0 ? "var(--fc-coral)" : "var(--fc-text-3)",
              marginTop: "var(--fc-space-1)",
            }}>
              {lastConf.impact > 0 ? `+${lastConf.impact}` : lastConf.impact} réputation
            </p>
          </motion.div>
        )}

        {/* ── Conférence de presse ─────────────────────────────── */}
        <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-3)" }}>
            Conférences disponibles
          </h2>

          {availableQuestions.length === 0 ? (
            <div style={{ padding: "var(--fc-space-4)", textAlign: "center", color: "var(--fc-text-3)", fontSize: "var(--fc-text-sm)" }}>
              Toutes les questions ont été répondues cette session.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {availableQuestions.map(q => (
                <div key={q.id}>
                  <button
                    onClick={() => setActiveQ(activeQ === q.id ? null : q.id)}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "var(--fc-space-3)",
                      borderRadius: "var(--fc-radius-sm)",
                      border: `1px solid ${activeQ === q.id ? "var(--fc-emerald)" : "var(--fc-border)"}`,
                      background: activeQ === q.id ? "var(--fc-emerald-10)" : "var(--fc-surface-2)",
                      color: "var(--fc-text)",
                      cursor: "pointer",
                      fontSize: "var(--fc-text-sm)",
                    }}
                  >
                    <span style={{ color: "var(--fc-text-3)", marginRight: "var(--fc-space-2)" }}>🎤</span>
                    {q.question}
                  </button>

                  {activeQ === q.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      style={{
                        marginTop: "var(--fc-space-1)",
                        display: "flex", flexDirection: "column", gap: "var(--fc-space-1)",
                      }}
                    >
                      {q.answers.map((ans, i) => (
                        <button
                          key={i}
                          onClick={() => handleAnswer(q.id, ans)}
                          style={{
                            textAlign: "left",
                            padding: "var(--fc-space-2) var(--fc-space-3)",
                            marginLeft: "var(--fc-space-4)",
                            borderRadius: "var(--fc-radius-sm)",
                            border: "1px solid var(--fc-border)",
                            background: "var(--fc-surface-3)",
                            color: "var(--fc-text-2)",
                            cursor: "pointer",
                            fontSize: "var(--fc-text-sm)",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                          }}
                        >
                          <span>{ans.label}</span>
                          <span style={{
                            fontSize: "var(--fc-text-xs)", fontWeight: 700,
                            color: ans.impact > 0 ? "var(--fc-emerald)" : ans.impact < 0 ? "var(--fc-coral)" : "var(--fc-text-3)",
                          }}>
                            {ans.impact > 0 ? `+${ans.impact}` : ans.impact}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Historique cette saison ──────────────────────────── */}
        {weekConfs.length > 0 && (
          <motion.section variants={itemFade}>
            <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-2)" }}>
              Historique saison {career.season}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-1)" }}>
              {[...weekConfs].reverse().slice(0, 5).map(c => (
                <div key={c.id} style={{
                  padding: "var(--fc-space-2) var(--fc-space-3)",
                  borderRadius: "var(--fc-radius-sm)",
                  border: "1px solid var(--fc-border)",
                  background: "var(--fc-surface-2)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0 }}>J{c.week}</p>
                    <p style={{
                      fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      margin: 0,
                    }}>{c.answer}</p>
                  </div>
                  <span style={{
                    fontSize: "var(--fc-text-xs)", fontWeight: 700, marginLeft: "var(--fc-space-2)",
                    color: c.impact > 0 ? "var(--fc-emerald)" : c.impact < 0 ? "var(--fc-coral)" : "var(--fc-text-3)",
                  }}>
                    {c.impact > 0 ? `+${c.impact}` : c.impact}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

      </motion.div>
      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}

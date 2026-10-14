"use client";

/**
 * FC CAREER — Journal autobiographique
 * Historique chronologique des événements significatifs.
 */

import { motion } from "framer-motion";
import { useGame }  from "../game/hooks/useGame";
import { Spinner }  from "../game/components/LoadingState";
import { selectIsLoading, selectPlayer, selectCareer } from "../game/state/selectors";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import type { JournalEntry } from "../game/persistence/saveSchema";

const TYPE_ICON: Record<JournalEntry["type"], string> = {
  match:    "⚽",
  training: "🏋️",
  contract: "📝",
  transfer: "✈️",
  award:    "🏆",
  injury:   "🩹",
  milestone:"🎯",
};

const TYPE_COLOR: Record<JournalEntry["type"], string> = {
  match:    "var(--fc-emerald)",
  training: "var(--fc-amber)",
  contract: "var(--fc-text-2)",
  transfer: "var(--fc-coral)",
  award:    "var(--fc-amber)",
  injury:   "var(--fc-coral)",
  milestone:"var(--fc-emerald)",
};

export default function JournalPage() {
  const { state } = useGame();
  const isLoading = selectIsLoading(state);
  const player    = selectPlayer(state);
  const career    = selectCareer(state);

  if (isLoading) return <Spinner />;
  if (!state.save || !player || !career) return null;

  const entries: JournalEntry[] = state.save.journal ?? [];

  // Regrouper par saison
  const bySeason: Record<number, JournalEntry[]> = {};
  for (const entry of entries) {
    if (!bySeason[entry.season]) bySeason[entry.season] = [];
    bySeason[entry.season].push(entry);
  }

  const seasons = Object.keys(bySeason).map(Number).sort((a, b) => b - a);

  return (
    <motion.div
      variants={pageFade} initial="hidden" animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 680, margin: "0 auto" }}
    >
      <div className="fc-page-header">
        <h1 className="fc-page-title">Journal</h1>
        <p className="fc-page-meta">
          {entries.length} entrée{entries.length !== 1 ? "s" : ""} · Saison {career.season}
        </p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {entries.length === 0 ? (
          <motion.div variants={itemFade} style={{
            textAlign: "center", padding: "var(--fc-space-8)", color: "var(--fc-text-3)",
          }}>
            <p style={{ fontSize: "2.5rem", marginBottom: "var(--fc-space-2)" }}>📖</p>
            <p style={{ fontSize: "var(--fc-text-sm)", fontWeight: 600 }}>Ton journal est vide.</p>
            <p style={{ fontSize: "var(--fc-text-xs)", marginTop: "var(--fc-space-1)" }}>
              Les événements importants de ta carrière — matchs, contrats,<br />
              blessures, transferts — seront automatiquement consignés ici.
            </p>
          </motion.div>
        ) : (
          seasons.map(season => (
            <motion.section key={season} variants={itemFade} style={{ marginBottom: "var(--fc-space-6)" }}>
              {/* En-tête saison */}
              <div style={{
                display: "flex", alignItems: "center", gap: "var(--fc-space-3)",
                marginBottom: "var(--fc-space-3)",
              }}>
                <div style={{
                  flex: 1, height: 1,
                  background: "linear-gradient(to right, var(--fc-border), transparent)",
                }} />
                <span style={{
                  fontSize: "var(--fc-text-xs)", fontWeight: 700,
                  color: season === career.season ? "var(--fc-emerald)" : "var(--fc-text-3)",
                  letterSpacing: "0.05em",
                  padding: "2px 10px",
                  border: `1px solid ${season === career.season ? "rgba(55,217,154,0.4)" : "var(--fc-border)"}`,
                  borderRadius: 99,
                  background: season === career.season ? "var(--fc-emerald-10)" : "var(--fc-surface-2)",
                }}>
                  SAISON {season}
                </span>
                <div style={{
                  flex: 1, height: 1,
                  background: "linear-gradient(to left, var(--fc-border), transparent)",
                }} />
              </div>

              {/* Entrées */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[...bySeason[season]].reverse().map((entry, idx, arr) => (
                  <div key={entry.id} style={{ display: "flex", gap: "var(--fc-space-3)" }}>
                    {/* Ligne temporelle */}
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      flexShrink: 0, width: 32,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        border: `2px solid ${TYPE_COLOR[entry.type]}`,
                        background: "var(--fc-surface-3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.75rem", flexShrink: 0,
                      }}>
                        {TYPE_ICON[entry.type]}
                      </div>
                      {idx < arr.length - 1 && (
                        <div style={{ flex: 1, width: 1, background: "var(--fc-border)", marginTop: 4 }} />
                      )}
                    </div>

                    {/* Contenu */}
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: "var(--fc-space-4)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--fc-space-2)" }}>
                        <p style={{
                          fontWeight: 700, fontSize: "var(--fc-text-sm)",
                          color: TYPE_COLOR[entry.type], margin: 0,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {entry.title}
                        </p>
                        <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", flexShrink: 0 }}>
                          J{entry.week}
                        </span>
                      </div>
                      <p style={{
                        fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)",
                        margin: 0, marginTop: 4, lineHeight: 1.5,
                      }}>
                        {entry.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          ))
        )}

      </motion.div>
      <div style={{ height: "var(--fc-space-8)" }} />
    </motion.div>
  );
}

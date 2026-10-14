"use client";

/**
 * FC CAREER — Sponsors
 * Contrats, missions, revenus hebdomadaires.
 */

import { motion } from "framer-motion";
import { useGame }  from "../game/hooks/useGame";
import { Spinner }  from "../game/components/LoadingState";
import { selectIsLoading, selectPlayer, selectCareer } from "../game/state/selectors";
import { pageFade, stagger, itemFade } from "../game/design/animations";
import type { SponsorContract } from "../game/persistence/saveSchema";

const AVAILABLE_SPONSORS: Omit<SponsorContract, "id" | "season" | "weeksLeft" | "missionDone">[] = [
  { name: "Veltron Sport",  logo: "⚡", weeklyBonus: 500,  missionLabel: "Marquer 3 buts en championnat" },
  { name: "Nexia Fitness",  logo: "💪", weeklyBonus: 300,  missionLabel: "Maintenir la forme > 70 pendant 4 semaines" },
  { name: "Urban Kicks",    logo: "👟", weeklyBonus: 750,  missionLabel: "Décrocher une note > 7 trois fois" },
  { name: "ProVital",       logo: "🟢", weeklyBonus: 400,  missionLabel: "Gagner 2 matchs consécutifs" },
  { name: "Chronex Watch",  logo: "⌚", weeklyBonus: 1200, missionLabel: "Finir dans le top 5 du classement" },
];

export default function SponsorsPage() {
  const { state, dispatch } = useGame();
  const isLoading = selectIsLoading(state);
  const player    = selectPlayer(state);
  const career    = selectCareer(state);

  if (isLoading) return <Spinner />;
  if (!state.save || !player || !career) return null;

  const sponsors: SponsorContract[] = state.save.sponsors ?? [];
  const activeSponsors  = sponsors.filter(s => s.weeksLeft > 0);
  const expiredSponsors = sponsors.filter(s => s.weeksLeft <= 0);
  const totalBonus      = activeSponsors.reduce((sum, s) => sum + s.weeklyBonus, 0);
  const activeSponsorNames = new Set(activeSponsors.map(s => s.name));

  function signSponsor(template: typeof AVAILABLE_SPONSORS[0]) {
    const contract: SponsorContract = {
      id: `sp-${Date.now()}`,
      season: career!.season,
      weeksLeft: 12,
      missionDone: false,
      ...template,
    };
    dispatch({
      type: "SIGN_SPONSOR",
      contract,
    } as import("../game/state/actions").GameAction);
  }

  return (
    <motion.div
      variants={pageFade} initial="hidden" animate="visible"
      style={{ padding: "var(--fc-space-5) var(--fc-space-4)", maxWidth: 680, margin: "0 auto" }}
    >
      <div className="fc-page-header">
        <h1 className="fc-page-title">Sponsors</h1>
        <p className="fc-page-meta">Saison {career.season} · +{totalBonus.toLocaleString()} €/sem</p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Résumé revenus sponsors ─────────────────────────────── */}
        <motion.section className="fc-panel" variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <p className="fc-panel__label">REVENUS SPONSORS</p>
          <div style={{ display: "flex", gap: "var(--fc-space-4)", marginTop: "var(--fc-space-2)" }}>
            <div>
              <p style={{ fontSize: "var(--fc-text-2xl)", fontFamily: "var(--fc-font-display)", fontWeight: 900, color: "var(--fc-emerald)", margin: 0 }}>
                +{totalBonus.toLocaleString()} €
              </p>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>par semaine</p>
            </div>
            <div style={{ borderLeft: "1px solid var(--fc-border)", paddingLeft: "var(--fc-space-4)" }}>
              <p style={{ fontSize: "var(--fc-text-xl)", fontFamily: "var(--fc-font-display)", fontWeight: 800, color: "var(--fc-text)", margin: 0 }}>
                {activeSponsors.length}
              </p>
              <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>contrat{activeSponsors.length !== 1 ? "s" : ""} actif{activeSponsors.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </motion.section>

        {/* ── Contrats actifs ─────────────────────────────────────── */}
        {activeSponsors.length > 0 && (
          <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
            <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-2)" }}>
              Contrats actifs
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {activeSponsors.map(s => (
                <div key={s.id} style={{
                  padding: "var(--fc-space-3)",
                  borderRadius: "var(--fc-radius-sm)",
                  border: "1px solid rgba(55,217,154,0.25)",
                  background: "var(--fc-emerald-10)",
                  display: "flex", alignItems: "center", gap: "var(--fc-space-3)",
                }}>
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{s.logo}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)", margin: 0 }}>{s.name}</p>
                    <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0, marginTop: 2 }}>
                      {s.missionLabel}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: "var(--fc-text-sm)", color: "var(--fc-emerald)", margin: 0 }}>
                      +{s.weeklyBonus.toLocaleString()} €
                    </p>
                    <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0 }}>
                      {s.weeksLeft} sem.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Offres disponibles ──────────────────────────────────── */}
        <motion.section variants={itemFade} style={{ marginBottom: "var(--fc-space-4)" }}>
          <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-2)" }}>
            Offres disponibles
          </h2>
          {career.phase === "academy" ? (
            <div style={{
              padding: "var(--fc-space-5)",
              borderRadius: "var(--fc-radius)",
              border: "1px solid var(--fc-border)",
              background: "var(--fc-surface-2)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "var(--fc-space-2)" }}>🔒</div>
              <p style={{ fontWeight: 700, color: "var(--fc-text)", fontSize: "var(--fc-text-sm)", margin: 0 }}>
                Contrats sponsors verrouillés
              </p>
              <p style={{ color: "var(--fc-text-3)", fontSize: "var(--fc-text-xs)", marginTop: "var(--fc-space-1)" }}>
                Les sponsors se débloquent à partir de l&apos;équipe professionnelle.
                Concentre-toi sur ton développement en académie.
              </p>
            </div>
          ) : AVAILABLE_SPONSORS.filter(s => !activeSponsorNames.has(s.name)).length === 0 ? (
            <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-3)", textAlign: "center", padding: "var(--fc-space-4)" }}>
              Aucune offre disponible pour le moment.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {AVAILABLE_SPONSORS.filter(s => !activeSponsorNames.has(s.name)).map((s, i) => (
                <div key={i} style={{
                  padding: "var(--fc-space-3)",
                  borderRadius: "var(--fc-radius-sm)",
                  border: "1px solid var(--fc-border)",
                  background: "var(--fc-surface-2)",
                  display: "flex", alignItems: "center", gap: "var(--fc-space-3)",
                }}>
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{s.logo}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)", margin: 0 }}>{s.name}</p>
                    <p style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", margin: 0, marginTop: 2 }}>
                      Mission : {s.missionLabel}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: "var(--fc-text-sm)", color: "var(--fc-text)" }}>
                      +{s.weeklyBonus.toLocaleString()} €/sem
                    </span>
                    <button
                      onClick={() => signSponsor(s)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "var(--fc-radius-sm)",
                        border: "1px solid var(--fc-emerald)",
                        background: "var(--fc-emerald-10)",
                        color: "var(--fc-emerald)",
                        fontSize: "var(--fc-text-xs)",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Signer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Historique ─────────────────────────────────────────── */}
        {expiredSponsors.length > 0 && (
          <motion.section variants={itemFade}>
            <h2 style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginBottom: "var(--fc-space-2)" }}>
              Contrats expirés
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-1)" }}>
              {expiredSponsors.slice(-3).map(s => (
                <div key={s.id} style={{
                  padding: "var(--fc-space-2) var(--fc-space-3)",
                  borderRadius: "var(--fc-radius-sm)",
                  border: "1px solid var(--fc-border)",
                  background: "var(--fc-surface-2)",
                  display: "flex", alignItems: "center", gap: "var(--fc-space-2)",
                  opacity: 0.6,
                }}>
                  <span>{s.logo}</span>
                  <span style={{ flex: 1, fontSize: "var(--fc-text-xs)", color: "var(--fc-text-2)" }}>{s.name}</span>
                  <span style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>Expiré</span>
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

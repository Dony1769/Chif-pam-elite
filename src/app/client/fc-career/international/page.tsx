"use client";

/**
 * FC CAREER — Étape 13 : Sélection Nationale
 * Route: /client/fc-career/international
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Check,
  Flag,
  Globe,
  Shield,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { Shell, PageTitle, StatCard } from "../lib/components";
import { Button, Dialog, DialogContent, DialogTitle, DialogDescription } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import type { FullSave } from "../utils/storage";
import type { InternationalState, InternationalMatch, NationalCallUp } from "../types/international";
import {
  createInternationalState,
  checkCallUpEligibility,
  generateCallUp,
  respondToCallUp,
  initCareer,
  updateCareerWithMatch,
  generateBreakMatches,
  simulateInternationalMatch,
  getCountryName,
  checkCaptainEligibility,
  generateTournamentRun,
} from "../engine/international-engine";

type Tab = "overview" | "matches" | "tournaments";

const TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: "overview", label: "Carrière", icon: Globe },
  { id: "matches", label: "Matchs", icon: Flag },
  { id: "tournaments", label: "Tournois", icon: Trophy },
];

const ease4 = [0.22, 1, 0.36, 1] as [number, number, number, number];

const COMP_LABELS: Record<string, string> = {
  friendly: "Amical",
  "wc-qualifier": "Qualif. CdM",
  "euro-qualifier": "Qualif. Euro",
  "world-cup": "Coupe du Monde",
  euro: "Championnat d'Europa",
};

const STAGE_LABELS: Record<string, string> = {
  group: "Phase de groupes",
  "round-of-16": "8èmes de finale",
  "quarter-final": "Quarts de finale",
  "semi-final": "Demi-finale",
  final: "Finale",
};

export default function InternationalPage() {
  const [save, setSave] = useState<FullSave | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [callUpModal, setCallUpModal] = useState(false);

  useEffect(() => { setSave(loadGame()); }, []);

  const intl: InternationalState = save?.meta?.internationalState ?? createInternationalState();
  const player = save?.player;
  const nationality = player?.nationality ?? "FR";

  const persist = useCallback((updated: InternationalState) => {
    setSave(prev => {
      if (!prev) return prev;
      const next: FullSave = { ...prev, meta: { ...prev.meta, internationalState: updated } };
      saveGame(next);
      return next;
    });
  }, []);

  /* --- Actions --- */
  const triggerCallUp = useCallback(() => {
    if (!player) return;
    const { eligible, level } = checkCallUpEligibility(
      player.overall,
      player.form ?? 70,
      false, // injury check simplified
      player.age,
    );
    if (!eligible) return;
    const seasonYear = save?.meta?.season?.seasonYear ?? 2026;
    const dayNumber = save?.meta?.season?.currentDay ?? 1;
    const callUp = generateCallUp(seasonYear, dayNumber, level);
    const updated: InternationalState = { ...intl, pendingCallUp: callUp };
    persist(updated);
    setCallUpModal(true);
  }, [player, save, intl, persist]);

  const respondCallUp = useCallback((accepted: boolean) => {
    if (!intl.pendingCallUp || !player) return;
    const callUp: NationalCallUp = { ...intl.pendingCallUp, accepted };
    const deltas = respondToCallUp(accepted);

    let career = intl.career ?? initCareer(nationality, callUp.level);
    career = { ...career, callUps: [...career.callUps, callUp] };

    if (accepted) {
      // Generate and simulate break matches
      const breakMatches = generateBreakMatches(
        "friendly",
        callUp.dayNumber,
        nationality,
        2,
      );
      for (const m of breakMatches) {
        const simulated = simulateInternationalMatch(m, player.overall);
        career = updateCareerWithMatch(career, simulated);
      }
      // Check captain
      if (checkCaptainEligibility(career.caps, player.overall, 60)) {
        career = { ...career, isCaptain: true };
      }
    }

    const updated: InternationalState = { ...intl, career, pendingCallUp: null, breakActive: false };
    persist(updated);
    setCallUpModal(false);
  }, [intl, player, nationality, persist]);

  const simulateTournament = useCallback((type: "world-cup" | "euro") => {
    if (!player) return;
    const year = save?.meta?.season?.seasonYear ?? 2026;
    let career = intl.career ?? initCareer(nationality, "A");
    const run = generateTournamentRun(type, year, player.overall, nationality);

    // Update career with tournament matches
    for (const m of run.matches) {
      career = updateCareerWithMatch(career, m);
    }
    career = { ...career, tournaments: [...career.tournaments, run] };

    persist({ ...intl, career });
  }, [player, save, intl, nationality, persist]);

  if (!save) {
    return (
      <Shell>
        <PageTitle eyebrow="ÉTAPE 13" title="Sélection Nationale" subtitle="Chargement..." />
      </Shell>
    );
  }

  const career = intl.career;
  const { eligible } = player ? checkCallUpEligibility(player.overall, player.form ?? 70, false, player.age) : { eligible: false };

  return (
    <Shell>
      <PageTitle
        eyebrow="ÉTAPE 13"
        title="Sélection Nationale"
        subtitle={career ? `${career.team} — ${career.level === "U21" ? "Espoirs" : "Équipe A"}` : "Représentez votre pays"}
        action={
          eligible && !intl.pendingCallUp ? (
            <Button variant="action" onClick={triggerCallUp}>
              <Flag /> Déclencher convocation
            </Button>
          ) : undefined
        }
      />

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard icon={<Globe />} value={career?.caps ?? 0} label="Sélections" tone="blue" />
        <StatCard icon={<Trophy />} value={career?.goals ?? 0} label="Buts" tone="green" />
        <StatCard icon={<Award />} value={career?.assists ?? 0} label="Passes D." tone="amber" />
        <StatCard icon={<Star />} value={career?.averageRating?.toFixed(1) ?? "—"} label="Note moyenne" tone="blue" />
      </div>

      {career?.isCaptain && (
        <div style={{ padding: "0.75rem 1rem", background: "var(--primary)", color: "white", borderRadius: "0.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Shield /> Capitaine de la sélection
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <Button key={t.id} variant={tab === t.id ? "career" : "ghost"} onClick={() => setTab(t.id)}>
            <t.icon /> {t.label}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: ease4 }}>

          {/* ---- OVERVIEW ---- */}
          {tab === "overview" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {career ? (
                <>
                  <div className="card" style={{ padding: "1.5rem" }}>
                    <h3 style={{ marginBottom: "1rem" }}>{career.team} — Statistiques</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", textAlign: "center" }}>
                      <div><strong style={{ fontSize: "2rem" }}>{career.caps}</strong><p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Sélections</p></div>
                      <div><strong style={{ fontSize: "2rem" }}>{career.goals}</strong><p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Buts</p></div>
                      <div><strong style={{ fontSize: "2rem" }}>{career.assists}</strong><p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Passes D.</p></div>
                    </div>
                  </div>
                  <div className="card" style={{ padding: "1.5rem" }}>
                    <h3 style={{ marginBottom: "0.75rem" }}>Convocations</h3>
                    {career.callUps.length === 0 ? (
                      <p style={{ opacity: 0.5 }}>Aucune convocation enregistrée.</p>
                    ) : (
                      <div style={{ display: "grid", gap: "0.5rem" }}>
                        {career.callUps.slice(-5).reverse().map(c => (
                          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0.75rem", background: "var(--muted)", borderRadius: "0.5rem" }}>
                            <span>Saison {c.seasonYear} — {c.level}</span>
                            <span style={{ color: c.accepted ? "var(--primary)" : "var(--destructive)" }}>
                              {c.accepted ? "Acceptée" : c.accepted === false ? "Refusée" : "En attente"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <Globe style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Pas encore sélectionné en équipe nationale.</p>
                  <p style={{ fontSize: "0.875rem", opacity: 0.6 }}>
                    {eligible ? "Vous êtes éligible ! Déclenchez une convocation." : `Rating minimum : 70 (Espoirs) ou 78 (Équipe A). Actuel : ${player?.overall ?? 0}.`}
                  </p>
                </div>
              )}

              {/* Tournament simulation buttons */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Button variant="outline" onClick={() => simulateTournament("world-cup")}>
                  <Trophy /> Simuler Coupe du Monde
                </Button>
                <Button variant="outline" onClick={() => simulateTournament("euro")}>
                  <Star /> Simuler Euro
                </Button>
              </div>
            </div>
          )}

          {/* ---- MATCHES ---- */}
          {tab === "matches" && (
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3 style={{ marginBottom: "1rem" }}>Matchs internationaux</h3>
              {career && career.matches.length > 0 ? (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {career.matches.slice(-15).reverse().map(m => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "var(--muted)", borderRadius: "0.5rem" }}>
                      <div>
                        <strong>{getCountryName(nationality)}</strong>
                        <span style={{ margin: "0 0.5rem" }}>{m.teamScore ?? 0} - {m.opponentScore ?? 0}</span>
                        <strong>{m.opponent}</strong>
                        {m.stage && <span style={{ fontSize: "0.75rem", opacity: 0.6, marginLeft: "0.5rem" }}>({STAGE_LABELS[m.stage] ?? m.stage})</span>}
                      </div>
                      <div style={{ textAlign: "right", fontSize: "0.875rem" }}>
                        <span style={{ fontWeight: 700 }}>{m.playerRating?.toFixed(1)}</span>
                        {(m.playerGoals ?? 0) > 0 && <span style={{ marginLeft: "0.5rem" }}>{m.playerGoals} but(s)</span>}
                        {(m.playerAssists ?? 0) > 0 && <span style={{ marginLeft: "0.5rem" }}>{m.playerAssists} PD</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ opacity: 0.5, textAlign: "center" }}>Aucun match international joué.</p>
              )}
            </div>
          )}

          {/* ---- TOURNAMENTS ---- */}
          {tab === "tournaments" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {career && career.tournaments.length > 0 ? (
                career.tournaments.map((t, i) => (
                  <div key={`${t.type}-${t.year}-${i}`} className="card" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <h3>{t.type === "world-cup" ? "Coupe du Monde" : "Euro"} {t.year}</h3>
                      <span style={{ padding: "0.25rem 0.75rem", background: t.stage === "final" ? "gold" : "var(--muted)", borderRadius: "1rem", fontSize: "0.875rem", fontWeight: 600 }}>
                        {STAGE_LABELS[t.stage] ?? t.stage}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", textAlign: "center" }}>
                      <div><strong>{t.matches.length}</strong><p style={{ fontSize: "0.75rem", opacity: 0.7 }}>Matchs</p></div>
                      <div><strong>{t.playerGoals}</strong><p style={{ fontSize: "0.75rem", opacity: 0.7 }}>Buts</p></div>
                      <div><strong>{t.playerAvgRating.toFixed(1)}</strong><p style={{ fontSize: "0.75rem", opacity: 0.7 }}>Note moy.</p></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <Trophy style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Aucun tournoi international disputé.</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Call-up modal */}
      <Dialog open={callUpModal} onOpenChange={setCallUpModal}>
        <DialogContent>
          <DialogTitle>Convocation en sélection</DialogTitle>
          <DialogDescription>
            {intl.pendingCallUp?.level === "U21" ? "L'équipe Espoirs" : "L'équipe nationale"} vous convoque !
          </DialogDescription>
          <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
            <p>Le sélectionneur de {getCountryName(nationality)} vous appelle pour la prochaine trêve internationale.</p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Button variant="action" onClick={() => respondCallUp(true)} style={{ flex: 1 }}>
                <Check /> Accepter
              </Button>
              <Button variant="outline" onClick={() => respondCallUp(false)} style={{ flex: 1 }}>
                <X /> Refuser
              </Button>
            </div>
            <p style={{ fontSize: "0.75rem", opacity: 0.5 }}>
              Refuser : -10 image publique, risque de ne plus être appelé.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

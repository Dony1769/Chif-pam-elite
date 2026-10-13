"use client";

/**
 * FC CAREER — Étape 11 : Médias, Blessures, Mental & Sanctions
 * Route: /client/fc-career/wellness
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Brain,
  HeartPulse,
  MessageSquare,
  Newspaper,
  Shield,
  Thermometer,
  X,
} from "lucide-react";
import { Shell, PageTitle, StatCard } from "../lib/components";
import { Button, Dialog, DialogContent, DialogTitle, DialogDescription } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import type { FullSave } from "../utils/storage";
import type { MentalState, SanctionState } from "../types/mental";
import type { ActiveInjury } from "../types/injury";
import type { PressConference, PressQuestion, PressQuestionChoice } from "../types/media";
import { INJURIES } from "../types/injury";
import { getMediaReaction } from "../types/media";
import {
  createMentalState,
  createSanctionState,
  psychologistSession,
  addPressure,
  relievePressure,
  pressurePerformancePenalty,
  checkBurnout,
  applyYellow,
  applyRed,
} from "../engine/mental-engine";
import {
  rollInjury,
  tickInjury,
  isSevereInjury,
  applyPostInjuryReturn,
  tickPostInjuryMatch,
  contactFearPenalties,
} from "../engine/injury-engine";
import {
  generatePressConference,
  applyPressAnswer,
} from "../engine/media-engine";
import { formatMoneyCompact } from "../utils/formatters";

type Tab = "mental" | "injuries" | "press" | "sanctions";

const TABS: { id: Tab; label: string; icon: typeof Brain }[] = [
  { id: "mental", label: "Mental", icon: Brain },
  { id: "injuries", label: "Blessures", icon: HeartPulse },
  { id: "press", label: "Médias", icon: Newspaper },
  { id: "sanctions", label: "Sanctions", icon: Shield },
];

const ease4 = [0.22, 1, 0.36, 1] as [number, number, number, number];

export default function WellnessPage() {
  const [save, setSave] = useState<FullSave | null>(null);
  const [tab, setTab] = useState<Tab>("mental");
  const [pressModal, setPressModal] = useState(false);
  const [activePressConf, setActivePressConf] = useState<PressConference | null>(null);

  useEffect(() => { setSave(loadGame()); }, []);

  const mental: MentalState = save?.meta?.mentalState ?? createMentalState();
  const injury: ActiveInjury | null = save?.meta?.activeInjury ?? null;
  const sanctions: SanctionState = save?.meta?.sanctionState ?? createSanctionState();
  const pressConfs: PressConference[] = save?.meta?.pressConferences ?? [];

  const persist = useCallback((updates: Partial<{ mentalState: MentalState; activeInjury: ActiveInjury | null; sanctionState: SanctionState; pressConferences: PressConference[] }>) => {
    setSave(prev => {
      if (!prev) return prev;
      const next: FullSave = { ...prev, meta: { ...prev.meta, ...updates } };
      saveGame(next);
      return next;
    });
  }, []);

  /* --- Actions --- */
  const doPsychSession = useCallback(() => {
    const updated = psychologistSession(mental);
    persist({ mentalState: updated });
  }, [mental, persist]);

  const doRest = useCallback(() => {
    const updated = relievePressure(mental, "rest");
    persist({ mentalState: updated });
  }, [mental, persist]);

  const openPressConference = useCallback(() => {
    const day = save?.meta?.season?.currentDay ?? 1;
    const conf = generatePressConference(day);
    setActivePressConf(conf);
    setPressModal(true);
  }, [save]);

  const answerPress = useCallback((conf: PressConference, question: PressQuestion, choice: PressQuestionChoice) => {
    const deltas = applyPressAnswer(choice);
    const updatedConf: PressConference = {
      ...conf,
      answers: [...conf.answers, { questionId: question.id, choiceId: choice.id }],
    };
    setActivePressConf(updatedConf);

    // Apply pressure delta
    let updatedMental = { ...mental };
    if (deltas.pressureDelta > 0) updatedMental = addPressure(updatedMental, "media-criticism");
    else if (deltas.pressureDelta < 0) updatedMental = relievePressure(updatedMental, "victory");

    // If all questions answered, save conference
    if (updatedConf.answers.length >= updatedConf.questions.length) {
      const updatedConfs = [...pressConfs, updatedConf];
      persist({ mentalState: updatedMental, pressConferences: updatedConfs });
      setTimeout(() => setPressModal(false), 1200);
    } else {
      persist({ mentalState: updatedMental });
    }
  }, [mental, pressConfs, persist]);

  if (!save) {
    return (
      <Shell>
        <PageTitle eyebrow="ÉTAPE 11" title="Santé & Médias" subtitle="Chargement..." />
      </Shell>
    );
  }

  const pressurePenalty = pressurePerformancePenalty(mental.pressure);
  const fearPenalties = contactFearPenalties(mental.contactFear);
  const injuryDef = injury ? INJURIES.find(i => i.type === injury.type) : null;

  return (
    <Shell>
      <PageTitle
        eyebrow="ÉTAPE 11"
        title="Santé & Médias"
        subtitle="Mental, blessures, presse et sanctions"
        action={
          <Button variant="outline" onClick={openPressConference}>
            <MessageSquare /> Conférence de presse
          </Button>
        }
      />

      {/* Stat summary */}
      <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard icon={<Brain />} value={`${mental.pressure}/100`} label="Pression" tone={mental.pressure > 70 ? "red" : mental.pressure > 40 ? "amber" : "green"} />
        <StatCard icon={<HeartPulse />} value={injury ? `${injury.daysLeft}j` : "OK"} label={injury ? (injuryDef?.label ?? "Blessé") : "Aucune blessure"} tone={injury ? "red" : "green"} />
        <StatCard icon={<Shield />} value={`${sanctions.yellowsThisSeason}/${sanctions.redsThisSeason}`} label="Jaunes / Rouges" tone={sanctions.suspensionMatchesLeft > 0 ? "red" : "blue"} />
        <StatCard icon={<Activity />} value={pressurePenalty === 0 ? "—" : `${pressurePenalty}%`} label="Impact perf." tone={pressurePenalty < -5 ? "red" : "blue"} />
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <Button key={t.id} variant={tab === t.id ? "career" : "ghost"} onClick={() => setTab(t.id)}>
            <t.icon /> {t.label}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: ease4 }}>

          {/* ---- MENTAL ---- */}
          {tab === "mental" && (
            <div className="card-grid" style={{ display: "grid", gap: "1rem" }}>
              {/* Pressure bar */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Thermometer /> Pression mentale
                </h3>
                <div style={{ background: "var(--muted)", borderRadius: "0.5rem", height: "1.5rem", overflow: "hidden", marginBottom: "0.75rem" }}>
                  <motion.div
                    style={{ height: "100%", borderRadius: "0.5rem", background: mental.pressure > 85 ? "var(--destructive)" : mental.pressure > 70 ? "var(--warning, orange)" : "var(--primary)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${mental.pressure}%` }}
                    transition={{ duration: 0.6, ease: ease4 }}
                  />
                </div>
                <p style={{ fontSize: "0.875rem", opacity: 0.7, marginBottom: "1rem" }}>
                  {mental.pressure > 95 && "BURNOUT IMMINENT ! Repos obligatoire."}
                  {mental.pressure > 85 && mental.pressure <= 95 && "Risque de burnout ! Fatigue permanente +15."}
                  {mental.pressure > 70 && mental.pressure <= 85 && "Anxiété pré-match : -5% performance."}
                  {mental.pressure <= 70 && "Niveau de pression gérable."}
                </p>
                {mental.burnout && (
                  <div style={{ padding: "0.75rem", background: "var(--destructive)", borderRadius: "0.5rem", color: "white", marginBottom: "1rem" }}>
                    <AlertTriangle style={{ display: "inline", marginRight: "0.5rem" }} />
                    Burnout actif — {mental.burnoutDaysLeft} jours restants sans match
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Button variant="outline" onClick={doPsychSession} disabled={mental.psychSessionsThisWeek >= 2}>
                    <Brain /> Psychologue (-15 pression)
                  </Button>
                  <Button variant="outline" onClick={doRest}>
                    Repos (-10 pression)
                  </Button>
                </div>
              </div>

              {/* Contact fear */}
              {mental.contactFear > 0 && (
                <div className="card" style={{ padding: "1.5rem" }}>
                  <h3 style={{ marginBottom: "0.75rem" }}>Peur du contact</h3>
                  <div style={{ background: "var(--muted)", borderRadius: "0.5rem", height: "1rem", overflow: "hidden", marginBottom: "0.5rem" }}>
                    <div style={{ height: "100%", width: `${mental.contactFear}%`, background: "var(--warning, orange)", borderRadius: "0.5rem" }} />
                  </div>
                  <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>
                    Tacle {fearPenalties.tacklePenalty}% · Agressivité {fearPenalties.aggressionPenalty}% · Accélération {fearPenalties.accelerationPenalty}%
                  </p>
                  <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>
                    {mental.matchesSinceReturn} match(s) sans re-blessure. {8 - mental.matchesSinceReturn > 0 ? `Encore ${8 - mental.matchesSinceReturn} pour guérir.` : ""}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ---- INJURIES ---- */}
          {tab === "injuries" && (
            <div className="card-grid" style={{ display: "grid", gap: "1rem" }}>
              {injury ? (
                <div className="card" style={{ padding: "1.5rem" }}>
                  <h3 style={{ marginBottom: "0.75rem" }}>
                    {injuryDef?.emoji} {injuryDef?.label ?? injury.type}
                  </h3>
                  <div style={{ background: "var(--muted)", borderRadius: "0.5rem", height: "1rem", overflow: "hidden", marginBottom: "0.5rem" }}>
                    <div style={{ height: "100%", width: `${((injury.totalDays - injury.daysLeft) / injury.totalDays) * 100}%`, background: "var(--primary)", borderRadius: "0.5rem" }} />
                  </div>
                  <p style={{ fontSize: "0.875rem" }}>
                    {injury.daysLeft} jours restants / {injury.totalDays} jours total
                  </p>
                  {isSevereInjury(injury) && (
                    <p style={{ fontSize: "0.875rem", opacity: 0.7, marginTop: "0.5rem" }}>
                      Blessure grave — reconstruction mentale nécessaire au retour.
                    </p>
                  )}
                </div>
              ) : (
                <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                  <HeartPulse style={{ margin: "0 auto 0.75rem", opacity: 0.3 }} />
                  <p>Aucune blessure active</p>
                </div>
              )}

              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "0.75rem" }}>Risques de blessure</h3>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {INJURIES.map(def => (
                    <div key={def.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                      <span>{def.emoji} {def.label}</span>
                      <span style={{ fontSize: "0.875rem", opacity: 0.7 }}>
                        {def.durationDays[0]}-{def.durationDays[1]}j · {def.frequency}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---- PRESS ---- */}
          {tab === "press" && (
            <div className="card-grid" style={{ display: "grid", gap: "1rem" }}>
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "0.75rem" }}>
                  <Newspaper style={{ display: "inline", marginRight: "0.5rem" }} />
                  Conférences de presse
                </h3>
                {pressConfs.length === 0 ? (
                  <p style={{ opacity: 0.5 }}>Aucune conférence de presse pour le moment.</p>
                ) : (
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {pressConfs.slice(-5).reverse().map(conf => (
                      <div key={conf.id} style={{ padding: "0.75rem", background: "var(--muted)", borderRadius: "0.5rem" }}>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Jour {conf.dayNumber}</span>
                        <span style={{ fontSize: "0.75rem", opacity: 0.6, marginLeft: "0.5rem" }}>
                          {conf.answers.length}/{conf.questions.length} réponses
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <Button onClick={openPressConference}>
                  <MessageSquare /> Nouvelle conférence
                </Button>
              </div>
            </div>
          )}

          {/* ---- SANCTIONS ---- */}
          {tab === "sanctions" && (
            <div className="card-grid" style={{ display: "grid", gap: "1rem" }}>
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Sanctions cette saison</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <strong style={{ fontSize: "2rem" }}>{sanctions.yellowsThisSeason}</strong>
                    <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Cartons jaunes</p>
                  </div>
                  <div>
                    <strong style={{ fontSize: "2rem" }}>{sanctions.redsThisSeason}</strong>
                    <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Cartons rouges</p>
                  </div>
                  <div>
                    <strong style={{ fontSize: "2rem" }}>{sanctions.suspensionMatchesLeft}</strong>
                    <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Matchs suspension</p>
                  </div>
                  <div>
                    <strong style={{ fontSize: "2rem" }}>{formatMoneyCompact(sanctions.totalFines)}</strong>
                    <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Amendes cumulées</p>
                  </div>
                </div>
              </div>
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "0.75rem" }}>Seuils de suspension</h3>
                <ul style={{ fontSize: "0.875rem", lineHeight: 1.8, listStyle: "none", padding: 0 }}>
                  <li>3 jaunes en 10 matchs = 1 match</li>
                  <li>5 jaunes / saison = 1 match</li>
                  <li>10 jaunes / saison = 2 matchs</li>
                  <li>Rouge = 1-3 matchs</li>
                  <li>3 rouges / saison = audition (3-5 matchs)</li>
                </ul>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Press conference modal */}
      <Dialog open={pressModal} onOpenChange={setPressModal}>
        <DialogContent>
          <DialogTitle>Conférence de presse</DialogTitle>
          <DialogDescription>Répondez aux questions des journalistes</DialogDescription>
          {activePressConf && (
            <div style={{ display: "grid", gap: "1.5rem", marginTop: "1rem" }}>
              {activePressConf.questions.map((q, qi) => {
                const answered = activePressConf.answers.find(a => a.questionId === q.id);
                const isNext = !answered && activePressConf.answers.length === qi;
                return (
                  <div key={q.id} style={{ opacity: answered ? 0.5 : isNext ? 1 : 0.3, transition: "opacity 0.3s" }}>
                    <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Q{qi + 1}: {q.question}</p>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {q.choices.map(c => (
                        <Button
                          key={c.id}
                          variant={answered?.choiceId === c.id ? "career" : "outline"}
                          disabled={!!answered || !isNext}
                          onClick={() => answerPress(activePressConf, q, c)}
                          style={{ justifyContent: "flex-start", textAlign: "left" }}
                        >
                          {c.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {activePressConf.answers.length >= activePressConf.questions.length && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", fontWeight: 600, color: "var(--primary)" }}>
                  Conférence terminée !
                </motion.p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

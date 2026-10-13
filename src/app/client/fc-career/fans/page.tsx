"use client";

/**
 * FC CAREER — Étape 16 : Fans, Vestiaire & Capitanat
 * Route: /client/fc-career/fans
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Users,
  Crown,
  Megaphone,
  Shirt,
  HandHeart,
  Swords,
  Handshake,
  ShieldAlert,
} from "lucide-react";
import { Shell, PageTitle, StatCard } from "../lib/components";
import { Button, Dialog, DialogContent, DialogTitle, DialogDescription } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import type { FullSave } from "../utils/storage";
import type { FansVestiaireState, FanAction, ConflictChoice, SpeechType } from "../types/relationship";
import {
  createFansVestiaireState,
  performFanAction,
  getAvailableFanActions,
  adjustPopularity,
  generateConflict,
  resolveConflict,
  adjustCohesion,
  checkCaptainEligibility,
  appointCaptain,
  giveSpeech,
  getSpeechOptions,
  doToss,
} from "../engine/fan-engine";

type Tab = "fans" | "vestiaire" | "captain";

const TABS: { id: Tab; label: string; icon: typeof Heart }[] = [
  { id: "fans", label: "Fans", icon: Heart },
  { id: "vestiaire", label: "Vestiaire", icon: Users },
  { id: "captain", label: "Capitanat", icon: Crown },
];

const ease4 = [0.22, 1, 0.36, 1] as [number, number, number, number];

const MOOD_LABEL: Record<string, string> = { united: "Uni", neutral: "Neutre", divided: "Divisé" };
const MOOD_COLOR: Record<string, string> = { united: "var(--primary)", neutral: "var(--warning, orange)", divided: "var(--destructive)" };
const ROLE_LABEL: Record<string, string> = { leader: "Leader", follower: "Suiveur", hothead: "Tête brûlée", youngster: "Jeune" };

export default function FansPage() {
  const [save, setSave] = useState<FullSave | null>(null);
  const [tab, setTab] = useState<Tab>("fans");
  const [conflictModal, setConflictModal] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  useEffect(() => { setSave(loadGame()); }, []);

  const fvState: FansVestiaireState = save?.meta?.fansState ?? createFansVestiaireState();
  const player = save?.player;
  const currentDay = save?.meta?.season?.currentDay ?? 1;

  const persist = useCallback((updated: FansVestiaireState) => {
    setSave(prev => {
      if (!prev) return prev;
      const next: FullSave = { ...prev, meta: { ...prev.meta, fansState: updated } };
      saveGame(next);
      return next;
    });
  }, []);

  const handleFanAction = useCallback((action: FanAction) => {
    const { state: updatedFan, result } = performFanAction(fvState.fan, action);
    persist({ ...fvState, fan: updatedFan });
    setLastMessage(result.description);
  }, [fvState, persist]);

  const handleGenerateConflict = useCallback(() => {
    const updated = generateConflict(fvState.lockerRoom, currentDay);
    persist({ ...fvState, lockerRoom: updated });
  }, [fvState, currentDay, persist]);

  const handleResolveConflict = useCallback((conflictId: string, choice: ConflictChoice) => {
    const leadership = player?.overall ?? 60;
    const { state: updated, message } = resolveConflict(fvState.lockerRoom, conflictId, choice, leadership);
    persist({ ...fvState, lockerRoom: updated });
    setLastMessage(message);
    setConflictModal(null);
  }, [fvState, player, persist]);

  const handleBecomeCaptain = useCallback(() => {
    const updated = appointCaptain(fvState.captain);
    persist({ ...fvState, captain: updated });
    setLastMessage("Tu es nommé capitaine ! 🎖️");
  }, [fvState, persist]);

  const handleSpeech = useCallback((type: SpeechType) => {
    const { state: updated, result } = giveSpeech(fvState.captain, type);
    persist({ ...fvState, captain: updated });
    setLastMessage(`Discours : "${result.label}" → Perf équipe ${result.perfBonus > 0 ? `+${result.perfBonus}%` : "stable"}`);
  }, [fvState, persist]);

  const handleToss = useCallback(() => {
    const { state: updated, won } = doToss(fvState.captain);
    persist({ ...fvState, captain: updated });
    setLastMessage(won ? "Tu remportes le toss ! ⚽" : "Toss perdu.");
  }, [fvState, persist]);

  if (!save) {
    return (
      <Shell>
        <PageTitle eyebrow="ÉTAPE 16" title="Fans & Vestiaire" subtitle="Chargement..." />
      </Shell>
    );
  }

  const { fan, lockerRoom, captain } = fvState;
  const canBeCaptain = player ? checkCaptainEligibility(player.overall, player.age, 2) : false;
  const unresolvedConflicts = lockerRoom.conflicts.filter(c => !c.resolved);
  const fanActions = getAvailableFanActions();
  const speechOptions = getSpeechOptions();
  const activeConflict = conflictModal ? lockerRoom.conflicts.find(c => c.id === conflictModal) : null;

  return (
    <Shell>
      <PageTitle
        eyebrow="ÉTAPE 16"
        title="Fans & Vestiaire"
        subtitle="Popularité, cohésion et leadership"
      />

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard icon={<Heart />} value={fan.popularity} label="Popularité" tone={fan.popularity >= 70 ? "green" : fan.popularity >= 30 ? "amber" : "red"} />
        <StatCard icon={<Users />} value={lockerRoom.cohesion} label="Cohésion" tone={lockerRoom.mood === "united" ? "green" : lockerRoom.mood === "divided" ? "red" : "amber"} />
        <StatCard icon={<Crown />} value={captain.isCaptain ? "Oui" : "Non"} label="Capitaine" tone={captain.isCaptain ? "green" : "blue"} />
        <StatCard icon={<Swords />} value={unresolvedConflicts.length} label="Conflits" tone={unresolvedConflicts.length > 0 ? "red" : "green"} />
      </div>

      {/* Fan status banner */}
      {(fan.isIdol || fan.fansSingName || fan.fansWhistle || fan.fansDemandDeparture) && (
        <div style={{
          padding: "0.75rem 1rem",
          background: fan.isIdol ? "var(--primary)" : fan.fansSingName ? "var(--primary)" : "var(--destructive)",
          color: "white", borderRadius: "0.5rem", marginBottom: "1.5rem", fontSize: "0.875rem"
        }}>
          {fan.isIdol && "🌟 Tu es une IDOLE ! Maillot le plus vendu du club."}
          {!fan.isIdol && fan.fansSingName && "🎵 Les fans chantent ton nom ! Tifo à ton effigie."}
          {fan.fansWhistle && !fan.fansDemandDeparture && "😤 Les fans te sifflent à domicile. Pression +15."}
          {fan.fansDemandDeparture && "🚪 Les fans demandent ton départ !"}
        </div>
      )}

      {/* Feedback */}
      {lastMessage && (
        <div style={{ padding: "0.75rem 1rem", background: "var(--muted)", borderRadius: "0.5rem", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
          {lastMessage}
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

          {/* ---- FANS ---- */}
          {tab === "fans" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {/* Popularity bar */}
              <div className="card" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <strong>Cote de popularité</strong>
                  <span style={{ fontWeight: 600 }}>{fan.popularity}/100</span>
                </div>
                <div style={{ background: "var(--muted)", borderRadius: "0.5rem", height: "0.75rem", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: "0.5rem",
                    width: `${fan.popularity}%`,
                    background: fan.popularity >= 70 ? "var(--primary)" : fan.popularity >= 30 ? "var(--warning, orange)" : "var(--destructive)",
                  }} />
                </div>
              </div>

              {/* Fan actions */}
              <div className="card" style={{ padding: "1.25rem" }}>
                <strong style={{ marginBottom: "0.75rem", display: "block" }}>Actions fans</strong>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {fanActions.map(a => (
                    <Button
                      key={a.action}
                      variant="outline"
                      onClick={() => handleFanAction(a.action)}
                      disabled={a.action === "throw-jersey" && fan.jerseysAvailable <= 0}
                      style={{ justifyContent: "flex-start", textAlign: "left" }}
                    >
                      {a.action === "throw-jersey" && <Shirt />}
                      {a.action === "go-to-fans" && <HandHeart />}
                      {a.action === "ignore-fans" && <ShieldAlert />}
                      {a.action === "applaud-away-fans" && <Handshake />}
                      <span>{a.label} {a.action === "throw-jersey" && `(${fan.jerseysAvailable} dispo)`}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---- VESTIAIRE ---- */}
          {tab === "vestiaire" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {/* Mood */}
              <div className="card" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <strong>Ambiance du vestiaire</strong>
                  <span style={{ padding: "0.25rem 0.75rem", borderRadius: "1rem", fontSize: "0.8rem", fontWeight: 600, background: MOOD_COLOR[lockerRoom.mood], color: "white" }}>
                    {MOOD_LABEL[lockerRoom.mood]}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem" }}>Cohésion</span>
                  <span style={{ fontWeight: 600 }}>{lockerRoom.cohesion}/100</span>
                </div>
                <div style={{ background: "var(--muted)", borderRadius: "0.5rem", height: "0.5rem", overflow: "hidden", marginBottom: "0.75rem" }}>
                  <div style={{
                    height: "100%", borderRadius: "0.5rem",
                    width: `${lockerRoom.cohesion}%`,
                    background: MOOD_COLOR[lockerRoom.mood],
                  }} />
                </div>
                <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                  Bonus perf équipe : {lockerRoom.perfBonus > 0 ? `+${lockerRoom.perfBonus}%` : lockerRoom.perfBonus < 0 ? `${lockerRoom.perfBonus}%` : "0%"}
                </p>
              </div>

              {/* Members */}
              <div className="card" style={{ padding: "1.25rem" }}>
                <strong style={{ marginBottom: "0.75rem", display: "block" }}>Membres du vestiaire</strong>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {lockerRoom.members.map(m => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", background: "var(--muted)", borderRadius: "0.5rem" }}>
                      <div>
                        <span style={{ fontWeight: 500 }}>{m.name}</span>
                        <span style={{ fontSize: "0.75rem", opacity: 0.6, marginLeft: "0.5rem" }}>{ROLE_LABEL[m.role]}</span>
                      </div>
                      <span style={{ fontSize: "0.8rem" }}>Moral {m.morale}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conflicts */}
              <div className="card" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <strong>Conflits</strong>
                  <Button variant="outline" onClick={handleGenerateConflict} style={{ fontSize: "0.8rem" }}>
                    <Swords /> Simuler conflit
                  </Button>
                </div>
                {lockerRoom.conflicts.length === 0 ? (
                  <p style={{ fontSize: "0.85rem", opacity: 0.5 }}>Aucun conflit. Le vestiaire est calme.</p>
                ) : (
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {lockerRoom.conflicts.slice(-5).reverse().map(c => (
                      <div key={c.id} style={{ padding: "0.75rem", background: c.resolved ? "var(--muted)" : "rgba(239,68,68,0.1)", borderRadius: "0.5rem", opacity: c.resolved ? 0.6 : 1 }}>
                        <p style={{ fontSize: "0.85rem", fontWeight: 500 }}>{c.player1} et {c.player2} {c.description}</p>
                        {c.resolved ? (
                          <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>Résolu</span>
                        ) : (
                          <Button variant="action" onClick={() => setConflictModal(c.id)} style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
                            Intervenir
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---- CAPTAIN ---- */}
          {tab === "captain" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {!captain.isCaptain ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <Crown style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p style={{ marginBottom: "1rem" }}>Tu n&apos;es pas encore capitaine.</p>
                  {canBeCaptain ? (
                    <Button variant="action" onClick={handleBecomeCaptain}>
                      <Crown /> Devenir capitaine
                    </Button>
                  ) : (
                    <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>
                      Requis : OVR ≥ 82, âge ≥ 22, 2+ saisons au club
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Captain badge */}
                  <div className="card" style={{ padding: "1.25rem", background: "var(--primary)", color: "white" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <Crown style={{ width: 32, height: 32 }} />
                      <div>
                        <strong style={{ fontSize: "1.1rem" }}>Capitaine</strong>
                        <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>Toss : {captain.tossWins}/{captain.tossTotal} gagnés</p>
                      </div>
                    </div>
                  </div>

                  {/* Pre-match speech */}
                  <div className="card" style={{ padding: "1.25rem" }}>
                    <strong style={{ marginBottom: "0.75rem", display: "block" }}>
                      <Megaphone style={{ display: "inline", width: 16, height: 16, marginRight: "0.5rem" }} />
                      Discours d&apos;avant-match
                    </strong>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {speechOptions.map(s => (
                        <Button
                          key={s.type}
                          variant={captain.lastSpeech === s.type ? "career" : "outline"}
                          onClick={() => handleSpeech(s.type)}
                          style={{ justifyContent: "flex-start" }}
                        >
                          {s.type === "motivating" && "🔥"}
                          {s.type === "calm" && "🧘"}
                          {s.type === "aggressive" && "⚡"}
                          <span style={{ marginLeft: "0.5rem" }}>
                            {s.label}
                            <span style={{ fontSize: "0.75rem", opacity: 0.6, marginLeft: "0.5rem" }}>
                              (perf {s.perfBonus > 0 ? `+${s.perfBonus}%` : "0%"}{s.cardRiskBonus > 0 ? `, cartons +${s.cardRiskBonus}%` : ""}{s.requiresWin ? ", si victoire" : ""})
                            </span>
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Toss */}
                  <div className="card" style={{ padding: "1.25rem" }}>
                    <strong style={{ marginBottom: "0.75rem", display: "block" }}>Toss d&apos;avant-match</strong>
                    <Button variant="action" onClick={handleToss}>
                      ⚽ Lancer le toss
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Conflict resolution modal */}
      <Dialog open={!!conflictModal} onOpenChange={() => setConflictModal(null)}>
        <DialogContent>
          <DialogTitle>Gérer le conflit</DialogTitle>
          <DialogDescription>
            {activeConflict ? `${activeConflict.player1} et ${activeConflict.player2} ${activeConflict.description}` : ""}
          </DialogDescription>
          {conflictModal && (
            <div style={{ display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
              <Button variant="action" onClick={() => handleResolveConflict(conflictModal, "mediate")}>
                🤝 Jouer le médiateur
              </Button>
              <Button variant="outline" onClick={() => handleResolveConflict(conflictModal, "side-player1")}>
                👈 Soutenir {activeConflict?.player1}
              </Button>
              <Button variant="outline" onClick={() => handleResolveConflict(conflictModal, "side-player2")}>
                👉 Soutenir {activeConflict?.player2}
              </Button>
              <Button variant="ghost" onClick={() => handleResolveConflict(conflictModal, "ignore")}>
                😐 Ignorer le conflit
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

"use client";

/**
 * FC CAREER — Étape 9 : Agents, Contrats & Sagas de Transfert
 * Route: /client/fc-career/agent
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Clock,
  FileText,
  Handshake,
  Newspaper,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Shell, PageTitle } from "../lib/components";
import { Button } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import { toCareerState, toFullSave, type CareerRuntimeState } from "../types/career";
import { getClub } from "../constants/clubs";
import { formatMoneyCompact } from "../utils/formatters";
import {
  AGENT_PROFILES,
  type AgentProfileId,
  type AgentState,
  type MercatoState,
  type TransferSaga,
  type TransferSagaEvent,
} from "../types/agent";
import {
  createAgentState,
  changeAgent,
  getAgentProfile,
  getMercatoWindow,
  createMercatoState,
  generatePotentialSagas,
  tickSaga,
  applySagaChoice,
  applyAcceptedTransfer,
  generateExtensionOffer,
  generateContractOffer,
  negotiateContract,
} from "../engine/agent-system";
import { createRng } from "../engine/player-generator";

type Tab = "agent" | "contract" | "mercato" | "saga";

const ease: [number, number, number, number] = [0.4, 0, 0.2, 1];

export default function AgentPage() {
  const router = useRouter();
  const [career, setCareer] = useState<CareerRuntimeState | null>(null);
  const [tab, setTab] = useState<Tab>("agent");
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [mercato, setMercato] = useState<MercatoState | null>(null);
  const [activeSaga, setActiveSaga] = useState<TransferSaga | null>(null);
  const [sagaEventIdx, setSagaEventIdx] = useState(0);
  const [showChangeConfirm, setShowChangeConfirm] = useState(false);
  const [pendingAgentId, setPendingAgentId] = useState<AgentProfileId | null>(null);

  useEffect(() => {
    const save = loadGame();
    if (!save?.player) {
      router.replace("/client/fc-career/create-player");
      return;
    }
    const state = toCareerState(save);
    setCareer(state);

    // Charger ou initialiser l'état agent depuis meta
    if (save.meta.agentState) {
      setAgentState(save.meta.agentState);
    }

    // Charger mercato
    const dayNumber = save.meta.season?.currentDay ?? 0;
    setMercato(save.meta.mercatoState ?? createMercatoState(dayNumber));
  }, [router]);

  const persist = useCallback(
    (next: CareerRuntimeState, agent?: AgentState, merc?: MercatoState) => {
      setCareer(next);
      const full = toFullSave(next);
      if (agent) {
        full.meta.agentState = agent;
        setAgentState(agent);
      }
      if (merc) {
        full.meta.mercatoState = merc;
        setMercato(merc);
      }
      saveGame(full);
    },
    [],
  );

  if (!career?.player) return null;
  const { player } = career;
  const club = getClub(player.contract.clubId);
  const dayNumber = career.meta.season?.currentDay ?? 0;
  const window = getMercatoWindow(dayNumber);

  /* ---- Agent selection ---- */
  function handleSelectAgent(profileId: AgentProfileId) {
    if (!career?.player) return;
    if (agentState) {
      setPendingAgentId(profileId);
      setShowChangeConfirm(true);
      return;
    }
    const newState = createAgentState(profileId, dayNumber);
    persist(career, newState, mercato ?? undefined);
  }

  function confirmChangeAgent() {
    if (!career?.player || !agentState || !pendingAgentId) return;
    const newState = changeAgent(agentState, pendingAgentId, dayNumber);
    persist(career, newState, mercato ?? undefined);
    setShowChangeConfirm(false);
    setPendingAgentId(null);
  }

  /* ---- Saga interactions ---- */
  function handleSagaChoice(saga: TransferSaga, eventId: string, choiceId: string) {
    if (!career?.player || !agentState) return;
    const event = saga.events.find((e) => e.id === eventId);
    const choice = event?.choices?.find((c) => c.id === choiceId);
    if (!choice) return;

    let updatedSaga = applySagaChoice(saga, eventId, choice);

    // Appliquer les effets sur le joueur
    let updatedPlayer = { ...career.player };
    if (choice.effect.moraleDelta) {
      updatedPlayer = { ...updatedPlayer, morale: Math.max(0, Math.min(100, updatedPlayer.morale + choice.effect.moraleDelta)) };
    }

    // Si transfert accepté, appliquer
    if (updatedSaga.status === "accepted") {
      updatedPlayer = applyAcceptedTransfer(updatedPlayer, updatedSaga);
    }

    const updatedMercato: MercatoState = {
      ...(mercato ?? createMercatoState(dayNumber)),
      activeSagas: (mercato?.activeSagas ?? []).map((s) => (s.id === saga.id ? updatedSaga : s)),
    };

    setActiveSaga(updatedSaga);
    persist({ ...career, player: updatedPlayer }, agentState, updatedMercato);
  }

  /* ---- Render helpers ---- */
  const profile = agentState ? getAgentProfile(agentState.profileId) : null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "agent", label: "Agent", icon: <Briefcase size={16} /> },
    { id: "contract", label: "Contrat", icon: <FileText size={16} /> },
    { id: "mercato", label: "Mercato", icon: <TrendingUp size={16} /> },
    { id: "saga", label: "Transferts", icon: <Newspaper size={16} /> },
  ];

  return (
    <Shell>
      <div className="fcl page-agent">
        <PageTitle eyebrow="ÉTAPE 9" title="Agents & Transferts" subtitle="Gère ton agent, tes contrats et le mercato" />

        {/* Tabs */}
        <div className="fcl tabs-row" style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`fcl tab-btn ${tab === t.id ? "active" : ""}`}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                borderRadius: 10, border: "1px solid var(--fcl-border)",
                background: tab === t.id ? "var(--fcl-accent)" : "var(--fcl-card)",
                color: tab === t.id ? "#fff" : "var(--fcl-text)",
                fontWeight: tab === t.id ? 600 : 400, fontSize: 13, cursor: "pointer",
                transition: "all .2s",
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "agent" && (
            <motion.div key="agent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease }}>
              <AgentTab
                agentState={agentState}
                profile={profile}
                onSelect={handleSelectAgent}
                cooldown={agentState?.cooldownDaysLeft ?? 0}
              />
            </motion.div>
          )}

          {tab === "contract" && (
            <motion.div key="contract" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease }}>
              <ContractTab player={player} clubName={club?.name ?? "—"} />
            </motion.div>
          )}

          {tab === "mercato" && (
            <motion.div key="mercato" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease }}>
              <MercatoTab
                window={window}
                mercato={mercato}
                player={player}
                agentState={agentState}
                dayNumber={dayNumber}
                onStartSaga={(saga) => { setActiveSaga(saga); setTab("saga"); setSagaEventIdx(0); }}
                persist={persist}
                career={career}
              />
            </motion.div>
          )}

          {tab === "saga" && (
            <motion.div key="saga" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease }}>
              <SagaTab
                saga={activeSaga}
                eventIdx={sagaEventIdx}
                onNextEvent={() => setSagaEventIdx((i) => i + 1)}
                onChoice={handleSagaChoice}
                player={player}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Change agent confirm */}
        {showChangeConfirm && pendingAgentId && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ background: "var(--fcl-card)", borderRadius: 16, padding: 24, maxWidth: 360, width: "100%" }}
            >
              <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>⚠️ Changer d&apos;agent ?</h3>
              <p style={{ fontSize: 13, color: "var(--fcl-muted)", margin: "0 0 16px" }}>
                Pénalité : 10% de ton salaire + 6 mois sans agent actif.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={() => setShowChangeConfirm(false)} variant="ghost" style={{ flex: 1 }}>Annuler</Button>
                <Button onClick={confirmChangeAgent} style={{ flex: 1, background: "var(--fcl-accent)", color: "#fff" }}>Confirmer</Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* Agent Tab                                                          */
/* ================================================================== */

function AgentTab({
  agentState,
  profile,
  onSelect,
  cooldown,
}: {
  agentState: AgentState | null;
  profile: ReturnType<typeof getAgentProfile> | null;
  onSelect: (id: AgentProfileId) => void;
  cooldown: number;
}) {
  return (
    <div>
      {agentState && profile ? (
        <div style={{ marginBottom: 20 }}>
          <div className="fcl card" style={{ padding: 16, borderRadius: 14, background: "var(--fcl-card)", border: "1px solid var(--fcl-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 32 }}>{profile.emoji}</span>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>{profile.name}</h3>
                <p style={{ margin: 0, fontSize: 12, color: "var(--fcl-muted)" }}>Commission : {Math.round(profile.commission * 100)}%</p>
              </div>
              {cooldown > 0 && (
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fcl-warning)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={12} /> {cooldown}j restants
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
              <div><span style={{ color: "var(--fcl-muted)" }}>Forces :</span> {profile.strengths}</div>
              <div><span style={{ color: "var(--fcl-muted)" }}>Faiblesses :</span> {profile.weaknesses}</div>
              <div><span style={{ color: "var(--fcl-muted)" }}>Salaire ×</span> {profile.salaryMultiplier}</div>
              <div><span style={{ color: "var(--fcl-muted)" }}>Sponsors ×</span> {profile.sponsorMultiplier}</div>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 14, color: "var(--fcl-muted)", marginBottom: 16 }}>
          Choisis ton agent. Ce choix est important pour ta carrière.
        </p>
      )}

      <h4 style={{ fontSize: 14, margin: "0 0 12px", color: "var(--fcl-muted)" }}>
        {agentState ? "Changer d'agent" : "Choisir ton agent"}
      </h4>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {AGENT_PROFILES.map((ap) => {
          const isCurrent = agentState?.profileId === ap.id;
          return (
            <motion.button
              key={ap.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => !isCurrent && onSelect(ap.id)}
              disabled={isCurrent}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: 14,
                borderRadius: 12, border: isCurrent ? "2px solid var(--fcl-accent)" : "1px solid var(--fcl-border)",
                background: isCurrent ? "color-mix(in oklch, var(--fcl-accent) 10%, var(--fcl-card))" : "var(--fcl-card)",
                cursor: isCurrent ? "default" : "pointer", textAlign: "left", width: "100%",
                opacity: isCurrent ? 0.7 : 1,
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{ap.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                  {ap.name} <span style={{ fontWeight: 400, fontSize: 12, color: "var(--fcl-muted)" }}>({Math.round(ap.commission * 100)}%)</span>
                  {isCurrent && <Check size={14} style={{ marginLeft: 6, color: "var(--fcl-accent)" }} />}
                </div>
                <div style={{ fontSize: 12, color: "var(--fcl-muted)" }}>
                  ✅ {ap.strengths}
                </div>
                <div style={{ fontSize: 12, color: "var(--fcl-muted)" }}>
                  ⚠️ {ap.weaknesses}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Contract Tab                                                       */
/* ================================================================== */

function ContractTab({ player, clubName }: { player: NonNullable<CareerRuntimeState["player"]>; clubName: string }) {
  const c = player.contract;
  const rows: { label: string; value: string }[] = [
    { label: "Club", value: clubName },
    { label: "Salaire / semaine", value: formatMoneyCompact(c.salaryPerWeek) },
    { label: "Prime de match", value: formatMoneyCompact(c.bonusPerMatch) },
    { label: "Prime par but", value: formatMoneyCompact(c.bonusPerGoal) },
    { label: "Prime à la signature", value: formatMoneyCompact(c.signingBonus) },
    { label: "Clause libératoire", value: c.releaseClause > 0 ? formatMoneyCompact(c.releaseClause) : "Aucune" },
    { label: "Durée restante", value: `${c.yearsRemaining} saison${c.yearsRemaining > 1 ? "s" : ""}` },
    { label: "Statut", value: c.isProfessional ? "Professionnel" : "Amateur" },
  ];

  return (
    <div>
      <div className="fcl card" style={{ padding: 16, borderRadius: 14, background: "var(--fcl-card)", border: "1px solid var(--fcl-border)" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={16} /> Contrat actuel
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px solid var(--fcl-border)" }}>
              <span style={{ color: "var(--fcl-muted)" }}>{r.label}</span>
              <span style={{ fontWeight: 500 }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "color-mix(in oklch, var(--fcl-accent) 8%, var(--fcl-bg))", fontSize: 12, color: "var(--fcl-muted)" }}>
        <Sparkles size={14} style={{ display: "inline", marginRight: 4 }} />
        Valeur marchande estimée : <strong style={{ color: "var(--fcl-text)" }}>{formatMoneyCompact(player.marketValue)}</strong>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Mercato Tab                                                        */
/* ================================================================== */

function MercatoTab({
  window: mercatoWindow,
  mercato,
  player,
  agentState,
  dayNumber,
  onStartSaga,
  persist,
  career,
}: {
  window: "summer" | "winter" | "closed";
  mercato: MercatoState | null;
  player: NonNullable<CareerRuntimeState["player"]>;
  agentState: AgentState | null;
  dayNumber: number;
  onStartSaga: (saga: TransferSaga) => void;
  persist: (next: CareerRuntimeState, agent?: AgentState, merc?: MercatoState) => void;
  career: CareerRuntimeState;
}) {
  const windowLabel = mercatoWindow === "summer" ? "☀️ Mercato d'été (ouvert)" : mercatoWindow === "winter" ? "❄️ Mercato d'hiver (ouvert)" : "🔒 Mercato fermé";
  const isOpen = mercatoWindow !== "closed";

  function handleGenerate() {
    if (!agentState || !isOpen) return;
    const sagas = generatePotentialSagas(player, agentState, dayNumber, Date.now());
    if (sagas.length === 0) return;

    const updatedMercato: MercatoState = {
      ...(mercato ?? createMercatoState(dayNumber)),
      currentWindow: mercatoWindow,
      activeSagas: [...(mercato?.activeSagas ?? []), ...sagas],
    };
    persist(career, agentState, updatedMercato);
  }

  const sagas = mercato?.activeSagas ?? [];

  return (
    <div>
      <div style={{
        padding: 14, borderRadius: 12, marginBottom: 16,
        background: isOpen ? "color-mix(in oklch, var(--fcl-accent) 12%, var(--fcl-card))" : "var(--fcl-card)",
        border: `1px solid ${isOpen ? "var(--fcl-accent)" : "var(--fcl-border)"}`,
        fontSize: 14, fontWeight: 500,
      }}>
        {windowLabel}
        {isOpen && (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--fcl-muted)", fontWeight: 400 }}>
            Les clubs peuvent s&apos;intéresser à toi. Ton agent travaille en coulisses.
          </p>
        )}
      </div>

      {!agentState && (
        <p style={{ fontSize: 13, color: "var(--fcl-warning)", marginBottom: 12 }}>
          ⚠️ Tu n&apos;as pas encore d&apos;agent. Va dans l&apos;onglet Agent pour en choisir un.
        </p>
      )}

      {isOpen && agentState && (
        <Button onClick={handleGenerate} style={{ marginBottom: 16, width: "100%", background: "var(--fcl-accent)", color: "#fff" }}>
          <TrendingUp size={14} style={{ marginRight: 6 }} /> Voir les clubs intéressés
        </Button>
      )}

      {sagas.length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, color: "var(--fcl-muted)", margin: "0 0 10px" }}>Intérêts des clubs</h4>
          {sagas.map((saga) => {
            const club = getClub(saga.interestedClubId);
            return (
              <motion.div
                key={saga.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onStartSaga(saga)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: 12,
                  borderRadius: 10, background: "var(--fcl-card)", border: "1px solid var(--fcl-border)",
                  marginBottom: 8, cursor: "pointer",
                }}
              >
                <Newspaper size={18} style={{ color: "var(--fcl-accent)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{club?.name ?? saga.interestedClubName}</div>
                  <div style={{ fontSize: 11, color: "var(--fcl-muted)" }}>
                    Phase : {saga.currentPhase} · {saga.status === "active" ? "En cours" : saga.status}
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: "var(--fcl-muted)" }} />
              </motion.div>
            );
          })}
        </div>
      )}

      {!isOpen && sagas.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--fcl-muted)", textAlign: "center", padding: 24 }}>
          Aucune activité. Le mercato est fermé. Seules les prolongations et joueurs libres sont possibles.
        </p>
      )}
    </div>
  );
}

/* ================================================================== */
/* Saga Tab                                                           */
/* ================================================================== */

function SagaTab({
  saga,
  eventIdx,
  onNextEvent,
  onChoice,
  player,
}: {
  saga: TransferSaga | null;
  eventIdx: number;
  onNextEvent: () => void;
  onChoice: (saga: TransferSaga, eventId: string, choiceId: string) => void;
  player: NonNullable<CareerRuntimeState["player"]>;
}) {
  if (!saga) {
    return (
      <p style={{ fontSize: 13, color: "var(--fcl-muted)", textAlign: "center", padding: 32 }}>
        Aucune saga de transfert en cours. Va dans l&apos;onglet Mercato pour voir les clubs intéressés.
      </p>
    );
  }

  const visibleEvents = saga.events.filter((_, i) => i <= eventIdx);
  const currentEvent = visibleEvents[visibleEvents.length - 1];
  const hasMore = eventIdx < saga.events.length - 1;
  const isOver = saga.status !== "active";
  const alreadyChosen = (eId: string) => saga.playerChoices.some((pc) => pc.eventId === eId);

  const phaseLabels: Record<string, string> = {
    rumors: "📰 Rumeurs",
    "first-contact": "📞 Premier contact",
    negotiations: "💼 Négociations",
    decision: "⚖️ Décision finale",
  };

  const statusBadge = saga.status === "accepted"
    ? { label: "✅ Transfert accepté", color: "var(--fcl-accent)" }
    : saga.status === "rejected"
    ? { label: "🏠 Transfert refusé", color: "var(--fcl-muted)" }
    : saga.status === "collapsed"
    ? { label: "💥 Deal annulé", color: "var(--fcl-warning)" }
    : null;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--fcl-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>
          {saga.interestedClubName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15 }}>{saga.interestedClubName}</h3>
          <p style={{ margin: 0, fontSize: 12, color: "var(--fcl-muted)" }}>
            {phaseLabels[saga.currentPhase] ?? saga.currentPhase}
            {saga.isDeadlineDay && <span style={{ color: "var(--fcl-warning)", marginLeft: 6 }}>⏰ DEADLINE DAY</span>}
          </p>
        </div>
      </div>

      {statusBadge && (
        <div style={{ padding: 12, borderRadius: 10, background: "var(--fcl-card)", border: `1px solid ${statusBadge.color}`, marginBottom: 16, textAlign: "center", fontSize: 14, fontWeight: 600 }}>
          {statusBadge.label}
        </div>
      )}

      {/* Fan reaction bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fcl-muted)", marginBottom: 4 }}>
          <span>😡 Furieux</span>
          <span>Réaction des fans</span>
          <span>🥳 Enthousiastes</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "var(--fcl-border)", overflow: "hidden", position: "relative" }}>
          <div style={{
            position: "absolute",
            left: "50%",
            width: `${Math.abs(saga.fanReaction) / 2}%`,
            height: "100%",
            background: saga.fanReaction >= 0 ? "var(--fcl-accent)" : "var(--fcl-warning)",
            transform: saga.fanReaction >= 0 ? "none" : "translateX(-100%)",
            borderRadius: 3,
            transition: "all .3s",
          }} />
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <AnimatePresence>
          {visibleEvents.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05, ease }}
              style={{
                padding: 14, borderRadius: 12,
                background: "var(--fcl-card)", border: "1px solid var(--fcl-border)",
                borderLeft: `3px solid ${event.phase === "rumors" ? "#f59e0b" : event.phase === "first-contact" ? "#3b82f6" : event.phase === "negotiations" ? "#8b5cf6" : "var(--fcl-accent)"}`,
              }}
            >
              <div style={{ fontSize: 10, color: "var(--fcl-muted)", marginBottom: 4 }}>
                Jour {event.dayOffset} · {phaseLabels[event.phase]}
              </div>
              <h4 style={{ margin: "0 0 4px", fontSize: 14 }}>{event.title}</h4>
              <p style={{ margin: 0, fontSize: 13, color: "var(--fcl-muted)" }}>{event.description}</p>

              {/* Choices */}
              {event.choices && !alreadyChosen(event.id) && !isOver && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {event.choices.map((choice) => (
                    <Button
                      key={choice.id}
                      onClick={() => onChoice(saga, event.id, choice.id)}
                      style={{
                        flex: 1, minWidth: 100, fontSize: 12, padding: "8px 12px",
                        background: "var(--fcl-bg)", border: "1px solid var(--fcl-border)",
                        borderRadius: 8, cursor: "pointer",
                      }}
                    >
                      {choice.emoji} {choice.label}
                    </Button>
                  ))}
                </div>
              )}

              {alreadyChosen(event.id) && (
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--fcl-accent)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Check size={12} /> Choix fait
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Next event button */}
      {hasMore && !isOver && (
        <Button
          onClick={onNextEvent}
          style={{
            marginTop: 16, width: "100%", background: "var(--fcl-accent)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          Jour suivant <ArrowRight size={14} />
        </Button>
      )}
    </div>
  );
}

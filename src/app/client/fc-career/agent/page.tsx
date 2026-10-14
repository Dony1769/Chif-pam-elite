"use client";

/**
 * FC CAREER — Page : Agent & Contrats
 * Gestion de l'agent, offres de contrat reçues, historique des transferts.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame }  from "../game/hooks/useGame";
import { useToast } from "../game/components/Toast";
import { Button }   from "../game/components/Button";
import { Spinner }  from "../game/components/LoadingState";
import { pageFade, itemFade, stagger } from "../game/design/animations";
import { selectPlayer, selectCareer } from "../game/state/selectors";
import {
  getAvailableAgents,
  generateContractOffer,
  agentTierLabel,
  formatFee,
  formatSalary,
  type AgentProfile,
  type ContractOffer,
} from "../game/domain/agent";

/* ── Helpers visuels ─────────────────────────────────────────────────── */

const TIER_COLORS: Record<string, { color: string; bg: string }> = {
  none:     { color: "var(--fc-text-3)",  bg: "var(--fc-surface-2)" },
  local:    { color: "var(--fc-amber)",   bg: "rgba(251,191,36,.12)" },
  regional: { color: "var(--fc-blue)",    bg: "rgba(59,130,246,.12)" },
  elite:    { color: "var(--fc-emerald)", bg: "var(--fc-emerald-10)" },
};

const ROLE_LABELS: Record<string, string> = {
  squad:   "Équipier",
  starter: "Titulaire",
  key:     "Cadre",
  captain: "Capitaine",
};

/* ── Composants ──────────────────────────────────────────────────────── */

function AgentCard({ agent, onFire }: { agent: AgentProfile; onFire: () => void }) {
  const tc = TIER_COLORS[agent.tier] ?? TIER_COLORS.local;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--fc-space-4)" }}>
      <div style={{
        width: 52, height: 52, borderRadius: "var(--fc-radius)",
        background: tc.bg, border: `1px solid ${tc.color}33`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.5rem", flexShrink: 0,
      }}>🕴️</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--fc-font-display)", fontWeight: 800,
          fontSize: "var(--fc-text-lg)", color: "var(--fc-text)",
          lineHeight: 1.2,
        }}>
          {agent.name}
        </div>
        <div style={{ display: "flex", gap: "var(--fc-space-2)", marginTop: 4 }}>
          <span className="fc-badge" style={{ background: tc.bg, color: tc.color, fontWeight: 700 }}>
            {agentTierLabel(agent.tier)}
          </span>
          <span className="fc-badge fc-badge--neutral">
            Commission {agent.commissionPct}%
          </span>
        </div>
        <div style={{
          fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)",
          marginTop: 4, lineHeight: 1.4,
        }}>
          {agent.specialty}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onFire}>
        Se séparer
      </Button>
    </div>
  );
}

function AgentPickCard({
  agent,
  onHire,
}: {
  agent: AgentProfile;
  onHire: (a: AgentProfile) => void;
}) {
  const tc = TIER_COLORS[agent.tier] ?? TIER_COLORS.local;
  return (
    <div style={{
      padding: "var(--fc-space-4)",
      background: "var(--fc-surface-2)",
      borderRadius: "var(--fc-radius)",
      border: `1px solid var(--fc-border)`,
      display: "flex", flexDirection: "column", gap: "var(--fc-space-3)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--fc-space-3)" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "var(--fc-radius-sm)",
          background: tc.bg, border: `1px solid ${tc.color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.2rem", flexShrink: 0,
        }}>🕴️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 700,
            fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
          }}>
            {agent.name}
          </div>
          <span className="fc-badge" style={{ background: tc.bg, color: tc.color, fontWeight: 700, marginTop: 2 }}>
            {agentTierLabel(agent.tier)}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-1)" }}>
        <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
          📊 Commission : <strong style={{ color: "var(--fc-text-2)" }}>{agent.commissionPct}%</strong>
        </div>
        <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>
          💸 Bonus salaire : <strong style={{ color: "var(--fc-emerald)" }}>+{agent.salaryBoostPct}%</strong>
        </div>
        <div style={{
          fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)",
          marginTop: "var(--fc-space-1)", lineHeight: 1.5, fontStyle: "italic",
        }}>
          {agent.specialty}
        </div>
      </div>

      <Button variant="primary" size="sm" fullWidth onClick={() => onHire(agent)}>
        Engager
      </Button>
    </div>
  );
}

function OfferCard({
  offer,
  onAccept,
  onReject,
}: {
  offer: ContractOffer;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = offer.status === "pending";

  const statusStyle = offer.status === "accepted"
    ? { color: "var(--fc-emerald)", bg: "var(--fc-emerald-10)" }
    : offer.status === "rejected" || offer.status === "expired"
    ? { color: "var(--fc-text-3)", bg: "var(--fc-surface-2)" }
    : { color: "var(--fc-amber)", bg: "rgba(251,191,36,.12)" };

  const statusLabel = {
    pending:  "En attente",
    accepted: "Accepté",
    rejected: "Refusé",
    expired:  "Expiré",
  }[offer.status];

  return (
    <div style={{
      padding: "var(--fc-space-4)",
      background: "var(--fc-surface-2)",
      borderRadius: "var(--fc-radius)",
      border: "1px solid var(--fc-border)",
      borderLeft: isPending ? "3px solid var(--fc-amber)" : "3px solid var(--fc-border)",
    }}>
      {/* En-tête de l'offre */}
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div>
          <div style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 700,
            fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
            lineHeight: 1.2,
          }}>
            {offer.clubName}
          </div>
          <div style={{
            fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2,
          }}>
            Saison {offer.season} · Sem. {offer.week}
            {isPending && ` · Expire dans ${offer.expiresInWeeks} sem.`}
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--fc-space-2)", alignItems: "center" }}>
          <span className="fc-badge" style={{ background: statusStyle.bg, color: statusStyle.color, fontWeight: 700 }}>
            {statusLabel}
          </span>
          <span style={{ color: "var(--fc-text-3)", fontSize: "var(--fc-text-xs)" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Détails */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              marginTop: "var(--fc-space-3)",
              paddingTop: "var(--fc-space-3)",
              borderTop: "1px solid var(--fc-border)",
            }}>
              {/* Message club */}
              <p style={{
                fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)",
                fontStyle: "italic", marginBottom: "var(--fc-space-3)",
                lineHeight: 1.5,
              }}>
                &ldquo;{offer.message}&rdquo;
              </p>

              {/* Grille termes */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "var(--fc-space-2)", marginBottom: "var(--fc-space-3)",
              }}>
                {[
                  ["Salaire", formatSalary(offer.terms.salary)],
                  ["Durée", `${offer.terms.endSeason - offer.terms.startSeason} saison(s)`],
                  ["Rôle", ROLE_LABELS[offer.terms.role] ?? offer.terms.role],
                  ["Indemnité", formatFee(offer.transferFee)],
                  ["Bonus but", `${offer.terms.bonusGoal.toLocaleString("fr-FR")}€`],
                  ["Bonus passe", `${offer.terms.bonusAssist.toLocaleString("fr-FR")}€`],
                ].map(([label, val]) => (
                  <div key={label} style={{
                    padding: "var(--fc-space-2) var(--fc-space-3)",
                    background: "var(--fc-surface)",
                    borderRadius: "var(--fc-radius-sm)",
                  }}>
                    <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{label}</div>
                    <div style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginTop: 2 }}>
                      {val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Boutons d'action */}
              {isPending && (
                <div style={{ display: "flex", gap: "var(--fc-space-2)" }}>
                  <Button variant="primary" fullWidth onClick={onAccept}>
                    ✅ Accepter
                  </Button>
                  <Button variant="ghost" fullWidth onClick={onReject}>
                    ✗ Refuser
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────────────────── */

export default function AgentPage() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const player  = selectPlayer(state);
  const career  = selectCareer(state);
  const [requesting, setRequesting] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  const agentState = state.save?.agentState;

  const handleHireAgent = useCallback((agent: AgentProfile) => {
    dispatch({ type: "HIRE_AGENT", agent });
    setShowAgentPicker(false);
    toast(`🤝 ${agent.name} est votre nouvel agent`, "success");
  }, [dispatch, toast]);

  const handleFireAgent = useCallback(() => {
    dispatch({ type: "FIRE_AGENT" });
    toast("Agent congédié", "warning");
  }, [dispatch, toast]);

  const handleRequestOffers = useCallback(async () => {
    if (!player || !career || !agentState) return;
    setRequesting(true);
    await new Promise(r => setTimeout(r, 800));

    // Simuler 1-3 clubs intéressés selon réputation
    const nbOffers = player.reputation >= 60 ? 3 : player.reputation >= 30 ? 2 : 1;
    const agentBoost = agentState.agent?.salaryBoostPct ?? 0;

    // Sélection de clubs réels depuis le monde vivant (filtrés selon le niveau du joueur)
    const worldClubs = state.save?.world?.clubs ?? [];
    const playerClubId = player.contract.clubId;
    // Filtrer : clubs différents du club actuel, de division compatible avec le niveau du joueur
    const candidateClubs = worldClubs
      .filter(c => c.id !== playerClubId)
      .map(c => ({ id: c.id, name: c.name ?? c.id }));

    // Trier par seed déterministe (semaine + saison = sélection stable)
    const seed = `prospect-${career.season}-${career.week}-${player.reputation}`;
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    const shuffled = [...candidateClubs].sort((a, b) => {
      const ha = (h ^ a.id.charCodeAt(0)) >>> 0;
      const hb = (h ^ b.id.charCodeAt(0)) >>> 0;
      return ha - hb;
    });
    const selectedClubs = shuffled.slice(0, nbOffers);

    for (const club of selectedClubs) {
      const offer = generateContractOffer({
        clubId: club.id,
        clubName: club.name,
        playerOverall: player.overall,
        playerReputation: player.reputation,
        season: career.season,
        week: career.week,
        currentSalary: player.contract.salary,
        agentBoostPct: agentBoost,
      });
      dispatch({ type: "ADD_CONTRACT_OFFER", offer });
    }

    dispatch({ type: "REQUEST_OFFERS" });
    toast(`📬 ${nbOffers} offre(s) reçue(s)`, "success");
    setRequesting(false);
  }, [player, career, agentState, dispatch, toast]);

  const handleAccept = useCallback((offerId: string) => {
    dispatch({ type: "RESPOND_CONTRACT_OFFER", offerId, accepted: true });
    toast("🎉 Contrat signé !", "success");
  }, [dispatch, toast]);

  const handleReject = useCallback((offerId: string) => {
    dispatch({ type: "RESPOND_CONTRACT_OFFER", offerId, accepted: false });
    toast("Offre refusée", "warning");
  }, [dispatch, toast]);

  // ── Hooks toujours avant les returns conditionnels ──
  if (state.isLoading) return <Spinner />;
  if (!state.save || !player || !career || !agentState) {
    return (
      <div className="fc-page">
        <div className="fc-section-header">
          <h1 className="fc-section-title">Agent</h1>
        </div>
        <div className="fc-card" style={{ padding: "var(--fc-space-8)", textAlign: "center" }}>
          <p style={{ color: "var(--fc-text-3)", fontSize: "var(--fc-text-sm)" }}>
            Aucune carrière active.
          </p>
        </div>
      </div>
    );
  }

  const availableAgents = getAvailableAgents(career.season);
  const pendingOffers   = agentState.offers.filter(o => o.status === "pending");
  const pastOffers      = agentState.offers.filter(o => o.status !== "pending");
  const canRequest      = agentState.lastRequestWeek !== career.week;

  return (
    <motion.div
      className="fc-page"
      variants={pageFade}
      initial="hidden"
      animate="visible"
    >
      {/* En-tête */}
      <div className="fc-section-header">
        <h1 className="fc-section-title">Agent & Contrats</h1>
        {pendingOffers.length > 0 && (
          <span className="fc-badge" style={{ background: "var(--fc-amber)", color: "#000", fontWeight: 800 }}>
            {pendingOffers.length} offre{pendingOffers.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible"
        style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-4)" }}
      >

        {/* ── Contrat actuel ────────────────────────────── */}
        <motion.div variants={itemFade} className="fc-card"
          style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}
        >
          <h2 style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 700,
            fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
            marginBottom: "var(--fc-space-3)",
          }}>
            Contrat actuel
          </h2>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "var(--fc-space-2)",
          }}>
            {[
              ["Club", player.contract.clubId],
              ["Rôle", ROLE_LABELS[player.contract.role] ?? player.contract.role],
              ["Salaire", formatSalary(player.contract.salary)],
              ["Fin de contrat", `Saison ${player.contract.endSeason}`],
              ["Bonus but", `${player.contract.bonusGoal.toLocaleString("fr-FR")}€`],
              ["Bonus passe", `${player.contract.bonusAssist.toLocaleString("fr-FR")}€`],
            ].map(([label, val]) => (
              <div key={label} style={{
                padding: "var(--fc-space-2) var(--fc-space-3)",
                background: "var(--fc-surface-2)",
                borderRadius: "var(--fc-radius-sm)",
              }}>
                <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)" }}>{label}</div>
                <div style={{ fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)", marginTop: 2 }}>
                  {val}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Mon agent ────────────────────────────────── */}
        <motion.div variants={itemFade} className="fc-card"
          style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}
        >
          <h2 style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 700,
            fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
            marginBottom: "var(--fc-space-3)",
          }}>
            Mon agent
          </h2>

          {agentState.agent ? (
            <AgentCard agent={agentState.agent} onFire={handleFireAgent} />
          ) : (
            <div>
              <p style={{
                fontSize: "var(--fc-text-sm)", color: "var(--fc-text-3)",
                marginBottom: "var(--fc-space-3)", lineHeight: 1.5,
              }}>
                Vous n&apos;avez pas encore d&apos;agent. Un bon agent améliore les offres et votre salaire.
              </p>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowAgentPicker(v => !v)}
              >
                {showAgentPicker ? "Masquer" : "🕴️ Choisir un agent"}
              </Button>

              <AnimatePresence>
                {showAgentPicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{
                      marginTop: "var(--fc-space-4)",
                      display: "flex", flexDirection: "column", gap: "var(--fc-space-3)",
                    }}>
                      {availableAgents.map(a => (
                        <AgentPickCard key={a.id} agent={a} onHire={handleHireAgent} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* ── Demander des offres ───────────────────────── */}
        <motion.div variants={itemFade} className="fc-card"
          style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}
        >
          <h2 style={{
            fontFamily: "var(--fc-font-display)", fontWeight: 700,
            fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
            marginBottom: "var(--fc-space-2)",
          }}>
            Prospection
          </h2>
          <p style={{
            fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)",
            marginBottom: "var(--fc-space-4)", lineHeight: 1.5,
          }}>
            {agentState.agent
              ? `${agentState.agent.name} peut prospecter des clubs pour vous. Une fois par semaine.`
              : "Engagez un agent pour recevoir de meilleures offres."}
          </p>
          <Button
            variant="primary"
            fullWidth
            loading={requesting}
            disabled={!canRequest}
            onClick={handleRequestOffers}
          >
            📬 {canRequest ? "Chercher des offres" : "Déjà prospecté cette semaine"}
          </Button>
        </motion.div>

        {/* ── Offres en attente ─────────────────────────── */}
        {pendingOffers.length > 0 && (
          <motion.div variants={itemFade} className="fc-card"
            style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}
          >
            <h2 style={{
              fontFamily: "var(--fc-font-display)", fontWeight: 700,
              fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
              marginBottom: "var(--fc-space-3)",
            }}>
              Offres en attente
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-3)" }}>
              {pendingOffers.map(offer => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onAccept={() => handleAccept(offer.id)}
                  onReject={() => handleReject(offer.id)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Historique des offres ─────────────────────── */}
        {pastOffers.length > 0 && (
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
              {[...pastOffers].reverse().slice(0, 8).map(offer => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onAccept={() => {}}
                  onReject={() => {}}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Transferts ────────────────────────────────── */}
        {agentState.transfers.length > 0 && (
          <motion.div variants={itemFade} className="fc-card"
            style={{ padding: "var(--fc-space-4) var(--fc-space-5)" }}
          >
            <h2 style={{
              fontFamily: "var(--fc-font-display)", fontWeight: 700,
              fontSize: "var(--fc-text-md)", color: "var(--fc-text)",
              marginBottom: "var(--fc-space-3)",
            }}>
              Transferts
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fc-space-2)" }}>
              {[...agentState.transfers].reverse().map(t => (
                <div key={t.id} style={{
                  padding: "var(--fc-space-3)",
                  background: "var(--fc-surface-2)",
                  borderRadius: "var(--fc-radius)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{
                      fontSize: "var(--fc-text-sm)", fontWeight: 700, color: "var(--fc-text)",
                    }}>
                      {t.fromClubId} → {t.toClubId}
                    </div>
                    <div style={{ fontSize: "var(--fc-text-xs)", color: "var(--fc-text-3)", marginTop: 2 }}>
                      Saison {t.season} · {t.isLoan ? "Prêt" : "Transfert définitif"}
                    </div>
                  </div>
                  <span className="fc-badge fc-badge--pos">{formatFee(t.fee)}</span>
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

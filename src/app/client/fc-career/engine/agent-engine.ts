/**
 * FC CAREER — Étape 9 : Moteur Agents, Contrats & Sagas de Transfert
 */

import type {
  AgentProfileId,
  AgentState,
  FullContract,
  PerformanceBonuses,
  TransferSaga,
  TransferSagaPhase,
  TransferSagaEvent,
  TransferSagaChoice,
  MercatoWindow,
  MercatoState,
} from "../types/agent";
import { AGENT_PROFILES } from "../types/agent";
import type { Player } from "../types/player";
import type { Club } from "../types/club";
import { getClub, ALL_CLUBS } from "../constants/clubs";
import { suggestSalary } from "./transfer-system";
import { createRng } from "./player-generator";

/* ------------------------------------------------------------------ */
/* Agent                                                               */
/* ------------------------------------------------------------------ */

export function getAgentProfile(id: AgentProfileId) {
  return AGENT_PROFILES.find((a) => a.id === id)!;
}

export function createAgentState(profileId: AgentProfileId, dayNumber: number): AgentState {
  return {
    profileId,
    hiredOnDay: dayNumber,
    cooldownDaysLeft: 0,
    changeHistory: [],
  };
}

/** Changer d'agent : pénalité 10% salaire + 6 mois (180 jours) sans agent. */
export function changeAgent(
  state: AgentState,
  newProfileId: AgentProfileId,
  dayNumber: number,
): AgentState {
  return {
    profileId: newProfileId,
    hiredOnDay: dayNumber,
    cooldownDaysLeft: 180,
    changeHistory: [
      ...state.changeHistory,
      { fromAgent: state.profileId, toAgent: newProfileId, dayNumber },
    ],
  };
}

/** Avance le cooldown de 1 jour. */
export function tickAgentCooldown(state: AgentState): AgentState {
  if (state.cooldownDaysLeft <= 0) return state;
  return { ...state, cooldownDaysLeft: state.cooldownDaysLeft - 1 };
}

/** Commission de l'agent sur le salaire. */
export function agentCommission(state: AgentState, salary: number): number {
  const profile = getAgentProfile(state.profileId);
  return Math.round(salary * profile.commission);
}

/* ------------------------------------------------------------------ */
/* Contrats enrichis                                                   */
/* ------------------------------------------------------------------ */

function defaultPerformanceBonuses(salary: number): PerformanceBonuses {
  return {
    perGoal: Math.round(salary * 0.1),
    perAssist: Math.round(salary * 0.05),
    perCleanSheet: Math.round(salary * 0.03),
    perMatch: Math.round(salary * 0.02),
    leagueTitle: Math.round(salary * 12),
    cupWin: Math.round(salary * 8),
    championsWin: Math.round(salary * 20),
  };
}

export function generateContractOffer(
  club: Club,
  player: Player,
  agentState: AgentState,
  dayNumber: number,
): FullContract {
  const profile = getAgentProfile(agentState.profileId);
  const baseWeekly = suggestSalary(club.division, player.overall);
  const monthlySalary = Math.round(baseWeekly * 4.33 * profile.salaryMultiplier);
  const duration = player.age <= 23 ? 4 : player.age <= 29 ? 3 : 2;

  return {
    clubId: club.id,
    salary: monthlySalary,
    duration,
    signingBonus: Math.round(monthlySalary * 3),
    releaseClause: club.reputation >= 80 ? null : Math.round(player.marketValue * 1.8),
    imageRights: Math.min(50, 10 + Math.floor(player.overall / 10) * 5),
    performanceBonuses: defaultPerformanceBonuses(monthlySalary),
    loyaltyBonus: Math.round(monthlySalary * duration * 0.5),
    agentFee: profile.commission,
    status: "active",
    signedOnDay: dayNumber,
  };
}

/** Le joueur négocie : demander plus (risque de faire capoter). */
export function negotiateContract(
  contract: FullContract,
  agentState: AgentState,
  rng: () => number,
): { contract: FullContract; success: boolean } {
  const profile = getAgentProfile(agentState.profileId);
  // Plus l'agent est agressif, meilleure la négociation mais plus de risque
  const boost = profile.id === "shark" ? 1.2 : profile.id === "ambitious" ? 1.12 : 1.05;
  const failChance = profile.id === "shark" ? 0.25 : profile.id === "ambitious" ? 0.15 : 0.05;

  if (rng() < failChance) {
    return { contract, success: false };
  }

  return {
    contract: {
      ...contract,
      salary: Math.round(contract.salary * boost),
      signingBonus: Math.round(contract.signingBonus * boost),
      performanceBonuses: {
        ...contract.performanceBonuses,
        perGoal: Math.round(contract.performanceBonuses.perGoal * boost),
        perAssist: Math.round(contract.performanceBonuses.perAssist * boost),
      },
    },
    success: true,
  };
}

/** Statut du contrat actuel selon les saisons restantes. */
export function getContractStatus(yearsRemaining: number): FullContract["status"] {
  if (yearsRemaining <= 0) return "expired";
  if (yearsRemaining <= 1) return "expiring";
  return "active";
}

/* ------------------------------------------------------------------ */
/* Mercato                                                             */
/* ------------------------------------------------------------------ */

/** Journée de saison → fenêtre de mercato. */
export function getMercatoWindow(dayNumber: number): MercatoWindow {
  // Été : jours 0-8 (pré-saison, ~juin-août)
  if (dayNumber <= 8) return "summer";
  // Hiver : jours 16-19 (~janvier)
  if (dayNumber >= 16 && dayNumber <= 19) return "winter";
  return "closed";
}

export function isDeadlineDay(dayNumber: number): boolean {
  return dayNumber === 8 || dayNumber === 19;
}

export function createMercatoState(dayNumber: number): MercatoState {
  return {
    currentWindow: getMercatoWindow(dayNumber),
    activeSagas: [],
    extensionOffer: null,
    freeAgentContactable: false,
  };
}

/* ------------------------------------------------------------------ */
/* Saga de transfert                                                   */
/* ------------------------------------------------------------------ */

const SAGA_PHASES: { phase: TransferSagaPhase; daysRange: [number, number] }[] = [
  { phase: "rumors", daysRange: [0, 3] },
  { phase: "first-contact", daysRange: [4, 7] },
  { phase: "negotiations", daysRange: [8, 14] },
  { phase: "decision", daysRange: [15, 21] },
];

function phaseForDayOffset(offset: number): TransferSagaPhase {
  for (const p of SAGA_PHASES) {
    if (offset >= p.daysRange[0] && offset <= p.daysRange[1]) return p.phase;
  }
  return "decision";
}

/** Génère les événements d'une saga complète (prédéfinis). */
function generateSagaEvents(clubName: string, playerName: string): TransferSagaEvent[] {
  return [
    // Phase 1 : Rumeurs (jour 1-3)
    {
      id: "rumor-media",
      dayOffset: 1,
      phase: "rumors",
      type: "media",
      title: "Rumeur dans la presse",
      description: `Selon nos sources, ${clubName} s'intéresse à ${playerName}.`,
    },
    {
      id: "rumor-agent",
      dayOffset: 2,
      phase: "rumors",
      type: "agent-message",
      title: "Message de ton agent",
      description: `"J'ai eu un appel intéressant... ${clubName} te suit de près."`,
    },
    {
      id: "rumor-teammate",
      dayOffset: 3,
      phase: "rumors",
      type: "teammate-reaction",
      title: "Réaction d'un coéquipier",
      description: `"Hé, c'est vrai que tu pars à ${clubName} ?"`,
    },

    // Phase 2 : Premier contact (jour 4-7)
    {
      id: "contact-agent",
      dayOffset: 4,
      phase: "first-contact",
      type: "agent-message",
      title: "L'agent négocie",
      description: `Ton agent est en discussions avec ${clubName}. Les premiers termes sont sur la table.`,
    },
    {
      id: "contact-coach",
      dayOffset: 6,
      phase: "first-contact",
      type: "coach-meeting",
      title: "Le coach te convoque",
      description: `"C'est vrai cette rumeur avec ${clubName} ?"`,
      choices: [
        {
          id: "stay",
          label: "Non, je reste",
          emoji: "🤝",
          effect: { coachTrustDelta: 10, moraleDelta: 5, fanReactionDelta: 20, sagaProgressDelta: -2 },
        },
        {
          id: "thinking",
          label: "Je réfléchis",
          emoji: "🤔",
          effect: { coachTrustDelta: -5, moraleDelta: 0, fanReactionDelta: -10 },
        },
        {
          id: "leave",
          label: "Oui, je veux partir",
          emoji: "✈️",
          effect: { coachTrustDelta: -20, moraleDelta: -10, fanReactionDelta: -40, sagaProgressDelta: 3 },
        },
      ],
    },

    // Phase 3 : Négociations (jour 8-14)
    {
      id: "nego-terms",
      dayOffset: 8,
      phase: "negotiations",
      type: "terms-reveal",
      title: "Termes proposés",
      description: `${clubName} a envoyé une offre officielle. Ton agent te présente les détails.`,
    },
    {
      id: "nego-counter",
      dayOffset: 10,
      phase: "negotiations",
      type: "agent-message",
      title: "Contre-proposition ?",
      description: "Tu peux demander plus, mais tu risques de faire capoter le deal.",
      choices: [
        {
          id: "accept-terms",
          label: "Accepter les termes",
          emoji: "✅",
          effect: { sagaProgressDelta: 2 },
        },
        {
          id: "negotiate-more",
          label: "Demander plus",
          emoji: "💰",
          effect: { dealBreakChance: 0.15, sagaProgressDelta: 0 },
        },
      ],
    },
    {
      id: "nego-visit",
      dayOffset: 12,
      phase: "negotiations",
      type: "visit",
      title: "Visite des installations",
      description: `Tu visites les installations de ${clubName}. Centre d'entraînement, stade, ville...`,
    },
    {
      id: "nego-coach-project",
      dayOffset: 13,
      phase: "negotiations",
      type: "coach-project",
      title: "Projet du coach",
      description: `Le coach de ${clubName} t'expose son projet : "Voilà ce que j'ai en tête pour toi."`,
    },

    // Phase 4 : Décision finale (jour 15-21)
    {
      id: "decision-deadline",
      dayOffset: 16,
      phase: "decision",
      type: "deadline",
      title: "Décision finale",
      description: `Le moment est venu. ${clubName} attend ta réponse.`,
      choices: [
        {
          id: "accept-transfer",
          label: "Accepter le transfert",
          emoji: "✈️",
          effect: { moraleDelta: 15, fanReactionDelta: -30 },
        },
        {
          id: "reject-transfer",
          label: "Refuser le transfert",
          emoji: "🏠",
          effect: { moraleDelta: -5, fanReactionDelta: 30, coachTrustDelta: 5 },
        },
      ],
    },
  ];
}

/** Démarre une saga de transfert quand un club s'intéresse. */
export function startTransferSaga(
  club: Club,
  player: Player,
  dayNumber: number,
  agentState: AgentState,
): TransferSaga {
  const playerName = `${player.firstName} ${player.lastName}`;
  const events = generateSagaEvents(club.name, playerName);

  return {
    id: `saga-${club.id}-${dayNumber}`,
    interestedClubId: club.id,
    interestedClubName: club.name,
    startDay: dayNumber,
    currentPhase: "rumors",
    currentDayOffset: 0,
    proposedContract: null,
    events,
    playerChoices: [],
    status: "active",
    fanReaction: 0,
    collapseChance: 0,
    isDeadlineDay: false,
  };
}

/** Avance une saga de 1 jour. Retourne les événements déclenchés. */
export function tickSaga(
  saga: TransferSaga,
  player: Player,
  agentState: AgentState,
  dayNumber: number,
  rng: () => number,
): { saga: TransferSaga; triggeredEvents: TransferSagaEvent[] } {
  if (saga.status !== "active") return { saga, triggeredEvents: [] };

  const newOffset = saga.currentDayOffset + 1;
  const newPhase = phaseForDayOffset(newOffset);
  const triggered = saga.events.filter((e) => e.dayOffset === newOffset);

  // Vérifier si le deal capote
  if (rng() < saga.collapseChance) {
    return {
      saga: {
        ...saga,
        currentDayOffset: newOffset,
        currentPhase: newPhase,
        status: "collapsed",
        events: [
          ...saga.events,
          {
            id: "collapse",
            dayOffset: newOffset,
            phase: newPhase,
            type: "deal-collapse",
            title: "Deal annulé !",
            description: `${saga.interestedClubName} se retire des négociations. Le transfert est annulé.`,
          },
        ],
      },
      triggeredEvents: [{
        id: "collapse",
        dayOffset: newOffset,
        phase: newPhase,
        type: "deal-collapse",
        title: "Deal annulé !",
        description: `${saga.interestedClubName} se retire des négociations. Le transfert est annulé.`,
      }],
    };
  }

  // Générer le contrat proposé quand on arrive aux négociations
  let proposedContract = saga.proposedContract;
  if (newPhase === "negotiations" && !proposedContract) {
    const club = getClub(saga.interestedClubId);
    if (club) {
      proposedContract = generateContractOffer(club, player, agentState, dayNumber);
    }
  }

  // Deadline day check
  const sagaIsDeadline = isDeadlineDay(dayNumber);

  // Si on dépasse 21 jours sans décision, la saga expire
  if (newOffset > 21) {
    return {
      saga: { ...saga, currentDayOffset: newOffset, status: "collapsed" },
      triggeredEvents: [],
    };
  }

  return {
    saga: {
      ...saga,
      currentDayOffset: newOffset,
      currentPhase: newPhase,
      proposedContract,
      isDeadlineDay: sagaIsDeadline,
    },
    triggeredEvents: triggered,
  };
}

/** Applique un choix du joueur dans la saga. */
export function applySagaChoice(
  saga: TransferSaga,
  eventId: string,
  choice: TransferSagaChoice,
): TransferSaga {
  let { fanReaction, collapseChance, status } = saga;

  fanReaction += choice.effect.fanReactionDelta ?? 0;
  fanReaction = Math.max(-100, Math.min(100, fanReaction));
  collapseChance += choice.effect.dealBreakChance ?? 0;
  collapseChance = Math.min(1, collapseChance);

  // Choix de décision finale
  if (choice.id === "accept-transfer") status = "accepted";
  if (choice.id === "reject-transfer") status = "rejected";

  return {
    ...saga,
    playerChoices: [...saga.playerChoices, { eventId, choiceId: choice.id }],
    fanReaction,
    collapseChance,
    status,
  };
}

/** Applique le transfert accepté : nouveau contrat, nouveau club. */
export function applyAcceptedTransfer(
  player: Player,
  saga: TransferSaga,
): Player {
  if (!saga.proposedContract || saga.status !== "accepted") return player;

  const c = saga.proposedContract;
  return {
    ...player,
    contract: {
      clubId: c.clubId,
      salaryPerWeek: Math.round(c.salary / 4.33),
      bonusPerMatch: c.performanceBonuses.perMatch,
      bonusPerGoal: c.performanceBonuses.perGoal,
      signingBonus: c.signingBonus,
      yearsRemaining: c.duration,
      isProfessional: true,
      releaseClause: c.releaseClause ?? 0,
    },
    morale: Math.min(100, player.morale + 15),
  };
}

/** Génère des sagas potentielles si le mercato est ouvert et le joueur intéresse des clubs. */
export function generatePotentialSagas(
  player: Player,
  agentState: AgentState,
  dayNumber: number,
  seed: number,
): TransferSaga[] {
  const window = getMercatoWindow(dayNumber);
  if (window === "closed") return [];
  if (agentState.cooldownDaysLeft > 0) return [];

  const rng = createRng(seed);
  const profile = getAgentProfile(agentState.profileId);

  // Clubs potentiellement intéressés
  const candidates = ALL_CLUBS.filter((c) => {
    if (c.id === player.contract.clubId) return false;
    const gap = c.reputation - player.overall;
    return gap > -10 && gap < 20;
  });

  // L'agent ambitieux/requin attire plus de clubs
  const maxSagas = profile.id === "shark" ? 3 : profile.id === "ambitious" ? 2 : 1;
  const shuffled = candidates.sort(() => rng() - 0.5);

  return shuffled.slice(0, maxSagas).map((club) =>
    startTransferSaga(club, player, dayNumber, agentState)
  );
}

/** Génère une offre de prolongation du club actuel. */
export function generateExtensionOffer(
  player: Player,
  agentState: AgentState,
  dayNumber: number,
): FullContract | null {
  if (player.contract.yearsRemaining > 1) return null;

  const club = getClub(player.contract.clubId);
  if (!club) return null;

  // Le club propose une prolongation avec hausse
  const contract = generateContractOffer(club, player, agentState, dayNumber);
  return {
    ...contract,
    salary: Math.round(contract.salary * 1.15), // 15% de hausse
    duration: Math.min(5, contract.duration + 1),
  };
}

/**
 * FC CAREER — Étape 9 : Agents, Contrats & Sagas de Transfert
 * 3 profils d'agents, contrats enrichis, saga de transfert en 4 phases, mercato.
 */

/* ------------------------------------------------------------------ */
/* 9.1 — Profils d'agents                                              */
/* ------------------------------------------------------------------ */

export type AgentProfileId = "prudent" | "ambitious" | "shark";

export interface AgentProfile {
  id: AgentProfileId;
  name: string;
  emoji: string;
  commission: number; // 0.05, 0.10, 0.15
  label: string;
  strengths: string;
  weaknesses: string;
  /** Multiplicateur sur les salaires négociés (>1 = meilleur salaire) */
  salaryMultiplier: number;
  /** Multiplicateur sur les sponsors (>1 = meilleur deal) */
  sponsorMultiplier: number;
  /** Peut forcer un transfert non voulu ? */
  canForceTransfer: boolean;
  /** Risque de ruiner la relation club (0-1) */
  clubRelationRisk: number;
}

export const AGENT_PROFILES: AgentProfile[] = [
  {
    id: "prudent",
    name: "Le Prudent",
    emoji: "🤝",
    commission: 0.05,
    label: "Fidèle et stable",
    strengths: "Contrats stables, fidélité, protection",
    weaknesses: "Pas ambitieux, offres moyennes",
    salaryMultiplier: 1.0,
    sponsorMultiplier: 0.9,
    canForceTransfer: false,
    clubRelationRisk: 0.05,
  },
  {
    id: "ambitious",
    name: "L'Ambitieux",
    emoji: "🚀",
    commission: 0.10,
    label: "Meilleurs salaires, clubs top",
    strengths: "Meilleurs salaires, clubs top",
    weaknesses: "Pression constante, peut forcer un transfert",
    salaryMultiplier: 1.25,
    sponsorMultiplier: 1.15,
    canForceTransfer: true,
    clubRelationRisk: 0.3,
  },
  {
    id: "shark",
    name: "Le Requin",
    emoji: "🦈",
    commission: 0.15,
    label: "Sponsors max, primes énormes",
    strengths: "Sponsors max, primes énormes",
    weaknesses: "Commission élevée, relations club ruinées",
    salaryMultiplier: 1.5,
    sponsorMultiplier: 1.4,
    canForceTransfer: true,
    clubRelationRisk: 0.6,
  },
];

export interface AgentState {
  profileId: AgentProfileId;
  hiredOnDay: number;
  /** Jours sans agent après un changement (pénalité) */
  cooldownDaysLeft: number;
  /** Historique des changements */
  changeHistory: { fromAgent: AgentProfileId; toAgent: AgentProfileId; dayNumber: number }[];
}

/* ------------------------------------------------------------------ */
/* 9.2 — Contrats enrichis                                             */
/* ------------------------------------------------------------------ */

export interface PerformanceBonuses {
  perGoal: number;
  perAssist: number;
  perCleanSheet: number;
  perMatch: number;
  leagueTitle: number;
  cupWin: number;
  championsWin: number;
}

export interface FullContract {
  clubId: string;
  salary: number; // €/mois
  duration: number; // 1-5 saisons
  signingBonus: number;
  releaseClause: number | null;
  imageRights: number; // % des droits à l'image (10-50%)
  performanceBonuses: PerformanceBonuses;
  loyaltyBonus: number; // bonus fidélité si reste toute la durée
  agentFee: number; // % commission agent
  status: "active" | "expiring" | "expired";
  signedOnDay: number;
}

/* ------------------------------------------------------------------ */
/* 9.3 — Saga de Transfert                                             */
/* ------------------------------------------------------------------ */

export type TransferSagaPhase = "rumors" | "first-contact" | "negotiations" | "decision";

export interface TransferSagaEvent {
  id: string;
  dayOffset: number; // jours depuis le début de la saga
  phase: TransferSagaPhase;
  type: "media" | "agent-message" | "teammate-reaction" | "coach-meeting" | "terms-reveal" | "visit" | "coach-project" | "deadline" | "deal-collapse";
  title: string;
  description: string;
  /** Choix possibles pour le joueur (si applicable) */
  choices?: TransferSagaChoice[];
}

export interface TransferSagaChoice {
  id: string;
  label: string;
  emoji: string;
  /** Effet sur la saga */
  effect: {
    sagaProgressDelta?: number; // avance ou retarde la saga
    coachTrustDelta?: number;
    moraleDelta?: number;
    fanReactionDelta?: number; // -100 à +100
    dealBreakChance?: number; // 0-1, risque de faire capoter
  };
}

export interface TransferSaga {
  id: string;
  interestedClubId: string;
  interestedClubName: string;
  startDay: number;
  currentPhase: TransferSagaPhase;
  currentDayOffset: number;
  /** Termes proposés (révélés en phase negotiations) */
  proposedContract: FullContract | null;
  /** Événements vécus */
  events: TransferSagaEvent[];
  /** Choix faits par le joueur */
  playerChoices: { eventId: string; choiceId: string }[];
  /** État */
  status: "active" | "accepted" | "rejected" | "collapsed";
  /** Réaction des fans (-100 = furieux, +100 = enthousiastes) */
  fanReaction: number;
  /** Chance que le deal capote (accumulé) */
  collapseChance: number;
  /** Deadline day ? */
  isDeadlineDay: boolean;
}

/* ------------------------------------------------------------------ */
/* 9.4 — Fenêtres de mercato                                           */
/* ------------------------------------------------------------------ */

export type MercatoWindow = "summer" | "winter" | "closed";

export interface MercatoState {
  currentWindow: MercatoWindow;
  /** Sagas en cours */
  activeSagas: TransferSaga[];
  /** Offres de prolongation du club actuel */
  extensionOffer: FullContract | null;
  /** Joueurs libres contactables (6 derniers mois de contrat) */
  freeAgentContactable: boolean;
}

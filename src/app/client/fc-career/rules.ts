import type { AgentAccess, PlayerReputation } from './types';

// ---------------------------------------------------------------
// CONSTANTES GÉNÉRALES (équilibrage : tout se règle ici)
// ---------------------------------------------------------------
export const WEEKS_PER_SEASON = 38;
export const START_AGE = 12;

export const BALANCE = {
  weeklyTrainingPoints: 1, // points d'attributs gagnés chaque semaine
  moodBonusThreshold: 60, // moral minimum pour le bonus
  moodBonusPoints: 1, // bonus toutes les 4 semaines si moral OK
  seasonEndPoints: 10, // bonus de fin de saison
  coachReportEveryWeeks: 4, // rapport du coach
  minRelationToStart: 30, // en dessous, le coach ne te titularise plus
  inboxMaxSize: 100,
} as const;

// ---------------------------------------------------------------
// PALIERS D'ÂGE
// ---------------------------------------------------------------
export interface AgeStage {
  id: string;
  title: string;
  minAge: number;
  maxAge: number;
  maxClubTier: number; // niveau de club maximum accessible à cet âge
  agentAccess: AgentAccess;
  description: string;
}

export const AGE_STAGES: AgeStage[] = [
  {
    id: 'quartier',
    title: 'Club de quartier',
    minAge: 12,
    maxAge: 13,
    maxClubTier: 1,
    agentAccess: 'none',
    description: "Tu joues pour le plaisir dans un club local. Un recruteur peut te remarquer si ta réputation décolle.",
  },
  {
    id: 'formation_regionale',
    title: 'Centres de formation régionaux',
    minAge: 14,
    maxAge: 15,
    maxClubTier: 2,
    agentAccess: 'none',
    description: "Les centres de formation organisent des tests de détection. Les agents n'ont pas le droit de te démarcher.",
  },
  {
    id: 'aspirant',
    title: 'Aspirant / stagiaire',
    minAge: 16,
    maxAge: 16,
    maxClubTier: 2,
    agentAccess: 'parents',
    description: "Premier contrat possible. Un agent peut travailler avec tes parents. Les premiers équipementiers s'intéressent à toi.",
  },
  {
    id: 'reserve',
    title: 'Équipe réserve',
    minAge: 17,
    maxAge: 17,
    maxClubTier: 3,
    agentAccess: 'parents',
    description: "Tu peux être convoqué avec le groupe pro. Les chaussures sponsorisées deviennent possibles.",
  },
  {
    id: 'pro',
    title: 'Premier contrat pro',
    minAge: 18,
    maxAge: 18,
    maxClubTier: 4,
    agentAccess: 'direct',
    description: "Majeur : tu signes ton premier contrat pro et tu négocies directement avec ton agent. Sponsors majeurs possibles.",
  },
  {
    id: 'international',
    title: 'Prêts et transferts internationaux',
    minAge: 19,
    maxAge: 21,
    maxClubTier: 4,
    agentAccess: 'direct',
    description: "Prêts, transferts à l'étranger et premières grosses offres.",
  },
  {
    id: 'confirme',
    title: 'Joueur confirmé',
    minAge: 22,
    maxAge: 32,
    maxClubTier: 5,
    agentAccess: 'direct',
    description: "Les clubs d'élite et les marques personnelles te sont ouverts. Le capitanat devient possible.",
  },
  {
    id: 'declin',
    title: 'Déclin et reconversion',
    minAge: 33,
    maxAge: 99,
    maxClubTier: 4,
    agentAccess: 'direct',
    description: "Le physique baisse. Les contrats sont plus courts. Pense à ta reconversion.",
  },
];

export function getAgeStage(age: number): AgeStage {
  return (
    AGE_STAGES.find((s) => age >= s.minAge && age <= s.maxAge) ??
    AGE_STAGES[AGE_STAGES.length - 1]
  );
}

export function getCategoryLabel(age: number): string {
  return age <= 19 ? `U${age}` : 'Senior';
}

// ---------------------------------------------------------------
// CLUBS : niveau atteignable = min(palier d'âge, réputation)
// ---------------------------------------------------------------
export const CLUB_TIERS = [
  { tier: 1, name: 'Club local', minReputation: 20 },
  { tier: 2, name: 'Centre de formation régional', minReputation: 35 },
  { tier: 3, name: 'Club professionnel', minReputation: 50 },
  { tier: 4, name: 'Grand club', minReputation: 65 },
  { tier: 5, name: "Club d'élite", minReputation: 80 },
] as const;

export function getReachableClubTier(age: number, reputationLevel: number): number {
  const stage = getAgeStage(age);
  let reached = 0;
  for (const c of CLUB_TIERS) {
    if (c.tier <= stage.maxClubTier && reputationLevel >= c.minReputation) {
      reached = c.tier;
    }
  }
  return reached;
}

export function getClubTierName(tier: number): string {
  return CLUB_TIERS.find((c) => c.tier === tier)?.name ?? 'Aucun';
}

// ---------------------------------------------------------------
// SPONSORS : âge + réputation + image + abonnés
// ---------------------------------------------------------------
export const SPONSOR_TIERS = [
  { tier: 1, name: 'Équipementier de base', minAge: 16, minReputation: 40, minImage: 30, minFollowers: 200 },
  { tier: 2, name: 'Chaussures sponsorisées', minAge: 17, minReputation: 50, minImage: 40, minFollowers: 2500 },
  { tier: 3, name: 'Sponsors majeurs', minAge: 18, minReputation: 60, minImage: 50, minFollowers: 15000 },
  { tier: 4, name: 'Marque personnelle / luxe', minAge: 22, minReputation: 80, minImage: 65, minFollowers: 60000 },
] as const;

export function getSponsorTier(age: number, rep: PlayerReputation): number {
  let reached = 0;
  for (const s of SPONSOR_TIERS) {
    if (
      age >= s.minAge &&
      rep.niveau >= s.minReputation &&
      rep.image >= s.minImage &&
      rep.followers >= s.minFollowers
    ) {
      reached = s.tier;
    }
  }
  return reached;
}

// ---------------------------------------------------------------
// TRANSFERTS
// ---------------------------------------------------------------
export function isTransferWindowOpen(week: number): boolean {
  return (week >= 1 && week <= 6) || (week >= 20 && week <= 24); // été + janvier
}

export function canTransferAbroad(age: number): boolean {
  return age >= 18;
}

// ---------------------------------------------------------------
// STATUT DES DÉBLOCAGES (utilisé par le dashboard)
// ---------------------------------------------------------------
export interface UnlockStatus {
  id: string;
  label: string;
  unlocked: boolean;
  detail: string;
}

export function getUnlockStatuses(age: number, rep: PlayerReputation, week: number): UnlockStatus[] {
  const stage = getAgeStage(age);
  const clubTier = getReachableClubTier(age, rep.niveau);
  const sponsorTier = getSponsorTier(age, rep);
  const nextSponsor = SPONSOR_TIERS.find((s) => s.tier === sponsorTier + 1);

  const scouting: UnlockStatus = {
    id: 'scouting',
    label: 'Repérage par les clubs',
    unlocked: clubTier > 0,
    detail:
      clubTier > 0
        ? `Niveau atteignable : ${getClubTierName(clubTier)}`
        : `Réputation ${CLUB_TIERS[0].minReputation}+ requise pour être repéré`,
  };

  const agent: UnlockStatus = {
    id: 'agent',
    label: 'Agent',
    unlocked: stage.agentAccess !== 'none',
    detail:
      stage.agentAccess === 'none'
        ? 'Interdit avant 16 ans'
        : stage.agentAccess === 'parents'
          ? 'Via tes parents jusqu\'à 18 ans'
          : 'Négociation directe',
  };

  const sponsor: UnlockStatus = {
    id: 'sponsor',
    label: 'Sponsors',
    unlocked: sponsorTier > 0,
    detail: nextSponsor
      ? `${sponsorTier > 0 ? SPONSOR_TIERS[sponsorTier - 1].name + ' actif. ' : ''}Prochain palier (${nextSponsor.name}) : ${nextSponsor.minAge} ans, réputation ${nextSponsor.minReputation}, image ${nextSponsor.minImage}, ${nextSponsor.minFollowers} abonnés`
      : 'Tous les paliers sont débloqués',
  };

  const abroad: UnlockStatus = {
    id: 'abroad',
    label: 'Transferts internationaux',
    unlocked: canTransferAbroad(age),
    detail: canTransferAbroad(age) ? 'Autorisés' : 'À partir de 18 ans',
  };

  const window: UnlockStatus = {
    id: 'window',
    label: 'Mercato',
    unlocked: isTransferWindowOpen(week),
    detail: isTransferWindowOpen(week) ? 'Fenêtre ouverte' : 'Fenêtre fermée (semaines 1-6 et 20-24)',
  };

  return [scouting, agent, sponsor, abroad, window];
}

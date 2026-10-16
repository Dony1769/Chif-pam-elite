/**
 * FC CAREER — Vestiaire : Cohésion, Rivalités, Amitiés, Leadership
 * Système de dynamiques intra-équipe. Pur domaine — aucune dépendance React.
 */

import { createRng, seedFromString } from "../utils/random";

/* ── Types ───────────────────────────────────────────────────────────── */

export type RelationshipType =
  | "ally"        // Allié — se soutient mutuellement
  | "rival"       // Rival — compétition saine pour les mêmes postes
  | "neutral"     // Neutre — aucune relation particulière
  | "tension"     // Tension — conflit latent
  | "mentor"      // Mentor — joueur plus expérimenté qui guide
  | "protege";    // Protégé — je prends sous mon aile

export interface TeamRelationship {
  teammateId: string;
  teammateName: string;
  type: RelationshipType;
  /** 0-100 : intensité de la relation (positive ou négative) */
  intensity: number;
  /** Saison où la relation s'est formée */
  formSeason: number;
  /** Description narrative */
  story: string;
}

export type LeadershipRole =
  | "none"          // Aucun rôle
  | "vocal"         // Leader vocal — motive l'équipe
  | "captain"       // Capitaine officiel
  | "vice_captain"  // Vice-capitaine
  | "veteran";      // Vétéran respecté

export interface LockerRoomState {
  /** Cohésion globale de l'équipe 0-100 */
  teamCohesion: number;
  /** Rôle du joueur dans le vestiaire */
  leadershipRole: LeadershipRole;
  /** Relations avec les coéquipiers */
  relationships: TeamRelationship[];
  /** Ambiance actuelle du vestiaire */
  atmosphere: "toxic" | "tense" | "neutral" | "positive" | "excellent";
  /** Points de leadership cumulés sur la carrière */
  leadershipPoints: number;
  /** Événements de vestiaire récents (5 max) */
  recentEvents: LockerRoomEvent[];
}

export interface LockerRoomEvent {
  id: string;
  season: number;
  week: number;
  type: "conflict" | "bonding" | "leadership" | "drama" | "celebration";
  title: string;
  description: string;
  /** Effet sur cohésion */
  cohesionDelta: number;
  /** Effet sur leadership */
  leadershipDelta: number;
}

/* ── Initialisation ─────────────────────────────────────────────────── */

export function createInitialLockerRoom(): LockerRoomState {
  return {
    teamCohesion: 50,
    leadershipRole: "none",
    relationships: [],
    atmosphere: "neutral",
    leadershipPoints: 0,
    recentEvents: [],
  };
}

/* ── Calcul de l'ambiance ───────────────────────────────────────────── */

export function computeAtmosphere(
  cohesion: number,
): LockerRoomState["atmosphere"] {
  if (cohesion >= 85) return "excellent";
  if (cohesion >= 65) return "positive";
  if (cohesion >= 40) return "neutral";
  if (cohesion >= 20) return "tense";
  return "toxic";
}

/* ── Effet de la cohésion sur les performances ──────────────────────── */

/**
 * Bonus/malus de cohésion sur l'OVR effectif du joueur.
 * Une équipe soudée améliore les performances, une équipe toxique les plombe.
 */
export function cohesionPerformanceBonus(cohesion: number): number {
  if (cohesion >= 85) return 5;
  if (cohesion >= 65) return 2;
  if (cohesion >= 40) return 0;
  if (cohesion >= 20) return -3;
  return -7;
}

/* ── Génération de relations ─────────────────────────────────────────── */

const RELATIONSHIP_STORIES: Record<RelationshipType, string[]> = {
  ally: [
    "On s'est trouvés dès le premier entraînement. Sur le terrain, on se comprend sans parler.",
    "Il m'a accueilli dans l'équipe. Cette solidarité, ça se mérite et ça se rend.",
    "Ensemble, on est plus forts. C'est ce genre de complicité qui fait les grands clubs.",
  ],
  rival: [
    "On joue au même poste. Ça crée une rivalité, mais c'est sain — ça nous pousse tous les deux.",
    "On ne s'entend pas toujours, mais sur le terrain on donne tout. La compétition est bonne.",
    "Rival dans l'effectif. Chaque match est une occasion de prouver qu'on est meilleur.",
  ],
  neutral: [
    "On coexiste. Pas de friction, pas de complicité particulière.",
    "De bons collègues. On travaille ensemble sans qu'il y ait de lien fort.",
  ],
  tension: [
    "Il y a du froid entre nous depuis l'incident à l'entraînement.",
    "On ne se supporte pas. Ça crée de l'électricité dans le groupe.",
    "Nos styles de jeu et nos mentalités s'opposent. Difficile de cohabiter.",
  ],
  mentor: [
    "Il m'a appris comment survivre dans ce métier. Je lui dois beaucoup.",
    "Son expérience est une ressource inestimable. J'essaie d'absorber chaque conseil.",
    "Travailler avec lui, c'est apprendre quelque chose de nouveau chaque jour.",
  ],
  protege: [
    "Je vois en lui ce que j'étais. Je veux lui éviter mes erreurs.",
    "Il a du talent brut. Mon rôle, c'est de l'aider à le canaliser.",
    "Prendre quelqu'un sous son aile, c'est aussi se rappeler ses propres débuts.",
  ],
};

export function generateTeammateRelationship(
  teammateId: string,
  teammateName: string,
  playerAge: number,
  teammateAge: number,
  playerPosition: string,
  teammatePosition: string,
  season: number,
  seed: string,
): TeamRelationship {
  const rng = createRng(seedFromString(seed));

  // Logique de type de relation
  let type: RelationshipType;
  const samePosition = playerPosition === teammatePosition;
  const ageDiff = Math.abs(playerAge - teammateAge);
  const isOlder = teammateAge > playerAge + 5;
  const isYounger = playerAge > teammateAge + 5;

  if (isOlder) {
    type = rng.chance(0.45) ? "mentor" : samePosition ? "rival" : "neutral";
  } else if (isYounger) {
    type = rng.chance(0.35) ? "protege" : samePosition ? "rival" : "neutral";
  } else if (samePosition) {
    type = rng.chance(0.5) ? "rival" : rng.chance(0.3) ? "tension" : "ally";
  } else {
    const roll = rng.float(0, 1);
    type = roll < 0.35 ? "ally" : roll < 0.55 ? "neutral" : roll < 0.75 ? "rival" : "tension";
  }

  const stories = RELATIONSHIP_STORIES[type];
  const story = rng.pick(stories);
  const intensity = rng.int(30, 80);

  return {
    teammateId,
    teammateName,
    type,
    intensity,
    formSeason: season,
    story,
  };
}

/* ── Événements de vestiaire ─────────────────────────────────────────── */

type LockerRoomEventTrigger =
  | "win_streak"      // Série de victoires
  | "loss_streak"     // Série de défaites
  | "big_win"         // Grande victoire
  | "big_loss"        // Grande défaite
  | "contract_drama"  // Drama de contrat (quelqu'un reçoit une grosse offre)
  | "team_dinner"     // Dîner d'équipe
  | "captain_speech"  // Discours de capitaine
  | "dressing_room_fight"; // Altercation

interface LockerRoomEventDef {
  type: LockerRoomEvent["type"];
  title: string;
  description: string;
  cohesionDelta: number;
  leadershipDelta: number;
}

const LOCKER_ROOM_EVENTS: Record<LockerRoomEventTrigger, LockerRoomEventDef[]> = {
  win_streak: [
    { type: "bonding", title: "Dynamique positive", description: "La série de victoires crée une énergie dans le groupe. Chaque entraînement est intense, chaque blague résonne plus fort.", cohesionDelta: 8, leadershipDelta: 2 },
    { type: "celebration", title: "Fête d'équipe", description: "On célèbre ensemble. Ces moments renforcent les liens bien au-delà du terrain.", cohesionDelta: 10, leadershipDelta: 3 },
  ],
  loss_streak: [
    { type: "drama", title: "Tensions après les défaites", description: "Les défaites répétées créent des frictions. Certains cherchent des boucs émissaires.", cohesionDelta: -8, leadershipDelta: 1 },
    { type: "conflict", title: "Altercation à l'entraînement", description: "La pression monte. Une dispute éclate sur le terrain d'entraînement.", cohesionDelta: -12, leadershipDelta: -2 },
  ],
  big_win: [
    { type: "celebration", title: "Euphorie du groupe", description: "Cette victoire, on l'attendait depuis longtemps. Le vestiaire n'a jamais été aussi uni.", cohesionDelta: 12, leadershipDelta: 3 },
  ],
  big_loss: [
    { type: "conflict", title: "Remise en question", description: "Lourd silence dans le vestiaire. Chacun essaie de comprendre ce qui s'est passé.", cohesionDelta: -10, leadershipDelta: 0 },
  ],
  contract_drama: [
    { type: "drama", title: "Rumeurs de transfert", description: "Un coéquipier serait sur le point de partir. L'incertitude pèse sur le groupe.", cohesionDelta: -5, leadershipDelta: 0 },
    { type: "drama", title: "Jalousie dans l'effectif", description: "Un gros contrat a fuité. Les regards se croisent différemment dans le couloir.", cohesionDelta: -7, leadershipDelta: 1 },
  ],
  team_dinner: [
    { type: "bonding", title: "Dîner d'équipe", description: "Le staff a organisé un repas d'équipe. Ces moments hors du terrain sont précieux.", cohesionDelta: 7, leadershipDelta: 1 },
    { type: "bonding", title: "Soirée jeux vidéo", description: "Un tournoi FIFA dans la salle commune. Compétitifs même pour rire.", cohesionDelta: 5, leadershipDelta: 1 },
  ],
  captain_speech: [
    { type: "leadership", title: "Discours du capitaine", description: "Il a parlé avec sincérité. Ces mots ont touché tout le monde. L'unité est là.", cohesionDelta: 10, leadershipDelta: 5 },
  ],
  dressing_room_fight: [
    { type: "conflict", title: "Clash dans le vestiaire", description: "Une dispute a dégénéré. L'ambiance est électrique, pas dans le bon sens.", cohesionDelta: -15, leadershipDelta: -3 },
  ],
};

export function generateLockerRoomEvent(
  trigger: LockerRoomEventTrigger,
  season: number,
  week: number,
  seed: string,
): LockerRoomEvent {
  const rng = createRng(seedFromString(seed));
  const defs = LOCKER_ROOM_EVENTS[trigger];
  const def = rng.pick(defs);

  return {
    id: `lre-${season}-${week}-${trigger}`,
    season,
    week,
    ...def,
  };
}

/* ── Mise à jour périodique ──────────────────────────────────────────── */

/**
 * Met à jour la cohésion et le leadership chaque semaine.
 * Prend en compte les matchs récents, l'ambiance actuelle.
 */
export function updateLockerRoomWeekly(
  state: LockerRoomState,
  playerRating: number | null,  // null si pas de match cette semaine
  isWin: boolean | null,
  week: number,
  season: number,
): LockerRoomState {
  let cohesionDelta = 0;
  let leadershipDelta = 0;
  const newEvents: LockerRoomEvent[] = [];

  if (playerRating !== null && isWin !== null) {
    if (isWin) {
      cohesionDelta += 3;
      if (playerRating >= 8) leadershipDelta += 2;
    } else {
      cohesionDelta -= 2;
    }
  }

  // Dérive naturelle vers la neutralité
  const mid = 50;
  const drift = (mid - state.teamCohesion) * 0.02;
  cohesionDelta += drift;

  const newCohesion = Math.min(100, Math.max(0, state.teamCohesion + cohesionDelta));
  const newLeadership = Math.min(200, Math.max(0, state.leadershipPoints + leadershipDelta));

  // Calculer nouveau rôle de leadership
  const newRole = computeLeadershipRole(newLeadership, state.leadershipRole);

  return {
    ...state,
    teamCohesion: newCohesion,
    leadershipPoints: newLeadership,
    leadershipRole: newRole,
    atmosphere: computeAtmosphere(newCohesion),
    recentEvents: [...newEvents, ...state.recentEvents].slice(0, 5),
  };
}

/**
 * Déclenche un événement de vestiaire selon le contexte de saison.
 */
export function triggerLockerRoomEvent(
  state: LockerRoomState,
  trigger: LockerRoomEventTrigger,
  season: number,
  week: number,
): LockerRoomState {
  const event = generateLockerRoomEvent(trigger, season, week, `${trigger}-${season}-${week}`);
  const newCohesion = Math.min(100, Math.max(0, state.teamCohesion + event.cohesionDelta));
  const newLeadership = Math.min(200, Math.max(0, state.leadershipPoints + event.leadershipDelta));

  return {
    ...state,
    teamCohesion: newCohesion,
    leadershipPoints: newLeadership,
    leadershipRole: computeLeadershipRole(newLeadership, state.leadershipRole),
    atmosphere: computeAtmosphere(newCohesion),
    recentEvents: [event, ...state.recentEvents].slice(0, 5),
  };
}

/* ── Leadership ─────────────────────────────────────────────────────── */

export function computeLeadershipRole(
  points: number,
  currentRole: LeadershipRole,
): LeadershipRole {
  if (points >= 150) return "captain";
  if (points >= 100) return "vice_captain";
  if (points >= 60) return "vocal";
  if (points >= 30) return "veteran";
  return "none";
}

/** Description du rôle de leadership */
export function leadershipRoleLabel(role: LeadershipRole): string {
  const labels: Record<LeadershipRole, string> = {
    none: "Sans rôle particulier",
    veteran: "Vétéran respecté",
    vocal: "Leader vocal",
    vice_captain: "Vice-capitaine",
    captain: "Capitaine",
  };
  return labels[role];
}

/** Bonus de confiance coach selon le rôle de leadership */
export function leadershipTrustBonus(role: LeadershipRole): number {
  const bonuses: Record<LeadershipRole, number> = {
    none: 0,
    veteran: 3,
    vocal: 5,
    vice_captain: 8,
    captain: 12,
  };
  return bonuses[role];
}

/* ── Fin de saison ──────────────────────────────────────────────────── */

/**
 * Réinitialise partiellement le vestiaire en fin de saison.
 * Les relations persistent, la cohésion se réinitialise partiellement.
 */
export function resetLockerRoomEndOfSeason(
  state: LockerRoomState,
): LockerRoomState {
  // Cohésion tend vers 50 entre les saisons (mercato, départs, arrivées)
  const newCohesion = Math.round((state.teamCohesion + 50) / 2);

  return {
    ...state,
    teamCohesion: newCohesion,
    atmosphere: computeAtmosphere(newCohesion),
    recentEvents: [],
    // Les relations persistent mais s'atténuent légèrement
    relationships: state.relationships.map(r => ({
      ...r,
      intensity: Math.max(20, r.intensity - 10),
    })),
  };
}

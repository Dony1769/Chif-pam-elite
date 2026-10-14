/**
 * FC CAREER — Domaine : Joueur
 * Types métier du joueur, indépendants de React et du navigateur.
 */

// ── Identité ────────────────────────────────────────────────────────────────

export type Foot = "left" | "right" | "both";
export type Position =
  | "GK"
  | "CB" | "LB" | "RB" | "LWB" | "RWB"
  | "CDM" | "CM" | "CAM" | "LM" | "RM"
  | "LW" | "RW" | "CF" | "ST";

export type PositionFamily =
  | "goalkeeper"
  | "defender"
  | "midfielder"
  | "attacker";

export function positionFamily(pos: Position): PositionFamily {
  if (pos === "GK") return "goalkeeper";
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(pos)) return "defender";
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(pos)) return "midfielder";
  return "attacker";
}

// ── Attributs ────────────────────────────────────────────────────────────────

/** 51 attributs répartis en 6 familles */
export interface PlayerAttributes {
  // Technique (10)
  ballControl: number;
  dribbling: number;
  crossing: number;
  finishing: number;
  freeKick: number;
  longPassing: number;
  shortPassing: number;
  longShot: number;
  curve: number;
  volleys: number;
  // Physique (8)
  acceleration: number;
  sprintSpeed: number;
  agility: number;
  balance: number;
  jumping: number;
  stamina: number;
  strength: number;
  reactions: number;
  // Mental (7)
  aggression: number;
  composure: number;
  interceptions: number;
  positioning: number;
  vision: number;
  penalties: number;
  marking: number;
  // Défensif (6)
  standingTackle: number;
  slidingTackle: number;
  headingAccuracy: number;
  defAwareness: number;
  defWork: number;
  defLine: number;
  // Offensif (6)
  attPositioning: number;
  attWork: number;
  shotPower: number;
  weakFoot: number;
  skillMoves: number;
  offside: number;
  // Gardien (14)
  gkDiving: number;
  gkHandling: number;
  gkKicking: number;
  gkPositioning: number;
  gkReflexes: number;
  gkSpeed: number;
  gkDistribution: number;
  gkSweeper: number;
  gkComesOff: number;
  gkCross: number;
  gkOneonOne: number;
  gkPenalty: number;
  gkDirectFreeKick: number;
  gkPlaymake: number;
}

export type AttributeKey = keyof PlayerAttributes;

/** Calcule la note globale selon la famille de poste */
export function computeOverall(attrs: PlayerAttributes, family: PositionFamily): number {
  let sum = 0;
  let count = 0;

  const add = (keys: AttributeKey[]) => {
    for (const k of keys) { sum += attrs[k]; count++; }
  };

  if (family === "goalkeeper") {
    add(["gkDiving","gkHandling","gkKicking","gkPositioning","gkReflexes","gkSpeed","gkDistribution","gkSweeper"]);
    add(["reactions","composure"]);
  } else if (family === "defender") {
    add(["standingTackle","slidingTackle","headingAccuracy","defAwareness","strength","jumping"]);
    add(["shortPassing","reactions","composure","interceptions","marking","defWork"]);
  } else if (family === "midfielder") {
    add(["shortPassing","longPassing","vision","ballControl","stamina","reactions"]);
    add(["interceptions","composure","dribbling","positioning","agility"]);
  } else {
    add(["finishing","shotPower","longShot","positioning","acceleration","sprintSpeed"]);
    add(["dribbling","ballControl","agility","reactions","composure","attPositioning"]);
  }

  const raw = count > 0 ? sum / count : 50;
  return Math.max(1, Math.min(99, Math.round(raw)));
}

// ── PlayStyles ───────────────────────────────────────────────────────────────

export interface PlayerPlayStyle {
  id: string;
  isPlus: boolean;
  unlockedAt: number; // timestamp
}

// ── Traits ───────────────────────────────────────────────────────────────────

export interface PlayerTrait {
  traitId: string;
  hidden: boolean;
}

// ── État physique et mental ──────────────────────────────────────────────────

export interface PlayerCondition {
  /** 0-100 : forme actuelle (influence les attributs en match) */
  form: number;
  /** 0-100 : fatigue accumulée (100 = épuisé) */
  fatigue: number;
  /** 0-100 : moral (affecte la progression et les performances) */
  morale: number;
  /** null = en forme, sinon blessure active */
  injury: PlayerInjury | null;
}

export interface PlayerInjury {
  type: string;
  severity: "minor" | "moderate" | "severe";
  /** Nombre de jours de match restants */
  daysRemaining: number;
}

// ── Contrat ──────────────────────────────────────────────────────────────────

export type ContractRole = "squad" | "starter" | "key" | "captain";

export interface PlayerContract {
  clubId: string;
  salary: number;         // €/semaine
  bonusGoal: number;      // € par but
  bonusAssist: number;    // € par passe décisive
  startSeason: number;
  endSeason: number;
  role: ContractRole;
}

// ── Statistiques ─────────────────────────────────────────────────────────────

export interface SeasonStats {
  season: number;
  clubId: string;
  appearances: number;
  starts: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  avgRating: number;
  motmCount: number;
}

export interface CareerStats {
  totalAppearances: number;
  totalGoals: number;
  totalAssists: number;
  totalYellowCards: number;
  totalRedCards: number;
  totalMinutes: number;
  peakOverall: number;
  seasons: SeasonStats[];
}

// ── Progression ──────────────────────────────────────────────────────────────

export interface ProgressionEntry {
  season: number;
  overall: number;
  potential: number;
  /** Points d'attribut disponibles */
  paPoints: number;
}

// ── Joueur complet ────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  /** Âge au début de la carrière */
  birthAge: number;
  /** Âge actuel (calculé) */
  age: number;
  foot: Foot;
  position: Position;
  heightCm: number;
  weightKg: number;

  attributes: PlayerAttributes;
  /** Note globale calculée */
  overall: number;
  /** Potentiel maximum atteignable */
  potential: number;

  condition: PlayerCondition;
  contract: PlayerContract;
  playStyles: PlayerPlayStyle[];
  traits: PlayerTrait[];

  /** Points d'attribut non investis */
  paPoints: number;
  stats: CareerStats;
  progressionHistory: ProgressionEntry[];

  /** Réputation sportive 0-100 */
  reputation: number;
  /** Popularité publique 0-100 */
  popularity: number;
}

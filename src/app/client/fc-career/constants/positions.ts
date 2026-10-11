/**
 * FC CAREER — Postes, formations, archétypes de jeu
 */

export type PositionId =
  | "GK"
  | "RB" | "RCB" | "LCB" | "LB"
  | "CDM" | "CM" | "CAM"
  | "RW" | "LW"
  | "ST" | "CF";

export type PositionFamily = "gk" | "def" | "mid" | "att";

export interface PositionDef {
  id: PositionId;
  label: string; // "Latéral droit"
  short: string; // "RD"
  family: PositionFamily;
}

export const POSITIONS: PositionDef[] = [
  { id: "GK", label: "Gardien", short: "GB", family: "gk" },
  { id: "RB", label: "Latéral droit", short: "LD", family: "def" },
  { id: "RCB", label: "Défenseur central droit", short: "DCD", family: "def" },
  { id: "LCB", label: "Défenseur central gauche", short: "DCG", family: "def" },
  { id: "LB", label: "Latéral gauche", short: "LG", family: "def" },
  { id: "CDM", label: "Milieu défensif", short: "MQ", family: "mid" },
  { id: "CM", label: "Milieu central", short: "MC", family: "mid" },
  { id: "CAM", label: "Milieu offensif", short: "MO", family: "mid" },
  { id: "RW", label: "Ailier droit", short: "AD", family: "att" },
  { id: "LW", label: "Ailier gauche", short: "AG", family: "att" },
  { id: "ST", label: "Avant-centre", short: "AC", family: "att" },
  { id: "CF", label: "Second attaquant", short: "SA", family: "att" },
];

export function getPosition(id: PositionId): PositionDef {
  const p = POSITIONS.find((x) => x.id === id);
  if (!p) throw new Error(`Position inconnue: ${id}`);
  return p;
}

/** Archétype = style de jeu proposé à la création du joueur. */
export type PlayingStyleId =
  | "regista" // organisateur
  | "box-to-box" // relayeur complet
  | "target-man" // avant puissant
  | "poacher" // renard des surfaces
  | "winger" // dribbleur explosif
  | "ball-playing-def" // défenseur relanceur
  | "sweeper-keeper" // gardien libéro
  | "complete"; // équilibré

export interface StyleDef {
  id: PlayingStyleId;
  label: string;
  description: string;
  bestPositions: PositionId[];
  /** Bonus/malus appliqués aux familles d'attributs à la génération. */
  modifiers: Partial<Record<"technical" | "physical" | "mental" | "defensive" | "offensive" | "goalkeeping", number>>;
}

export const PLAYING_STYLES: StyleDef[] = [
  {
    id: "regista",
    label: "Régista",
    description: "Le métronome : vision, passes longues, tempo.",
    bestPositions: ["CDM", "CM"],
    modifiers: { technical: 6, mental: 4, physical: -3 },
  },
  {
    id: "box-to-box",
    label: "Box-to-box",
    description: "Poumon infatigable, présent dans toutes les zones.",
    bestPositions: ["CM", "CAM"],
    modifiers: { physical: 5, mental: 2, offensive: 2 },
  },
  {
    id: "target-man",
    label: "Avant cible",
    description: "Appui physique, jeu aérien, déviations.",
    bestPositions: ["ST", "CF"],
    modifiers: { physical: 6, offensive: 3, technical: -2 },
  },
  {
    id: "poacher",
    label: "Renard des surfaces",
    description: "Froid devant le but, appels permanents.",
    bestPositions: ["ST"],
    modifiers: { offensive: 6, technical: 3, physical: -2 },
  },
  {
    id: "winger",
    label: "Ailier fusée",
    description: "Explosivité, dribble, centres en mouvement.",
    bestPositions: ["RW", "LW"],
    modifiers: { physical: 4, technical: 4, defensive: -4 },
  },
  {
    id: "ball-playing-def",
    label: "Défenseur relanceur",
    description: "Sérénité balle au pied, projection vers l'avant.",
    bestPositions: ["RCB", "LCB", "LB", "RB"],
    modifiers: { defensive: 5, technical: 3, mental: 2 },
  },
  {
    id: "sweeper-keeper",
    label: "Gardien libéro",
    description: "Sorties audacieuses, jeu du pied moderne.",
    bestPositions: ["GK"],
    modifiers: { goalkeeping: 8, mental: 2 },
  },
  {
    id: "complete",
    label: "Joueur complet",
    description: "Polyvalent, aucun point faible marqué.",
    bestPositions: ["CM", "CAM", "CF", "LB", "RB"],
    modifiers: {},
  },
];

export function getStyle(id: PlayingStyleId): StyleDef {
  const s = PLAYING_STYLES.find((x) => x.id === id);
  if (!s) throw new Error(`Style inconnu: ${id}`);
  return s;
}

/** Rôles tactiques utilisés par le moteur de match (notation par rôle). */
export const ROLE_WEIGHTS: Record<PositionFamily, Partial<Record<string, number>>> = {
  gk: { gReflexes: 0.25, gHandling: 0.2, gOneOnOne: 0.15, gKicking: 0.1, reaction: 0.1, concentration: 0.2 },
  def: { standingTackle: 0.15, marking: 0.15, aerialDuels: 0.15, interceptions: 0.12, strength: 0.1, pace: 0.08, shortPass: 0.1, positioning: 0.15 },
  mid: { shortPass: 0.15, vision: 0.15, control: 0.12, stamina: 0.1, decisionMaking: 0.12, workRate: 0.1, creativity: 0.1, firstTouch: 0.1 },
  att: { finishing: 0.2, offensiveAwareness: 0.15, dribble: 0.12, pace: 0.12, firstTouch: 0.1, composure: 0.1, runsSpace: 0.1 },
};

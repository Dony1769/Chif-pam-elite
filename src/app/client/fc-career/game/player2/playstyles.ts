/**
 * FC CAREER 27 — PlayStyles (liste officielle FC 27, noms français).
 *
 * Un PlayStyle se débloque quand les sous-attributs requis sont atteints ET
 * que le joueur a réussi assez d'actions liées en match. Le PlayStyle+ (or)
 * demande des seuils plus hauts, davantage de réussites et une note ≥ 75 ;
 * 3 PlayStyles+ au maximum, comme dans FC.
 *
 * Effets en match : +5 % de réussite sur les actions liées (+10 % en PS+),
 * et certaines options n'existent qu'avec le PlayStyle (lob, retourné…).
 */

import type { SubAttrs, SubKey } from "./subAttributes";

export type OptionId =
  // Attaque
  | "shoot" | "pass" | "dribble" | "cross" | "through" | "longshot"
  | "finesse" | "chip" | "acrobatic" | "header" | "lowdriven" | "powershot" | "trivela"
  | "freekick" | "penalty" | "longball" | "outside" | "flair" | "longthrow"
  // Défense
  | "tackle" | "intercept" | "contain" | "slide" | "block" | "aerial"
  // Gardien
  | "dive" | "stand" | "rush" | "claim" | "footsave" | "quickthrow";

export type PsCategory = "Finition" | "Passes" | "Conduite de balle" | "Défensifs" | "Physique" | "Gardien";

export type PsId =
  | "acrobatic" | "chip_shot" | "dead_ball" | "finesse_shot" | "trivela" | "low_driven" | "power_shot" | "precision_header"
  | "incisive_pass" | "inventive" | "long_ball" | "pinged_pass" | "tiki_taka" | "whipped_pass"
  | "first_touch" | "press_proven" | "rapid" | "technical" | "flair"
  | "aerial_fortress" | "anticipate" | "block" | "intercept" | "jockey" | "slide_tackle"
  | "bruiser" | "enforcer" | "long_throw" | "quick_step" | "relentless"
  | "rush_out" | "cross_claimer" | "deflector" | "far_reach" | "far_throw" | "footwork";

export interface PlayStyleDef {
  id: PsId;
  name: string;
  cat: PsCategory;
  gk?: boolean;
  desc: string;
  /** Seuils pour le PlayStyle */
  req: Partial<Record<SubKey, number>>;
  /** Seuils pour le PlayStyle+ */
  plusReq: Partial<Record<SubKey, number>>;
  /** Actions dont les réussites font progresser vers le déblocage */
  track: OptionId[];
  /** Réussites nécessaires (PS, PS+) ; 0 = seuils seuls */
  uses: [number, number];
  /** Actions dont la réussite est améliorée */
  boosts: OptionId[];
  /** Options qui n'existent qu'avec ce PlayStyle */
  unlocks?: OptionId[];
}

const d = (x: PlayStyleDef) => x;

export const PLAYSTYLES: PlayStyleDef[] = [
  // ── Finition ──
  d({ id: "acrobatic", name: "Acrobatique", cat: "Finition", desc: "Volées plus précises, retournés et ciseaux possibles.",
    req: { volleys: 75, agility: 72 }, plusReq: { volleys: 85, agility: 80 }, track: ["shoot", "acrobatic"], uses: [12, 35], boosts: ["acrobatic"], unlocks: ["acrobatic"] }),
  d({ id: "chip_shot", name: "Ballon piqué", cat: "Finition", desc: "Lobes plus rapides et plus précis.",
    req: { finishing: 72, composure: 70 }, plusReq: { finishing: 84, composure: 82 }, track: ["shoot", "chip"], uses: [10, 30], boosts: ["chip"], unlocks: ["chip"] }),
  d({ id: "dead_ball", name: "Coup de pied arrêté", cat: "Finition", desc: "Coups francs plus rapides, plus enroulés et plus précis.",
    req: { freeKick: 76, curve: 74 }, plusReq: { freeKick: 87, curve: 85 }, track: ["freekick", "cross"], uses: [6, 20], boosts: ["freekick", "penalty"] }),
  d({ id: "finesse_shot", name: "Tir en finesse", cat: "Finition", desc: "Tirs placés plus rapides, plus enroulés et plus précis.",
    req: { finishing: 74, curve: 72 }, plusReq: { finishing: 86, curve: 84 }, track: ["shoot", "longshot", "finesse"], uses: [12, 35], boosts: ["finesse", "shoot"], unlocks: ["finesse"] }),
  d({ id: "trivela", name: "Révolutionnaire", cat: "Finition", desc: "Frappes de l'extérieur du pied plus précises.",
    req: { curve: 76, longShots: 72 }, plusReq: { curve: 86, longShots: 82 }, track: ["longshot", "trivela"], uses: [10, 30], boosts: ["trivela"], unlocks: ["trivela"] }),
  d({ id: "low_driven", name: "Tir rasant appuyé", cat: "Finition", desc: "Frappes rasantes plus précises et plus rapides.",
    req: { shotPower: 74, finishing: 70 }, plusReq: { shotPower: 85, finishing: 82 }, track: ["shoot", "lowdriven"], uses: [10, 30], boosts: ["lowdriven", "shoot"], unlocks: ["lowdriven"] }),
  d({ id: "power_shot", name: "Tir puissant", cat: "Finition", desc: "Frappes puissantes plus fortes et plus précises.",
    req: { shotPower: 80, longShots: 72 }, plusReq: { shotPower: 88, longShots: 83 }, track: ["longshot", "powershot"], uses: [10, 30], boosts: ["powershot", "longshot"], unlocks: ["powershot"] }),
  d({ id: "precision_header", name: "Tête précise", cat: "Finition", desc: "Têtes plus précises et plus puissantes.",
    req: { headingAccuracy: 75, jumping: 70 }, plusReq: { headingAccuracy: 86, jumping: 80 }, track: ["header"], uses: [8, 25], boosts: ["header"] }),
  // ── Passes ──
  d({ id: "incisive_pass", name: "Passe incisive", cat: "Passes", desc: "Passes en profondeur plus précises et plus rapides.",
    req: { vision: 76, shortPassing: 74 }, plusReq: { vision: 87, shortPassing: 85 }, track: ["through"], uses: [12, 35], boosts: ["through"] }),
  d({ id: "inventive", name: "Fantaisiste", cat: "Passes", desc: "Passes créatives et de l'extérieur plus précises.",
    req: { vision: 78, curve: 72 }, plusReq: { vision: 88, curve: 82 }, track: ["through", "pass", "outside"], uses: [12, 35], boosts: ["outside"], unlocks: ["outside"] }),
  d({ id: "long_ball", name: "Passe longue", cat: "Passes", desc: "Passes lobées plus précises, plus rapides, plus dures à intercepter.",
    req: { longPassing: 76, vision: 70 }, plusReq: { longPassing: 87, vision: 80 }, track: ["through", "longball"], uses: [10, 30], boosts: ["longball"], unlocks: ["longball"] }),
  d({ id: "pinged_pass", name: "Passe fusante", cat: "Passes", desc: "Passes au sol plus rapides sans être plus dures à recevoir.",
    req: { shortPassing: 76, longPassing: 70 }, plusReq: { shortPassing: 86, longPassing: 80 }, track: ["pass", "through"], uses: [15, 40], boosts: ["pass", "through"] }),
  d({ id: "tiki_taka", name: "Tiki-taka", cat: "Passes", desc: "Passes courtes et en une touche plus précises.",
    req: { shortPassing: 78, ballControl: 75 }, plusReq: { shortPassing: 88, ballControl: 85 }, track: ["pass"], uses: [20, 50], boosts: ["pass"] }),
  d({ id: "whipped_pass", name: "Passe travaillée", cat: "Passes", desc: "Centres plus précis, plus enroulés et plus rapides.",
    req: { crossing: 76, curve: 70 }, plusReq: { crossing: 87, curve: 80 }, track: ["cross"], uses: [10, 30], boosts: ["cross"] }),
  // ── Conduite de balle ──
  d({ id: "first_touch", name: "Prise de contrôle", cat: "Conduite de balle", desc: "Moins d'erreurs en protection, départs balle au pied plus rapides.",
    req: { ballControl: 77, reactions: 72 }, plusReq: { ballControl: 87, reactions: 82 }, track: ["dribble", "pass"], uses: [15, 40], boosts: ["dribble", "pass"] }),
  d({ id: "press_proven", name: "Résiste au pressing", cat: "Conduite de balle", desc: "Meilleur contrôle sous la pression d'adversaires plus forts.",
    req: { ballControl: 74, composure: 74, strength: 65 }, plusReq: { ballControl: 85, composure: 85, strength: 72 }, track: ["dribble", "pass"], uses: [15, 40], boosts: ["dribble"] }),
  d({ id: "rapid", name: "Rapide", cat: "Conduite de balle", desc: "Vitesse de pointe balle au pied, moins d'erreurs en sprint.",
    req: { sprintSpeed: 82, dribbling: 72 }, plusReq: { sprintSpeed: 90, dribbling: 82 }, track: ["dribble"], uses: [12, 35], boosts: ["dribble"] }),
  d({ id: "technical", name: "Technique", cat: "Conduite de balle", desc: "Sprints contrôlés plus rapides, crochets plus précis.",
    req: { dribbling: 78, agility: 74 }, plusReq: { dribbling: 88, agility: 84 }, track: ["dribble"], uses: [15, 40], boosts: ["dribble"] }),
  d({ id: "flair", name: "Freestyleur", cat: "Conduite de balle", desc: "Gestes aériens uniques en 1 contre 1.",
    req: { dribbling: 80, agility: 80, balance: 74 }, plusReq: { dribbling: 89, agility: 88, balance: 82 }, track: ["dribble", "flair"], uses: [15, 40], boosts: ["flair"], unlocks: ["flair"] }),
  // ── Défensifs ──
  d({ id: "aerial_fortress", name: "Forteresse aérienne", cat: "Défensifs", desc: "Détente et présence accrues dans les duels aériens.",
    req: { jumping: 75, headingAccuracy: 72, strength: 70 }, plusReq: { jumping: 85, headingAccuracy: 82, strength: 80 }, track: ["aerial", "header"], uses: [10, 30], boosts: ["aerial", "header"] }),
  d({ id: "anticipate", name: "Anticipation", cat: "Défensifs", desc: "Tacles debout plus efficaces, ballon conservé après le tacle.",
    req: { standingTackle: 76, defAwareness: 74 }, plusReq: { standingTackle: 86, defAwareness: 84 }, track: ["tackle"], uses: [12, 35], boosts: ["tackle"] }),
  d({ id: "block", name: "Contre", cat: "Défensifs", desc: "Meilleure allonge pour contrer les frappes.",
    req: { defAwareness: 72, reactions: 70 }, plusReq: { defAwareness: 84, reactions: 80 }, track: ["contain", "block"], uses: [10, 30], boosts: ["block"], unlocks: ["block"] }),
  d({ id: "intercept", name: "Interception", cat: "Défensifs", desc: "Plus d'allonge et meilleure conservation après interception.",
    req: { interceptions: 76, reactions: 70 }, plusReq: { interceptions: 86, reactions: 80 }, track: ["intercept"], uses: [12, 35], boosts: ["intercept"] }),
  d({ id: "jockey", name: "Lutte", cat: "Défensifs", desc: "Plus rapide en temporisation, transition vers le sprint plus vive.",
    req: { defAwareness: 72, acceleration: 70 }, plusReq: { defAwareness: 84, acceleration: 80 }, track: ["contain"], uses: [12, 35], boosts: ["contain"] }),
  d({ id: "slide_tackle", name: "Tacle glissé", cat: "Défensifs", desc: "Tacles glissés qui récupèrent le ballon.",
    req: { slidingTackle: 76, defAwareness: 70 }, plusReq: { slidingTackle: 86, defAwareness: 80 }, track: ["tackle", "slide"], uses: [10, 30], boosts: ["slide"], unlocks: ["slide"] }),
  // ── Physique ──
  d({ id: "bruiser", name: "Agressif", cat: "Physique", desc: "Plus de force dans les tacles physiques.",
    req: { strength: 78, aggression: 74 }, plusReq: { strength: 87, aggression: 84 }, track: ["tackle"], uses: [12, 35], boosts: ["tackle"] }),
  d({ id: "enforcer", name: "Passage en force", cat: "Physique", desc: "Charges et protection de balle plus efficaces.",
    req: { strength: 80, balance: 65 }, plusReq: { strength: 88, balance: 72 }, track: ["dribble", "contain"], uses: [12, 35], boosts: ["contain", "dribble"] }),
  d({ id: "long_throw", name: "Longue touche", cat: "Physique", desc: "Touches beaucoup plus longues.",
    req: { strength: 72, shotPower: 70 }, plusReq: { strength: 82, shotPower: 80 }, track: ["cross"], uses: [8, 25], boosts: ["longthrow"], unlocks: ["longthrow"] }),
  d({ id: "quick_step", name: "Foulée rapide", cat: "Physique", desc: "Accélération explosive.",
    req: { acceleration: 84 }, plusReq: { acceleration: 91 }, track: ["dribble", "intercept"], uses: [12, 35], boosts: ["dribble", "intercept"] }),
  d({ id: "relentless", name: "Infatigable", cat: "Physique", desc: "Moins de fatigue, récupération plus rapide à la mi-temps.",
    req: { stamina: 82 }, plusReq: { stamina: 90 }, track: [], uses: [0, 0], boosts: [] }),
  // ── Gardien ──
  d({ id: "rush_out", name: "Marquage 1-1", cat: "Gardien", gk: true, desc: "Sorties plus agressives sur les ballons longs.",
    req: { gkPositioning: 75, acceleration: 55 }, plusReq: { gkPositioning: 85, acceleration: 62 }, track: ["rush"], uses: [8, 25], boosts: ["rush"] }),
  d({ id: "cross_claimer", name: "Sortie sur les centres", cat: "Gardien", gk: true, desc: "Captations et dégagements des poings plus sûrs.",
    req: { gkHandling: 76, jumping: 60 }, plusReq: { gkHandling: 86, jumping: 68 }, track: ["stand", "claim"], uses: [8, 25], boosts: ["claim"], unlocks: ["claim"] }),
  d({ id: "deflector", name: "Déviation", cat: "Gardien", gk: true, desc: "Repousse les frappes vers des zones sûres.",
    req: { gkDiving: 76, gkReflexes: 74 }, plusReq: { gkDiving: 86, gkReflexes: 84 }, track: ["dive"], uses: [10, 30], boosts: ["dive"] }),
  d({ id: "far_reach", name: "Classe de loin", cat: "Gardien", gk: true, desc: "Meilleurs arrêts sur les frappes lointaines.",
    req: { gkDiving: 78 }, plusReq: { gkDiving: 88 }, track: ["dive"], uses: [10, 30], boosts: ["dive", "stand"] }),
  d({ id: "far_throw", name: "Longue relance", cat: "Gardien", gk: true, desc: "Relances à la main beaucoup plus longues.",
    req: { gkKicking: 74 }, plusReq: { gkKicking: 85 }, track: ["quickthrow"], uses: [6, 20], boosts: ["quickthrow"], unlocks: ["quickthrow"] }),
  d({ id: "footwork", name: "Arrêt du pied", cat: "Gardien", gk: true, desc: "Meilleurs arrêts sur les frappes basses.",
    req: { gkReflexes: 78 }, plusReq: { gkReflexes: 88 }, track: ["stand", "footsave"], uses: [8, 25], boosts: ["footsave", "stand"], unlocks: ["footsave"] }),
];

export const PS_BY_ID: Record<PsId, PlayStyleDef> = Object.fromEntries(PLAYSTYLES.map(p => [p.id, p])) as Record<PsId, PlayStyleDef>;
export const MAX_PS_PLUS = 3;

export interface PlayStyleState {
  /** PlayStyles obtenus */
  owned: PsId[];
  /** PlayStyles+ obtenus (sous-ensemble de owned) */
  plus: PsId[];
  /** Réussites cumulées par action en match */
  progress: Partial<Record<OptionId, number>>;
}

export const emptyPlayStyles = (): PlayStyleState => ({ owned: [], plus: [], progress: {} });

const meets = (s: SubAttrs, req: Partial<Record<SubKey, number>>) =>
  (Object.entries(req) as [SubKey, number][]).every(([k, v]) => (s[k] ?? 0) >= v);
const tracked = (ps: PlayStyleState, def: PlayStyleDef) => def.track.reduce((t, o) => t + (ps.progress[o] ?? 0), 0);

/** Progression vers un PlayStyle (0-1) : moyenne des seuils et des réussites. */
export function psProgress(ps: PlayStyleState, def: PlayStyleDef, s: SubAttrs, plus = false): number {
  const req = plus ? def.plusReq : def.req;
  const entries = Object.entries(req) as [SubKey, number][];
  const attr = entries.length ? entries.reduce((t, [k, v]) => t + Math.min(1, (s[k] ?? 0) / v), 0) / entries.length : 1;
  const need = def.uses[plus ? 1 : 0];
  const use = need ? Math.min(1, tracked(ps, def) / need) : 1;
  return Math.round(((attr + use) / 2) * 100) / 100;
}

/** Débloque les PlayStyles dont les conditions sont remplies. Retourne les nouveautés. */
export function unlockPlayStyles(ps: PlayStyleState, s: SubAttrs, isGk: boolean, overall: number): { ps: PlayStyleState; gained: { id: PsId; plus: boolean }[] } {
  const owned = [...ps.owned];
  const plus = [...ps.plus];
  const gained: { id: PsId; plus: boolean }[] = [];
  for (const def of PLAYSTYLES) {
    if (!!def.gk !== isGk) continue;
    if (!owned.includes(def.id) && meets(s, def.req) && tracked(ps, def) >= def.uses[0]) {
      owned.push(def.id); gained.push({ id: def.id, plus: false });
    }
    if (owned.includes(def.id) && !plus.includes(def.id) && plus.length < MAX_PS_PLUS && overall >= 75
      && meets(s, def.plusReq) && tracked(ps, def) >= def.uses[1]) {
      plus.push(def.id); gained.push({ id: def.id, plus: true });
    }
  }
  return { ps: { ...ps, owned, plus }, gained };
}

/** Bonus de réussite d'une option selon les PlayStyles (0, +0,05 ou +0,10, cumul plafonné à +0,15). */
export function psBonus(ps: PlayStyleState | undefined, option: OptionId): number {
  if (!ps) return 0;
  let b = 0;
  for (const id of ps.owned) if (PS_BY_ID[id]?.boosts.includes(option)) b += ps.plus.includes(id) ? 0.1 : 0.05;
  return Math.min(0.15, b);
}

/** L'option est-elle disponible (pas verrouillée par un PlayStyle manquant) ? */
export function optionAvailable(ps: PlayStyleState | undefined, option: OptionId): boolean {
  const lockers = PLAYSTYLES.filter(p => p.unlocks?.includes(option));
  if (!lockers.length) return true;
  return !!ps && lockers.some(p => ps.owned.includes(p.id));
}

export function recordSuccess(ps: PlayStyleState, option: OptionId, n = 1): PlayStyleState {
  return { ...ps, progress: { ...ps.progress, [option]: (ps.progress[option] ?? 0) + n } };
}

/**
 * PlayStyles d'un joueur du monde d'après son profil (vrais joueurs ou inventés) :
 * ceux dont il dépasse les seuils ; PS+ si les seuils + sont atteints (3 max).
 */
export function playStylesFor(s: SubAttrs, isGk: boolean, overall: number): PlayStyleState {
  const owned: PsId[] = [];
  const plus: PsId[] = [];
  for (const def of PLAYSTYLES) {
    if (!!def.gk !== isGk) continue;
    if (meets(s, def.req)) owned.push(def.id);
    if (meets(s, def.plusReq) && overall >= 80 && plus.length < MAX_PS_PLUS) plus.push(def.id);
  }
  return { owned, plus, progress: {} };
}

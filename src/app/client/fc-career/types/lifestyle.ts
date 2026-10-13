/**
 * FC CAREER — Étape 10 : Économie, Marques & Vie Privée
 * Marques fictives, endorsements, style de vie, événements de vie.
 */

/* ------------------------------------------------------------------ */
/* 10.1 — Échelle des salaires (référence)                             */
/* ------------------------------------------------------------------ */

export const SALARY_SCALE: { label: string; range: [number, number] }[] = [
  { label: "Académie", range: [50, 200] },
  { label: "Stagiaire", range: [500, 2_000] },
  { label: "D4 Albion", range: [1_000, 3_000] },
  { label: "D3", range: [2_000, 8_000] },
  { label: "D2", range: [5_000, 20_000] },
  { label: "D1 petit club", range: [10_000, 50_000] },
  { label: "D1 gros club", range: [50_000, 200_000] },
  { label: "Star mondiale", range: [200_000, 500_000] },
];

/* ------------------------------------------------------------------ */
/* 10.2 — Marques fictives                                             */
/* ------------------------------------------------------------------ */

export type BrandCategory = "shoes" | "lifestyle";

export type ShoeBrandId = "velox" | "ironwall" | "phantom" | "strike-force" | "classic";
export type LifestyleBrandId = "kronos" | "thunder-motors" | "boost-energy" | "nexus-gaming" | "eleganza";
export type BrandId = ShoeBrandId | LifestyleBrandId;

export interface BrandDef {
  id: BrandId;
  name: string;
  emoji: string;
  slogan: string;
  category: BrandCategory;
  /** Condition d'éligibilité (attributs minimum ou rating) */
  requirement: BrandRequirement;
  /** Fourchette de paiement mensuel [min, max] en € */
  payRange: [number, number];
}

export type BrandRequirement =
  | { type: "attribute"; attrs: { id: string; min: number }[] }
  | { type: "rating"; min: number }
  | { type: "rating-and-image"; ratingMin: number; imageMin: number }
  | { type: "age-and-popularity"; maxAge: number }
  | { type: "division"; minDivision: number }
  | { type: "none" };

export const SHOE_BRANDS: BrandDef[] = [
  {
    id: "velox", name: "VELOX", emoji: "👟", slogan: "Faster Than Light",
    category: "shoes",
    requirement: { type: "attribute", attrs: [{ id: "pace", min: 85 }] },
    payRange: [5_000, 50_000],
  },
  {
    id: "ironwall", name: "IRONWALL", emoji: "👟", slogan: "Unbreakable",
    category: "shoes",
    requirement: { type: "attribute", attrs: [{ id: "tackle", min: 80 }, { id: "strength", min: 80 }] },
    payRange: [3_000, 30_000],
  },
  {
    id: "phantom", name: "PHANTOM", emoji: "👟", slogan: "Touch of Genius",
    category: "shoes",
    requirement: { type: "attribute", attrs: [{ id: "dribble", min: 80 }, { id: "firstTouch", min: 80 }] },
    payRange: [5_000, 60_000],
  },
  {
    id: "strike-force", name: "STRIKE FORCE", emoji: "👟", slogan: "Born to Score",
    category: "shoes",
    requirement: { type: "attribute", attrs: [{ id: "finishing", min: 80 }, { id: "shotPower", min: 80 }] },
    payRange: [5_000, 50_000],
  },
  {
    id: "classic", name: "CLASSIC", emoji: "👟", slogan: "Play Your Way",
    category: "shoes",
    requirement: { type: "none" },
    payRange: [500, 5_000],
  },
];

export const LIFESTYLE_BRANDS: BrandDef[] = [
  {
    id: "kronos", name: "KRONOS", emoji: "⌚", slogan: "Time Is Luxury",
    category: "lifestyle",
    requirement: { type: "rating-and-image", ratingMin: 85, imageMin: 70 },
    payRange: [10_000, 80_000],
  },
  {
    id: "thunder-motors", name: "THUNDER MOTORS", emoji: "🚗", slogan: "Drive the Dream",
    category: "lifestyle",
    requirement: { type: "rating", min: 80 },
    payRange: [8_000, 60_000],
  },
  {
    id: "boost-energy", name: "BOOST ENERGY", emoji: "🥤", slogan: "Fuel Your Game",
    category: "lifestyle",
    requirement: { type: "division", minDivision: 1 },
    payRange: [3_000, 25_000],
  },
  {
    id: "nexus-gaming", name: "NEXUS GAMING", emoji: "🎮", slogan: "Play Beyond",
    category: "lifestyle",
    requirement: { type: "age-and-popularity", maxAge: 25 },
    payRange: [2_000, 20_000],
  },
  {
    id: "eleganza", name: "ELEGANZA", emoji: "👔", slogan: "Style Is Power",
    category: "lifestyle",
    requirement: { type: "rating-and-image", ratingMin: 75, imageMin: 80 },
    payRange: [5_000, 40_000],
  },
];

export const ALL_BRANDS: BrandDef[] = [...SHOE_BRANDS, ...LIFESTYLE_BRANDS];

export type EndorsementLevel = "ambassador" | "main-ambassador" | "signature-line";

export interface Endorsement {
  brandId: BrandId;
  level: EndorsementLevel;
  monthlyPay: number;
  signedOnDay: number;
  /** Durée restante en saisons */
  seasonsLeft: number;
}

/* ------------------------------------------------------------------ */
/* 10.3 — Style de vie                                                 */
/* ------------------------------------------------------------------ */

export type LifestyleId = "simple" | "comfortable" | "extravagant";
export type CarChoiceId = "none" | "normal" | "sport" | "luxury";

export interface LifestyleDef {
  id: LifestyleId;
  emoji: string;
  label: string;
  monthlyCostRange: [number, number];
  imageEffect: number; // delta sur l'image publique
  sponsorLoyalty: number; // multiplicateur fidélité sponsors (1 = neutre)
}

export const LIFESTYLES: LifestyleDef[] = [
  { id: "simple", emoji: "🏠", label: "Style Simple", monthlyCostRange: [0, 0], imageEffect: 5, sponsorLoyalty: 1.1 },
  { id: "comfortable", emoji: "🏡", label: "Style Confortable", monthlyCostRange: [2_000, 5_000], imageEffect: 0, sponsorLoyalty: 1.0 },
  { id: "extravagant", emoji: "🏰", label: "Style Extravagant", monthlyCostRange: [10_000, 30_000], imageEffect: -5, sponsorLoyalty: 0.8 },
];

export interface CarDef {
  id: CarChoiceId;
  emoji: string;
  label: string;
  monthlyCost: number;
  imageEffect: number;
}

export const CAR_CHOICES: CarDef[] = [
  { id: "none", emoji: "🚶", label: "Pas de voiture", monthlyCost: 0, imageEffect: 0 },
  { id: "normal", emoji: "🚗", label: "Voiture normale", monthlyCost: 500, imageEffect: 0 },
  { id: "sport", emoji: "🏎️", label: "Voiture sport", monthlyCost: 3_000, imageEffect: 5 },
  { id: "luxury", emoji: "🚘", label: "Voiture de luxe", monthlyCost: 8_000, imageEffect: 10 },
];

export interface LifestyleState {
  lifestyle: LifestyleId;
  car: CarChoiceId;
  /** % du salaire donné à des œuvres caritatives (0-5) */
  charityPct: number;
  /** % du salaire investi (0-20) */
  investmentPct: number;
  /** Revenus passifs cumulés (pour la retraite) */
  investmentTotal: number;
  /** Image publique (0-100) */
  publicImage: number;
}

/* ------------------------------------------------------------------ */
/* Événements de vie                                                   */
/* ------------------------------------------------------------------ */

export type LifeEventType =
  | "child-born"
  | "marriage"
  | "scandal"
  | "family-problem"
  | "tv-interview"
  | "gala";

export interface LifeEventDef {
  type: LifeEventType;
  emoji: string;
  label: string;
  moraleDelta: number;
  imageDelta: number;
  /** Cet événement offre des choix ? */
  hasChoices: boolean;
}

export const LIFE_EVENTS: LifeEventDef[] = [
  { type: "child-born", emoji: "👶", label: "Naissance d'un enfant", moraleDelta: 20, imageDelta: 10, hasChoices: false },
  { type: "marriage", emoji: "💍", label: "Mariage", moraleDelta: 15, imageDelta: 5, hasChoices: false },
  { type: "scandal", emoji: "📸", label: "Scandale médiatique", moraleDelta: -10, imageDelta: -20, hasChoices: false },
  { type: "family-problem", emoji: "💔", label: "Problème familial", moraleDelta: -15, imageDelta: 0, hasChoices: false },
  { type: "tv-interview", emoji: "📺", label: "Interview TV", moraleDelta: 0, imageDelta: 0, hasChoices: true },
  { type: "gala", emoji: "🎉", label: "Gala caritatif", moraleDelta: 0, imageDelta: 0, hasChoices: true },
];

export interface LifeEventChoice {
  id: string;
  label: string;
  emoji: string;
  moraleDelta: number;
  imageDelta: number;
}

export interface LifeEventOccurrence {
  id: string;
  type: LifeEventType;
  dayNumber: number;
  choiceMade?: string;
}

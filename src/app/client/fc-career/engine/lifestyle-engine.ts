/**
 * FC CAREER — Étape 10 : Moteur Économie, Marques & Vie Privée
 */

import type { Player } from "../types/player";
import type { Club } from "../types/club";
import type {
  BrandDef,
  BrandId,
  Endorsement,
  EndorsementLevel,
  LifestyleState,
  LifeEventType,
  LifeEventOccurrence,
  LifeEventChoice,
  LifestyleId,
  CarChoiceId,
} from "../types/lifestyle";
import { ALL_BRANDS, LIFESTYLES, CAR_CHOICES, LIFE_EVENTS } from "../types/lifestyle";
import { getClub } from "../constants/clubs";
import { createRng } from "./player-generator";

/* ------------------------------------------------------------------ */
/* Lifestyle state                                                     */
/* ------------------------------------------------------------------ */

export function createLifestyleState(): LifestyleState {
  return {
    lifestyle: "simple",
    car: "none",
    charityPct: 0,
    investmentPct: 0,
    investmentTotal: 0,
    publicImage: 50,
  };
}

export function setLifestyle(state: LifestyleState, lifestyle: LifestyleId): LifestyleState {
  const def = LIFESTYLES.find((l) => l.id === lifestyle)!;
  return { ...state, lifestyle, publicImage: clamp(state.publicImage + def.imageEffect, 0, 100) };
}

export function setCar(state: LifestyleState, car: CarChoiceId): LifestyleState {
  const def = CAR_CHOICES.find((c) => c.id === car)!;
  return { ...state, car, publicImage: clamp(state.publicImage + def.imageEffect, 0, 100) };
}

export function setCharity(state: LifestyleState, pct: number): LifestyleState {
  const p = clamp(pct, 0, 5);
  const imageDelta = p > 0 ? p * 2 : 0;
  return { ...state, charityPct: p, publicImage: clamp(state.publicImage + imageDelta, 0, 100) };
}

export function setInvestment(state: LifestyleState, pct: number): LifestyleState {
  return { ...state, investmentPct: clamp(pct, 0, 20) };
}

/* ------------------------------------------------------------------ */
/* Monthly costs                                                       */
/* ------------------------------------------------------------------ */

export function monthlyLifestyleCost(state: LifestyleState, salary: number): number {
  const lsDef = LIFESTYLES.find((l) => l.id === state.lifestyle)!;
  const carDef = CAR_CHOICES.find((c) => c.id === state.car)!;

  const lsCost = (lsDef.monthlyCostRange[0] + lsDef.monthlyCostRange[1]) / 2;
  const charity = Math.round(salary * state.charityPct / 100);
  const investment = Math.round(salary * state.investmentPct / 100);

  return Math.round(lsCost + carDef.monthlyCost + charity + investment);
}

/** Process monthly investments. */
export function processMonthlyInvestment(state: LifestyleState, salary: number): LifestyleState {
  const invested = Math.round(salary * state.investmentPct / 100);
  return { ...state, investmentTotal: state.investmentTotal + invested };
}

/* ------------------------------------------------------------------ */
/* Brand eligibility                                                   */
/* ------------------------------------------------------------------ */

function divisionTier(division: string): number {
  const map: Record<string, number> = {
    "elite-gallia": 1, "premier-albion": 1, "primera-castilla": 1, "bundesliga": 1, "serie-a-azzurria": 1,
    "gallia-seconde": 2, "albion-championship": 2, "segunda-castilla": 2, "zweite-germania": 2, "serie-b-azzurria": 2,
    "national-gallia": 3, "albion-league-one": 3, "albion-league-two": 4,
  };
  return map[division] ?? 4;
}

export function isBrandEligible(
  brand: BrandDef,
  player: Player,
  imagePublic: number,
): boolean {
  const req = brand.requirement;
  switch (req.type) {
    case "none":
      return true;
    case "attribute":
      return req.attrs.every((a) => (player.attributes[a.id] ?? 0) >= a.min);
    case "rating":
      return player.overall >= req.min;
    case "rating-and-image":
      return player.overall >= req.ratingMin && imagePublic >= req.imageMin;
    case "age-and-popularity":
      return player.age <= req.maxAge && imagePublic >= 50;
    case "division": {
      const club = getClub(player.contract.clubId);
      return club ? divisionTier(club.division) <= req.minDivision : false;
    }
  }
}

/** Returns all brands the player can sign with. */
export function getEligibleBrands(player: Player, imagePublic: number): BrandDef[] {
  return ALL_BRANDS.filter((b) => isBrandEligible(b, player, imagePublic));
}

/** Calculate monthly payout for a brand based on player level. */
export function brandPayout(brand: BrandDef, player: Player, level: EndorsementLevel): number {
  const [min, max] = brand.payRange;
  const ratio = Math.min(1, (player.overall - 50) / 45);
  const base = min + (max - min) * ratio;
  const multiplier = level === "signature-line" ? 2.5 : level === "main-ambassador" ? 1.5 : 1.0;
  return Math.round(base * multiplier);
}

/** Determine endorsement level based on overall. */
export function endorsementLevel(overall: number): EndorsementLevel {
  if (overall >= 90) return "signature-line";
  if (overall >= 80) return "main-ambassador";
  return "ambassador";
}

/** Sign an endorsement deal. */
export function signEndorsement(
  brand: BrandDef,
  player: Player,
  dayNumber: number,
): Endorsement {
  const level = endorsementLevel(player.overall);
  return {
    brandId: brand.id,
    level,
    monthlyPay: brandPayout(brand, player, level),
    signedOnDay: dayNumber,
    seasonsLeft: 2,
  };
}

/** Check if a brand should leave (performance drop, scandal, injury). */
export function shouldBrandLeave(
  endorsement: Endorsement,
  player: Player,
  imagePublic: number,
  overallDrop: number,
  hasScandal: boolean,
  longInjury: boolean,
): boolean {
  if (overallDrop >= 5) return true;
  if (hasScandal) return true;
  if (longInjury) return true;
  if (endorsement.seasonsLeft <= 0) return true;
  // Re-check eligibility
  const brand = ALL_BRANDS.find((b) => b.id === endorsement.brandId);
  return brand ? !isBrandEligible(brand, player, imagePublic) : true;
}

/** Tick endorsements at end of season. */
export function tickEndorsements(
  endorsements: Endorsement[],
  player: Player,
  imagePublic: number,
  overallDrop: number,
  hasScandal: boolean,
  longInjury: boolean,
): Endorsement[] {
  return endorsements
    .map((e) => ({ ...e, seasonsLeft: e.seasonsLeft - 1 }))
    .filter((e) => !shouldBrandLeave(e, player, imagePublic, overallDrop, hasScandal, longInjury));
}

/* ------------------------------------------------------------------ */
/* Life events                                                         */
/* ------------------------------------------------------------------ */

/** Generate random life events for a season (0-2 events). */
export function generateLifeEvents(
  dayNumber: number,
  playerAge: number,
  seed: number,
): LifeEventOccurrence[] {
  const rng = createRng(seed);
  const events: LifeEventOccurrence[] = [];

  // Higher chance of marriage/child for older players
  if (playerAge >= 24 && rng() < 0.08) {
    events.push({ id: `le-${dayNumber}-marriage`, type: "marriage", dayNumber });
  }
  if (playerAge >= 26 && rng() < 0.06) {
    events.push({ id: `le-${dayNumber}-child`, type: "child-born", dayNumber });
  }

  // Scandal (rare)
  if (rng() < 0.03) {
    events.push({ id: `le-${dayNumber}-scandal`, type: "scandal", dayNumber });
  }

  // Family problem
  if (rng() < 0.05) {
    events.push({ id: `le-${dayNumber}-family`, type: "family-problem", dayNumber });
  }

  // TV Interview (common)
  if (rng() < 0.25) {
    events.push({ id: `le-${dayNumber}-tv`, type: "tv-interview", dayNumber });
  }

  // Gala
  if (rng() < 0.15) {
    events.push({ id: `le-${dayNumber}-gala`, type: "gala", dayNumber });
  }

  return events;
}

/** Get choices for an event type. */
export function getLifeEventChoices(type: LifeEventType): LifeEventChoice[] {
  switch (type) {
    case "tv-interview":
      return [
        { id: "humble", label: "Rester humble", emoji: "🙏", moraleDelta: 5, imageDelta: 10 },
        { id: "arrogant", label: "Jouer la star", emoji: "😎", moraleDelta: -5, imageDelta: -10 },
        { id: "neutral", label: "Pas de commentaire", emoji: "😐", moraleDelta: 0, imageDelta: 0 },
      ];
    case "gala":
      return [
        { id: "attend", label: "Participer", emoji: "🎉", moraleDelta: 5, imageDelta: 15 },
        { id: "skip", label: "Décliner", emoji: "🏠", moraleDelta: 0, imageDelta: -5 },
      ];
    default:
      return [];
  }
}

/** Apply a life event to the lifestyle state. */
export function applyLifeEvent(
  state: LifestyleState,
  event: LifeEventOccurrence,
  choice?: LifeEventChoice,
): { state: LifestyleState; moraleDelta: number } {
  const def = LIFE_EVENTS.find((e) => e.type === event.type)!;
  let moraleDelta = def.moraleDelta;
  let imageDelta = def.imageDelta;

  if (choice) {
    moraleDelta += choice.moraleDelta;
    imageDelta += choice.imageDelta;
  }

  return {
    state: {
      ...state,
      publicImage: clamp(state.publicImage + imageDelta, 0, 100),
    },
    moraleDelta,
  };
}

/* ------------------------------------------------------------------ */
/* Utils                                                               */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

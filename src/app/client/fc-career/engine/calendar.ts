/**
 * FC CAREER — Étape 6.1 : Calendrier de saison (380 jours)
 * Structure complète : pré-saison → championnat → coupes → Europe → fin de saison.
 */

import type { CompetitionId, Country, Division } from "../types/club";
import { DIVISION_INFO, getDivisionTier } from "../types/club";

export type SeasonPhase =
  | "pre-season"      // Juillet (1-31)
  | "early-season"    // Août (32-62)
  | "mid-season"      // Sept-Déc (63-184)
  | "winter-break"    // Janvier (185-215)
  | "late-season"     // Fév-Avril (216-305)
  | "end-season"      // Mai (306-336)
  | "off-season"      // Juin (337-370)
  | "transition";     // Fin (370-380)

export interface CalendarPhase {
  phase: SeasonPhase;
  label: string;
  dayStart: number;
  dayEnd: number;
  events: string[];
}

/** Le calendrier complet de 380 jours. */
export const SEASON_CALENDAR: CalendarPhase[] = [
  {
    phase: "pre-season",
    label: "Pré-saison",
    dayStart: 1,
    dayEnd: 31,
    events: ["Reprise", "Amicaux", "Supercoupe"],
  },
  {
    phase: "early-season",
    label: "Début de saison",
    dayStart: 32,
    dayEnd: 62,
    events: ["Championnat J1-J3", "Qualifs Champions League"],
  },
  {
    phase: "mid-season",
    label: "Phase aller",
    dayStart: 63,
    dayEnd: 184,
    events: ["Championnat J4-J17", "Groupes Champions/Europa", "Coupe nationale", "Trêves internationales"],
  },
  {
    phase: "winter-break",
    label: "Trêve hivernale",
    dayStart: 185,
    dayEnd: 215,
    events: ["Championnat J18-J20", "Mercato hiver", "Coupe 16e de finale"],
  },
  {
    phase: "late-season",
    label: "Phase retour",
    dayStart: 216,
    dayEnd: 305,
    events: ["Championnat J21-J30", "8e→Demi Champions", "Coupe 8e→Demi"],
  },
  {
    phase: "end-season",
    label: "Fin de saison",
    dayStart: 306,
    dayEnd: 336,
    events: ["Championnat J31-J34", "Finales Coupe + Champions"],
  },
  {
    phase: "off-season",
    label: "Inter-saison",
    dayStart: 337,
    dayEnd: 370,
    events: ["Mercato été", "Globe d'Or", "Bilan de saison"],
  },
  {
    phase: "transition",
    label: "Transition",
    dayStart: 371,
    dayEnd: 380,
    events: ["Résumé", "Contrats", "Passage saison suivante"],
  },
];

/** Récupère la phase du calendrier pour un jour donné. */
export function getPhaseForDay(day: number): CalendarPhase {
  for (const phase of SEASON_CALENDAR) {
    if (day >= phase.dayStart && day <= phase.dayEnd) return phase;
  }
  return SEASON_CALENDAR[0];
}

/** Récupère le label court d'une phase. */
export function getPhaseLabel(day: number): string {
  return getPhaseForDay(day).label;
}

/** Est-ce une période de mercato ? */
export function isMercatoWindow(day: number): "summer" | "winter" | null {
  if (day >= 337 && day <= 370) return "summer";
  if (day >= 185 && day <= 215) return "winter";
  return null;
}

/** Est-ce une trêve internationale ? */
export function isInternationalBreak(day: number): boolean {
  // Trêves en septembre, octobre, novembre, mars
  return (
    (day >= 70 && day <= 77) ||   // Sept
    (day >= 98 && day <= 105) ||  // Oct
    (day >= 126 && day <= 133) || // Nov
    (day >= 245 && day <= 252)    // Mars
  );
}

/** Jours de la Coupe du Monde (si année paire). */
export function isWorldCupYear(seasonYear: number): boolean {
  return seasonYear % 2 === 0;
}

/** Qualifications européennes par pays (6.2). */
export interface EuroQualification {
  position: number;
  competition: CompetitionId;
  type: "groups" | "qualifiers";
}

export function getEuroQualifications(country: Country): EuroQualification[] {
  switch (country) {
    case "gallia":
      return [
        { position: 1, competition: "champions-europa", type: "groups" },
        { position: 2, competition: "champions-europa", type: "qualifiers" },
        { position: 3, competition: "coupe-europa", type: "groups" },
        // Vainqueur Coupe → Conference
      ];
    case "albion":
      return [
        { position: 1, competition: "champions-europa", type: "groups" },
        { position: 2, competition: "champions-europa", type: "groups" },
        { position: 3, competition: "champions-europa", type: "groups" },
        { position: 4, competition: "champions-europa", type: "groups" },
        { position: 5, competition: "coupe-europa", type: "groups" },
      ];
    case "castilla":
      return [
        { position: 1, competition: "champions-europa", type: "groups" },
        { position: 2, competition: "champions-europa", type: "groups" },
        { position: 3, competition: "champions-europa", type: "groups" },
        { position: 4, competition: "champions-europa", type: "groups" },
        { position: 5, competition: "coupe-europa", type: "groups" },
      ];
    case "germania":
      return [
        { position: 1, competition: "champions-europa", type: "groups" },
        { position: 2, competition: "champions-europa", type: "groups" },
        { position: 3, competition: "champions-europa", type: "groups" },
        { position: 4, competition: "champions-europa", type: "groups" },
        { position: 5, competition: "coupe-europa", type: "groups" },
      ];
    case "azzurria":
      return [
        { position: 1, competition: "champions-europa", type: "groups" },
        { position: 2, competition: "champions-europa", type: "groups" },
        { position: 3, competition: "champions-europa", type: "groups" },
        { position: 4, competition: "champions-europa", type: "groups" },
        { position: 5, competition: "coupe-europa", type: "groups" },
      ];
  }
}

/** Vérifie si un club est qualifié pour l'Europe selon sa position au classement. */
export function getEuroCompetitionForPosition(country: Country, position: number): CompetitionId | null {
  const qualifs = getEuroQualifications(country);
  const q = qualifs.find(q => q.position === position);
  return q?.competition ?? null;
}

/**
 * FC CAREER — Utilitaires de dates de jeu
 *
 * Calendrier footballistique complet : chaque semaine (1-38) d'une saison
 * est mappée vers une date réelle (jour/mois/année).
 *
 * Structure de saison (depuis août de l'année de base) :
 *   Semaines  1- 4 : Pré-saison        (août)
 *   Semaines  5-20 : Championnat P1    (août–décembre)
 *   Semaines 21-24 : Trêve / transferts (janvier)
 *   Semaines 25-34 : Championnat P2    (janvier–avril)
 *   Semaines 35-36 : Coupes / playoffs (avril–mai)
 *   Semaines 37-38 : Fin de saison     (mai)
 */

/** Base : saison 1 commence le 1er août 2025 */
const BASE_YEAR = 2025;
const BASE_MONTH = 7; // août (0-indexé)
const BASE_DAY = 1;

/** Nombre de jours entre deux dates */
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Retourne la date exacte pour une semaine et une saison données.
 * Chaque semaine = 7 jours, à partir du 1er août de l'année de la saison.
 */
export function weekToDate(week: number, season: number): Date {
  const year = BASE_YEAR + (season - 1);
  const start = new Date(year, BASE_MONTH, BASE_DAY);
  const offset = (Math.max(1, week) - 1) * 7;
  const date = new Date(start);
  date.setDate(date.getDate() + offset);
  return date;
}

/** Formate une date de jeu en chaîne lisible */
export function formatGameDate(week: number, season: number): string {
  const d = weekToDate(week, season);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Formate une date de jeu en forme courte : "15 oct. 2025" */
export function formatGameDateShort(week: number, season: number): string {
  const d = weekToDate(week, season);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** Retourne le nom du mois pour une semaine donnée */
export function weekToMonth(week: number, season?: number): string {
  if (season !== undefined) {
    const d = weekToDate(week, season);
    return d.toLocaleDateString("fr-FR", { month: "long" });
  }
  // Fallback pour la compatibilité (sans saison)
  const months = [
    "Août","Août","Septembre","Septembre","Septembre",
    "Octobre","Octobre","Octobre","Novembre","Novembre",
    "Novembre","Décembre","Décembre","Janvier","Janvier",
    "Janvier","Février","Février","Mars","Mars",
    "Mars","Avril","Avril","Avril","Mai","Mai",
    "Mai","Juin","Juin","Juin","Juillet","Juillet",
    "Juillet","Juillet","Juillet","Juillet","Juillet","Juillet",
  ];
  return months[Math.max(0, Math.min(week - 1, 37))];
}

/** Phase de la saison pour une semaine donnée */
export type SeasonPhase =
  | "preseason"
  | "season_p1"
  | "winter_break"
  | "season_p2"
  | "playoffs"
  | "season_end";

export function weekToSeasonPhase(week: number): SeasonPhase {
  if (week <= 4)  return "preseason";
  if (week <= 20) return "season_p1";
  if (week <= 24) return "winter_break";
  if (week <= 34) return "season_p2";
  if (week <= 36) return "playoffs";
  return "season_end";
}

export function seasonPhaseLabel(phase: SeasonPhase): string {
  switch (phase) {
    case "preseason":     return "Pré-saison";
    case "season_p1":    return "Championnat (1ère partie)";
    case "winter_break": return "Trêve hivernale";
    case "season_p2":    return "Championnat (2ème partie)";
    case "playoffs":     return "Coupes & Playoffs";
    case "season_end":   return "Fin de saison";
  }
}

/** Fenêtres de transferts */
export function isTransferWindow(week: number): boolean {
  return week <= 4 || (week >= 21 && week <= 24);
}

/** Étiquette lisible pour une saison : 1 → "Saison 1 (2025-26)" */
export function seasonLabel(season: number, baseYear = BASE_YEAR): string {
  const y = baseYear + season - 1;
  return `Saison ${season} (${y}–${String(y + 1).slice(2)})`;
}

/** Calcule l'âge du joueur en fonction de la saison actuelle */
export function playerAge(birthAge: number, currentSeason: number, careerStartSeason = 1): number {
  return birthAge + (currentSeason - careerStartSeason);
}

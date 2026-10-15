/**
 * FC CAREER 27 — Calendrier réel (monde CP).
 *
 * Une année sportive va du 1er juillet au 30 juin : 52 semaines.
 * - Semaines 1-6 : intersaison et préparation (juillet → mi-août).
 * - Semaines 7-47 : championnats (mi-août → fin mai), trêves FIFA en
 *   septembre, octobre, novembre et mars ; trêve hivernale selon le pays.
 * - Semaines 48-52 : fin de saison, fenêtre internationale de juin.
 * Mercato d'été : semaines 1-9 (1er juillet → 1er septembre).
 * Mercato d'hiver : semaines 27-31 (janvier).
 * La saison (2026-27) se termine avant l'année civile : les dates restent continues.
 */

export const SEASON_WEEKS = 52;
export const LEAGUE_FIRST_WEEK = 7;
export const LEAGUE_LAST_WEEK = 47;
/** Trêves FIFA : début septembre, mi-octobre, mi-novembre, fin mars. */
export const FIFA_WEEKS = [10, 15, 20, 37];
/** Fenêtre internationale de juin (hors saison). */
export const JUNE_WINDOW = [49, 50];
export const SUMMER_WINDOW: [number, number] = [1, 9];
export const WINTER_WINDOW: [number, number] = [27, 31];
const WINTER_BREAK: Record<string, number[]> = { ger: [25, 26, 27], fra: [26, 27], ita: [27], esp: [27], eng: [] };

const DAY = 86_400_000;

/** Premier lundi à partir du 1er juillet de l'année. */
export function seasonStart(year: number): Date {
  const d = new Date(Date.UTC(year, 6, 1));
  const dow = d.getUTCDay(); // 0 = dimanche
  const shift = (8 - dow) % 7;
  return new Date(d.getTime() + shift * DAY);
}

/** Lundi de la semaine `week` (1-52) de l'année sportive commençant en `year`. */
export function weekStart(year: number, week: number): Date {
  return new Date(seasonStart(year).getTime() + (week - 1) * 7 * DAY);
}

/** Jour du match : samedi, ou mercredi pour une journée en semaine. */
export function matchDate(year: number, week: number, midweek = false): Date {
  return new Date(weekStart(year, week).getTime() + (midweek ? 2 : 5) * DAY);
}

export const seasonLabel = (year: number) => `${year}-${String((year + 1) % 100).padStart(2, "0")}`;

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const DAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
export function formatDate(d: Date, withDay = true): string {
  return `${withDay ? `${DAYS[d.getUTCDay()]} ` : ""}${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Jour de l'année (1-366) d'une date. */
export function dayOfYear(d: Date): number {
  return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY) + 1;
}

/** Les jours de l'année (1-366) couverts par une semaine — pour les anniversaires. */
export function weekDays(year: number, week: number): number[] {
  const start = weekStart(year, week).getTime();
  return Array.from({ length: 7 }, (_, i) => dayOfYear(new Date(start + i * DAY)));
}

export type WindowKind = "summer" | "winter" | null;
export function transferWindow(week: number): WindowKind {
  if (week >= SUMMER_WINDOW[0] && week <= SUMMER_WINDOW[1]) return "summer";
  if (week >= WINTER_WINDOW[0] && week <= WINTER_WINDOW[1]) return "winter";
  return null;
}

export const isInternationalBreak = (week: number) => FIFA_WEEKS.includes(week) || JUNE_WINDOW.includes(week);

/**
 * Semaine de chaque journée d'un championnat. Les premières divisions
 * s'arrêtent pendant les trêves FIFA et la trêve hivernale de leur pays ;
 * les deuxièmes divisions jouent aussi pendant les trêves. S'il y a plus de
 * journées que de week-ends, certaines semaines comptent une journée en
 * semaine (mercredi).
 */
export function buildLeagueWeeks(totalMatchdays: number, tier: number, countryId: string): number[] {
  const pause = new Set([...(tier === 1 ? FIFA_WEEKS : []), ...(WINTER_BREAK[countryId] ?? [])]);
  const weeks: number[] = [];
  for (let w = LEAGUE_FIRST_WEEK; w <= LEAGUE_LAST_WEEK; w++) if (!pause.has(w)) weeks.push(w);
  if (totalMatchdays <= weeks.length) {
    // Répartition régulière : on garde `totalMatchdays` semaines réparties sur toute la saison
    const out: number[] = [];
    for (let i = 0; i < totalMatchdays; i++) {
      out.push(weeks[Math.round((i * (weeks.length - 1)) / Math.max(1, totalMatchdays - 1))]);
    }
    return out;
  }
  // Plus de journées que de semaines : journées doublées (samedi + mercredi) réparties régulièrement
  const extra = totalMatchdays - weeks.length;
  const doubled = new Set<number>();
  for (let i = 0; i < extra; i++) doubled.add(weeks[Math.min(weeks.length - 1, Math.round(((i + 0.5) * weeks.length) / extra))]);
  for (let k = 0; doubled.size < Math.min(extra, weeks.length); k++) doubled.add(weeks[(k * 7 + 3) % weeks.length]);
  const out: number[] = [];
  for (const w of weeks) {
    out.push(w);
    if (doubled.has(w)) out.push(w);
  }
  return out.slice(0, totalMatchdays);
}

/** La journée `md` (1-based) se joue-t-elle en semaine (deuxième match de la semaine) ? */
export function isMidweek(weekOf: number[], md: number): boolean {
  return md >= 2 && weekOf[md - 1] === weekOf[md - 2];
}

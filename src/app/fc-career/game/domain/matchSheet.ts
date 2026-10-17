/**
 * FC CAREER 27 — Feuilles de match : compositions, buteurs et passeurs avec la
 * minute, statistiques des deux équipes. Gardées pour la semaine en cours et
 * la précédente (affichage des résultats de la semaine).
 */

export interface SheetSide { xi: string[]; subs: string[]; shots: number; onTarget: number; possession: number }
export interface SheetGoal { minute: number; side: "home" | "away"; playerId?: string; assistId?: string }

export interface MatchSheet {
  id: string;
  /** Index absolu de la semaine (saison × 100 + semaine) */
  weekIdx: number;
  /** Ligue ou compétition (cup-eng, ucl, euro…) */
  compId: string;
  stage?: string;
  /** Match de semaine (mardi/mercredi) ou de week-end */
  day: "mid" | "weekend";
  homeClubId: string;
  awayClubId: string;
  hs: number;
  as: number;
  pens?: [number, number];
  home: SheetSide;
  away: SheetSide;
  goals: SheetGoal[];
  /** Notes des joueurs quand elles sont connues (match du joueur) */
  ratings?: Record<string, number>;
}

/** Garde la semaine `weekIdx` et la précédente. */
export function pruneSheets(sheets: MatchSheet[] | undefined, weekIdx: number): MatchSheet[] {
  const prev = weekIdx % 100 === 1 ? (Math.floor(weekIdx / 100) - 1) * 100 + 52 : weekIdx - 1;
  return (sheets ?? []).filter(s => s.weekIdx >= prev);
}

/** Feuille d'un match joué avec le moteur détaillé (match du joueur ou du manager). */
export function sheetFromLive(
  done: { home: { clubId: string; appeared: string[] }; away: { clubId: string; appeared: string[] } },
  report: {
    fixtureId: string; homeClubId: string; awayClubId: string; ratings: Record<string, number>;
    home: { goals: number; shots: number; shotsOnTarget: number; possession: number };
    away: { goals: number; shots: number; shotsOnTarget: number; possession: number };
    events: { type: string; minute: number; side: "home" | "away"; playerId?: string; assistId?: string }[];
  },
  compId: string,
): Omit<MatchSheet, "weekIdx" | "day"> {
  const side = (t: { appeared: string[] }, st: { shots: number; shotsOnTarget: number; possession: number }): SheetSide =>
    ({ xi: t.appeared.slice(0, 11), subs: t.appeared.slice(11), shots: st.shots, onTarget: st.shotsOnTarget, possession: st.possession });
  return {
    id: report.fixtureId, compId, homeClubId: report.homeClubId, awayClubId: report.awayClubId,
    hs: report.home.goals, as: report.away.goals,
    home: side(done.home, report.home), away: side(done.away, report.away),
    goals: report.events.filter(e => e.type === "goal").map(e => ({ minute: e.minute, side: e.side, playerId: e.playerId, assistId: e.assistId })),
    ratings: report.ratings,
  };
}

/**
 * FC CAREER — Retraite, Vie Après, Héritage & Journal
 * (Merged from retirement.ts + journal.ts)
 */

/* ================================================================== */
/* Étape 19 : Retraite, Vie Après & Héritage                           */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/* 19.1 — Retraite                                                     */
/* ------------------------------------------------------------------ */

export type RetirementReason = "voluntary" | "forced-injury" | "forced-rating" | "forced-age" | "broken";

export interface RetirementInfo {
  reason: RetirementReason;
  age: number;
  day: number;
  seasonYear: number;
  farewellMatch: boolean;
}

/* ------------------------------------------------------------------ */
/* 19.2 — Score d'Héritage                                             */
/* ------------------------------------------------------------------ */

export interface LegacyScoreBreakdown {
  trophies: number;      // max 35
  stats: number;         // max 25
  awards: number;        // max 25
  career: number;        // max 15
  total: number;         // 0-100
}

/* ------------------------------------------------------------------ */
/* 19.3 — Les 6 Fins                                                   */
/* ------------------------------------------------------------------ */

export type EndingTier =
  | "living-legend"   // 90-100
  | "icon"            // 75-89
  | "solid"           // 60-74
  | "average"         // 40-59
  | "wasted"          // 20-39
  | "broken";         // 0-19

export interface Ending {
  tier: EndingTier;
  emoji: string;
  title: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/* 19.4 — Vie Après                                                    */
/* ------------------------------------------------------------------ */

export type PostCareerRole = "tv-consultant" | "coach" | "sporting-director" | "peaceful-retirement" | "bankruptcy";

export interface PostCareerOption {
  role: PostCareerRole;
  label: string;
  emoji: string;
  description: string;
  minScore: number;
  minLeadership: number;
}

export interface PostCareerState {
  role: PostCareerRole;
  popularity: number;   // for consultant
  teamManaged: string;  // for coach/director
  wealth: number;       // remaining
}

/* ------------------------------------------------------------------ */
/* 19.5 — Héritage Cross-Carrière                                      */
/* ------------------------------------------------------------------ */

export interface LegacyPlayer {
  name: string;
  position: string;
  clubs: string[];
  goals: number;
  assists: number;
  caps: number;
  trophies: number;
  legacyScore: number;
  endingTier: EndingTier;
  hasStatue: boolean;
  postCareerRole: PostCareerRole | null;
}

/* ------------------------------------------------------------------ */
/* Retirement State                                                    */
/* ------------------------------------------------------------------ */

export interface RetirementState {
  retired: boolean;
  retirementInfo: RetirementInfo | null;
  legacyScore: LegacyScoreBreakdown | null;
  ending: Ending | null;
  postCareer: PostCareerState | null;
  legacyPlayers: LegacyPlayer[];
}

/* ================================================================== */
/* Étape 18 : Journal de Carrière & Autobiographie                     */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/* 18.1 — Journal Automatique                                          */
/* ------------------------------------------------------------------ */

export type JournalEventType =
  | "first-match"
  | "first-goal"
  | "first-assist"
  | "first-title"
  | "first-callup"
  | "transfer"
  | "severe-injury"
  | "injury-return"
  | "rivalry"
  | "individual-award"
  | "key-moment"
  | "season-summary"
  | "academy-start"
  | "captain-appointed"
  | "retirement";

export interface JournalEntry {
  id: string;
  type: JournalEventType;
  day: number;
  seasonYear: number;
  title: string;
  narrative: string;
  emoji: string;
  playerAge: number;
}

/* ------------------------------------------------------------------ */
/* 18.2 — Autobiographie                                               */
/* ------------------------------------------------------------------ */

export interface AutobiographyChapter {
  id: string;
  number: number;
  title: string;
  content: string;
  seasonRange: string; // e.g. "Saison 1-2"
}

export interface Autobiography {
  title: string;
  playerName: string;
  chapters: AutobiographyChapter[];
  generatedAt: string; // ISO
}

/* ------------------------------------------------------------------ */
/* Journal State                                                       */
/* ------------------------------------------------------------------ */

export interface JournalState {
  entries: JournalEntry[];
  autobiography: Autobiography | null;
}

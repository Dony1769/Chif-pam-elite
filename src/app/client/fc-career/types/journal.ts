/**
 * FC CAREER — Étape 18 : Journal de Carrière & Autobiographie
 */

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
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface JournalState {
  entries: JournalEntry[];
  autobiography: Autobiography | null;
}

/**
 * FC CAREER — Étape 15 : Engine Monde Vivant & Adaptation Culturelle
 */

import type {
  WorldState,
  WorldPlayer,
  NewsItem,
  CoachChange,
  ClubMovement,
  CulturalAdaptation,
  AdaptationPhase,
  CulturalPenalties,
} from "../types/adaptation";
import type { Country } from "../types/club";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const FIRST_NAMES = [
  "Marcos", "Luca", "Adrien", "Youssef", "Kenji", "Tobias", "Enzo", "Nabil",
  "Oscar", "Felipe", "Hugo", "Matteo", "Samuel", "Victor", "Ibrahim", "Dani",
  "Rafa", "Sandro", "Carlos", "Antonio", "Leo", "Maxime", "Bruno", "Axel",
];

const LAST_NAMES = [
  "Silva", "Müller", "Martin", "García", "Rossi", "Fernandez", "Schmidt",
  "López", "Bernard", "Santos", "Weber", "Moreau", "Torres", "Fischer",
  "Dupont", "Hernández", "Bianchi", "Ribeiro", "Sato", "Jensen",
  "Kone", "Diallo", "Ndiaye", "Mbemba",
];

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

const COACH_NAMES = [
  "Roberto Di Matteo", "Hans Keller", "Pierre Gasset", "José Alvarez",
  "Thomas Hartmann", "Marco Bielsa", "Didier Ramos", "Antonio Conte Jr.",
  "Patrick Vieira Jr.", "Zinedine Blanc",
];

const COUNTRIES: Country[] = ["gallia", "albion", "castilla", "germania", "azzurria"];

/* ------------------------------------------------------------------ */
/* World State                                                         */
/* ------------------------------------------------------------------ */

export function createWorldState(): WorldState {
  return {
    players: generateWorldPlayers(30),
    news: [],
    coachChanges: [],
    movements: [],
    adaptation: null,
    lastSimDay: 0,
  };
}

function randomName(): string {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
}

function generateWorldPlayers(count: number): WorldPlayer[] {
  const players: WorldPlayer[] = [];
  for (let i = 0; i < count; i++) {
    const age = 18 + Math.floor(Math.random() * 18);
    const baseOvr = age <= 22 ? 65 + Math.floor(Math.random() * 15) : 72 + Math.floor(Math.random() * 18);
    players.push({
      id: `wp-${i}`,
      name: randomName(),
      clubId: `club-${Math.floor(Math.random() * 20)}`,
      country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
      position: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
      age,
      overall: baseOvr,
      goals: 0,
      assists: 0,
      marketValue: baseOvr * 100_000,
      injured: false,
      injuryWeeks: 0,
    });
  }
  return players;
}

/* ------------------------------------------------------------------ */
/* World Simulation                                                    */
/* ------------------------------------------------------------------ */

let newsCounter = 0;

function makeNews(day: number, emoji: string, headline: string, category: NewsItem["category"]): NewsItem {
  newsCounter++;
  return { id: `news-${day}-${newsCounter}`, day, emoji, headline, category };
}

/** Simulate one day of world events. Returns updated state + new news. */
export function simulateWorldDay(state: WorldState, day: number): WorldState {
  if (day <= state.lastSimDay) return state;

  const updatedPlayers = [...state.players];
  const newNews: NewsItem[] = [];

  for (let i = 0; i < updatedPlayers.length; i++) {
    const p = { ...updatedPlayers[i] };

    // Age progression (every ~365 days)
    if (day % 365 === 0) {
      p.age += 1;
    }

    // Progression / decline
    if (Math.random() < 0.02) {
      if (p.age <= 24) {
        const gain = 1 + Math.floor(Math.random() * 2);
        p.overall = Math.min(99, p.overall + gain);
        if (gain >= 2) {
          newNews.push(makeNews(day, "📈", `${p.name} (${p.overall}) explose ! Progression fulgurante.`, "record"));
        }
      } else if (p.age >= 32) {
        p.overall = Math.max(50, p.overall - (1 + Math.floor(Math.random() * 2)));
        newNews.push(makeNews(day, "📉", `${p.name} en déclin (${p.overall}). L'âge rattrape tout le monde.`, "record"));
      }
    }

    // Injuries (2% chance per sim)
    if (!p.injured && Math.random() < 0.02) {
      const weeks = 1 + Math.floor(Math.random() * 12);
      p.injured = true;
      p.injuryWeeks = weeks;
      if (weeks >= 8) {
        newNews.push(makeNews(day, "⚡", `Blessure : ${p.name} out ${weeks} semaines !`, "injury"));
      }
    }

    // Injury recovery
    if (p.injured) {
      p.injuryWeeks = Math.max(0, p.injuryWeeks - 1);
      if (p.injuryWeeks === 0) p.injured = false;
    }

    // Goals/assists accumulation (attackers score more)
    if (!p.injured && Math.random() < 0.15) {
      const isAttacker = ["ST", "LW", "RW", "CAM"].includes(p.position);
      if (isAttacker) {
        p.goals += Math.random() < 0.6 ? 1 : 0;
        p.assists += Math.random() < 0.3 ? 1 : 0;
      } else {
        p.goals += Math.random() < 0.1 ? 1 : 0;
        p.assists += Math.random() < 0.2 ? 1 : 0;
      }
    }

    // Transfers (1% chance)
    if (Math.random() < 0.01) {
      const oldClub = p.clubId;
      p.clubId = `club-${Math.floor(Math.random() * 20)}`;
      p.marketValue = p.overall * (80_000 + Math.floor(Math.random() * 120_000));
      const fee = Math.round(p.marketValue / 1_000_000);
      newNews.push(makeNews(day, "🔥", `TRANSFERT : ${p.name} (${p.overall}) change de club pour ${fee}M€`, "transfer"));
    }

    updatedPlayers[i] = p;
  }

  // Coach changes (low probability)
  const newCoachChanges = [...state.coachChanges];
  if (Math.random() < 0.03) {
    const clubId = `club-${Math.floor(Math.random() * 20)}`;
    const newCoach = COACH_NAMES[Math.floor(Math.random() * COACH_NAMES.length)];
    newCoachChanges.push({ clubId, oldCoach: "Ancien coach", newCoach, day });
    newNews.push(makeNews(day, "🔄", `${newCoach} nommé nouvel entraîneur !`, "coach"));
  }

  // Club movements (end of season only, day ~350)
  const newMovements = [...state.movements];
  if (day % 365 >= 348 && day % 365 <= 352 && Math.random() < 0.3) {
    const relegated = randomName().split(" ")[1] + " FC";
    newMovements.push({ clubId: `club-rel-${day}`, clubName: relegated, type: "relegated", fromDivision: "Élite", toDivision: "Seconde" });
    newNews.push(makeNews(day, "📉", `Relégation : ${relegated} descend en division inférieure`, "relegation"));
  }

  // Youth breakthrough
  if (Math.random() < 0.01) {
    const youthName = randomName();
    newNews.push(makeNews(day, "🌟", `Pépite : ${youthName} (17 ans) fait ses débuts professionnels !`, "youth"));
  }

  return {
    ...state,
    players: updatedPlayers,
    news: [...state.news, ...newNews].slice(-50), // keep last 50
    coachChanges: newCoachChanges,
    movements: newMovements,
    lastSimDay: day,
  };
}

/** Advance the world by multiple days at once. */
export function advanceWorld(state: WorldState, fromDay: number, toDay: number): WorldState {
  let current = state;
  // Simulate in weekly steps to avoid perf issues
  for (let d = Math.max(fromDay, state.lastSimDay + 1); d <= toDay; d += 7) {
    current = simulateWorldDay(current, d);
  }
  return current;
}

/* ------------------------------------------------------------------ */
/* Cultural Adaptation                                                 */
/* ------------------------------------------------------------------ */

export function startAdaptation(
  country: Country,
  startDay: number,
  previousCountries: Country[],
  hasCompatriot: boolean,
): CulturalAdaptation {
  return {
    country,
    startDay,
    phase: "shock",
    languageBarrier: 100,
    lessonsCompleted: 0,
    hasCompatriot,
    countriesLived: [...previousCountries, country],
  };
}

/** Determine the current adaptation phase based on elapsed days. */
export function getAdaptationPhase(adaptation: CulturalAdaptation, currentDay: number): AdaptationPhase {
  const elapsed = currentDay - adaptation.startDay;
  const speedMultiplier = adaptation.hasCompatriot ? 2 : 1;
  const effectiveDays = elapsed * speedMultiplier;

  if (effectiveDays >= 150) return "integrated"; // ~5 months
  if (effectiveDays >= 60) return "adapting";     // ~2 months
  return "shock";
}

/** Update adaptation state for a new day. */
export function tickAdaptation(adaptation: CulturalAdaptation, currentDay: number): CulturalAdaptation {
  const phase = getAdaptationPhase(adaptation, currentDay);

  // Natural language learning (slow)
  const dailyReduction = adaptation.hasCompatriot ? 0.8 : 0.4;
  const newBarrier = Math.max(0, adaptation.languageBarrier - dailyReduction);

  return { ...adaptation, phase, languageBarrier: newBarrier };
}

/** Take a language lesson → reduce barrier by 5%. */
export function takeLanguageLesson(adaptation: CulturalAdaptation): CulturalAdaptation {
  return {
    ...adaptation,
    languageBarrier: Math.max(0, adaptation.languageBarrier - 5),
    lessonsCompleted: adaptation.lessonsCompleted + 1,
  };
}

/** Get the penalties applied by cultural adaptation. */
export function getAdaptationPenalties(adaptation: CulturalAdaptation | null, currentDay: number): CulturalPenalties {
  const none: CulturalPenalties = { communicationPenalty: 0, tacticalPenalty: 0, moraleDelta: 0, pressureDelta: 0, fatigueDelta: 0 };
  if (!adaptation) return none;

  const phase = getAdaptationPhase(adaptation, currentDay);
  const barrier = adaptation.languageBarrier / 100; // 0-1

  switch (phase) {
    case "shock":
      return {
        communicationPenalty: Math.round(15 * barrier),
        tacticalPenalty: Math.round(10 * barrier),
        moraleDelta: -10,
        pressureDelta: 15,
        fatigueDelta: 5,
      };
    case "adapting":
      return {
        communicationPenalty: Math.round(8 * barrier),
        tacticalPenalty: Math.round(5 * barrier),
        moraleDelta: -3,
        pressureDelta: 5,
        fatigueDelta: 2,
      };
    case "integrated":
      return none;
  }
}

/** Check if the player qualifies for the multicultural bonus (2+ countries). */
export function hasMulticulturalBonus(adaptation: CulturalAdaptation | null): boolean {
  if (!adaptation) return false;
  return adaptation.countriesLived.length >= 2 && adaptation.phase === "integrated";
}

/** Check if comfort bonus applies (3+ years = ~1095 days in same country). */
export function hasComfortBonus(adaptation: CulturalAdaptation | null, currentDay: number): boolean {
  if (!adaptation) return false;
  return (currentDay - adaptation.startDay) >= 1095 && adaptation.phase === "integrated";
}

/** Get top scorers from world players, sorted descending. */
export function getWorldTopScorers(state: WorldState, limit: number = 10): WorldPlayer[] {
  return [...state.players].sort((a, b) => b.goals - a.goals).slice(0, limit);
}

/** Get top rated from world players, sorted descending. */
export function getWorldTopRated(state: WorldState, limit: number = 10): WorldPlayer[] {
  return [...state.players].sort((a, b) => b.overall - a.overall).slice(0, limit);
}

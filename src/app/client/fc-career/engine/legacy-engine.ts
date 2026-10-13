/**
 * FC CAREER — Engine Retraite, Héritage, Journal & Autobiographie
 * (Merged from retirement-engine.ts + journal-engine.ts)
 */

import type {
  RetirementState,
  RetirementInfo,
  RetirementReason,
  LegacyScoreBreakdown,
  Ending,
  EndingTier,
  PostCareerRole,
  PostCareerOption,
  PostCareerState,
  LegacyPlayer,
  JournalState,
  JournalEntry,
  JournalEventType,
  Autobiography,
  AutobiographyChapter,
} from "../types/legacy";

/* ================================================================== */
/* RETIREMENT ENGINE                                                    */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export function createRetirementState(): RetirementState {
  return {
    retired: false,
    retirementInfo: null,
    legacyScore: null,
    ending: null,
    postCareer: null,
    legacyPlayers: [],
  };
}

/* ------------------------------------------------------------------ */
/* Retirement Checks                                                   */
/* ------------------------------------------------------------------ */

export function canRetireVoluntarily(age: number): boolean {
  return age >= 32;
}

export function checkForcedRetirement(
  age: number,
  overall: number,
  hasClub: boolean,
  recurringInjuries: number,
): RetirementReason | null {
  if (age > 38) return "forced-age";
  if (overall < 60 && !hasClub) return "forced-rating";
  if (recurringInjuries >= 5) return "forced-injury";
  return null;
}

export function retire(
  state: RetirementState,
  reason: RetirementReason,
  age: number,
  day: number,
  seasonYear: number,
  farewellMatch: boolean,
): RetirementState {
  const info: RetirementInfo = { reason, age, day, seasonYear, farewellMatch };
  return { ...state, retired: true, retirementInfo: info };
}

/* ------------------------------------------------------------------ */
/* Legacy Score                                                        */
/* ------------------------------------------------------------------ */

export interface LegacyInput {
  championships: number;
  cups: number;
  championsLeague: number;
  europaLeague: number;
  worldCup: number;
  euro: number;
  totalGoals: number;
  totalCaps: number;
  avgRating: number;
  goldenGlobes: number;
  goldenBoots: number;
  bestPlayer: number;
  countriesPlayed: number;
  wasCaptainClub: boolean;
  wasCaptainNational: boolean;
  yearsAtOneClub: number;
}

export function computeLegacyScore(input: LegacyInput): LegacyScoreBreakdown {
  // Trophies (max 35)
  let trophies = 0;
  trophies += Math.min(input.championships * 5, 15);
  trophies += Math.min(input.cups * 3, 9);
  trophies += Math.min(input.championsLeague * 8, 16);
  trophies += Math.min(input.europaLeague * 4, 8);
  trophies += Math.min(input.worldCup * 10, 10);
  trophies += Math.min(input.euro * 7, 7);
  trophies = Math.min(trophies, 35);

  // Stats (max 25)
  let stats = 0;
  if (input.totalGoals >= 300) stats += 15;
  else if (input.totalGoals >= 200) stats += 10;
  else if (input.totalGoals >= 100) stats += 5;
  if (input.totalCaps >= 100) stats += 7;
  else if (input.totalCaps >= 50) stats += 3;
  if (input.avgRating > 7.5) stats += 5;
  else if (input.avgRating > 7.0) stats += 3;
  stats = Math.min(stats, 25);

  // Awards (max 25)
  let awards = 0;
  awards += Math.min(input.goldenGlobes * 8, 24);
  awards += Math.min(input.goldenBoots * 4, 8);
  awards += Math.min(input.bestPlayer * 3, 6);
  awards = Math.min(awards, 25);

  // Career (max 15)
  let career = 0;
  if (input.countriesPlayed >= 3) career += 3;
  if (input.wasCaptainClub) career += 2;
  if (input.wasCaptainNational) career += 5;
  if (input.yearsAtOneClub >= 10) career += 5;
  career = Math.min(career, 15);

  const total = Math.min(trophies + stats + awards + career, 100);

  return { trophies, stats, awards, career, total };
}

/* ------------------------------------------------------------------ */
/* Endings                                                             */
/* ------------------------------------------------------------------ */

function getEndingTier(score: number): EndingTier {
  if (score >= 90) return "living-legend";
  if (score >= 75) return "icon";
  if (score >= 60) return "solid";
  if (score >= 40) return "average";
  if (score >= 20) return "wasted";
  return "broken";
}

const ENDINGS: Record<EndingTier, Omit<Ending, "tier">> = {
  "living-legend": { emoji: "🏛️", title: "LÉGENDE VIVANTE", description: "Statue devant le stade. Ton nom est éternel." },
  "icon": { emoji: "⭐", title: "ICÔNE", description: "Carrière exceptionnelle. Respecté par tous." },
  "solid": { emoji: "🎖️", title: "CARRIÈRE SOLIDE", description: "Bon pro, respecté. Reconversion possible." },
  "average": { emoji: "📋", title: "CARRIÈRE MOYENNE", description: "Sans éclat. Peu de souvenirs." },
  "wasted": { emoji: "😔", title: "TALENT GÂCHÉ", description: "Blessures ou mauvais choix. Le « et si... »" },
  "broken": { emoji: "💀", title: "CARRIÈRE BRISÉE", description: "Scandales, faillite. Ton nom = échec." },
};

export function getEnding(score: number): Ending {
  const tier = getEndingTier(score);
  return { tier, ...ENDINGS[tier] };
}

/* ------------------------------------------------------------------ */
/* Post-Career                                                         */
/* ------------------------------------------------------------------ */

const POST_CAREER_OPTIONS: PostCareerOption[] = [
  { role: "tv-consultant", label: "Consultant TV", emoji: "🎙️", description: "Tu commentes les matchs et donnes ton avis.", minScore: 40, minLeadership: 0 },
  { role: "coach", label: "Entraîneur", emoji: "⚽", description: "Tu gères une équipe : formation, tactique, recrutement.", minScore: 60, minLeadership: 70 },
  { role: "sporting-director", label: "Directeur sportif", emoji: "🏢", description: "Tu recrutes des joueurs et gères le budget.", minScore: 70, minLeadership: 0 },
  { role: "peaceful-retirement", label: "Retraite paisible", emoji: "🏖️", description: "Tu vis de tes investissements.", minScore: 0, minLeadership: 0 },
];

export function getAvailablePostCareerOptions(legacyScore: number, leadership: number): PostCareerOption[] {
  return POST_CAREER_OPTIONS.filter(o => legacyScore >= o.minScore && leadership >= o.minLeadership);
}

export function choosePostCareer(
  state: RetirementState,
  role: PostCareerRole,
  wealth: number,
): RetirementState {
  const postCareer: PostCareerState = {
    role,
    popularity: role === "tv-consultant" ? 50 : 0,
    teamManaged: role === "coach" || role === "sporting-director" ? "À déterminer" : "",
    wealth,
  };
  return { ...state, postCareer };
}

export function applyLegacyAndEnding(
  state: RetirementState,
  input: LegacyInput,
): RetirementState {
  const legacyScore = computeLegacyScore(input);
  const ending = getEnding(legacyScore.total);
  return { ...state, legacyScore, ending };
}

/* ------------------------------------------------------------------ */
/* Cross-Career Legacy                                                 */
/* ------------------------------------------------------------------ */

export function createLegacyPlayer(
  name: string,
  position: string,
  clubs: string[],
  goals: number,
  assists: number,
  caps: number,
  trophies: number,
  legacyScore: number,
  postCareerRole: PostCareerRole | null,
): LegacyPlayer {
  const endingTier = getEndingTier(legacyScore);
  return {
    name,
    position,
    clubs,
    goals,
    assists,
    caps,
    trophies,
    legacyScore,
    endingTier,
    hasStatue: legacyScore >= 90,
    postCareerRole,
  };
}

export function addLegacyPlayer(state: RetirementState, legacy: LegacyPlayer): RetirementState {
  return { ...state, legacyPlayers: [...state.legacyPlayers, legacy] };
}

/* ================================================================== */
/* JOURNAL ENGINE                                                       */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export function createJournalState(): JournalState {
  return { entries: [], autobiography: null };
}

/* ------------------------------------------------------------------ */
/* Journal Entries                                                     */
/* ------------------------------------------------------------------ */

let entryCounter = 0;

const EVENT_EMOJI: Record<JournalEventType, string> = {
  "first-match": "🌟",
  "first-goal": "⚽",
  "first-assist": "🅰️",
  "first-title": "🏆",
  "first-callup": "🏳️",
  "transfer": "✈️",
  "severe-injury": "🤕",
  "injury-return": "💪",
  "rivalry": "🔥",
  "individual-award": "🥇",
  "key-moment": "⭐",
  "season-summary": "📊",
  "academy-start": "🎓",
  "captain-appointed": "©️",
  "retirement": "👋",
};

export function addJournalEntry(
  state: JournalState,
  type: JournalEventType,
  title: string,
  narrative: string,
  day: number,
  seasonYear: number,
  playerAge: number,
): JournalState {
  entryCounter++;
  const entry: JournalEntry = {
    id: `journal-${entryCounter}`,
    type,
    day,
    seasonYear,
    title,
    narrative,
    emoji: EVENT_EMOJI[type],
    playerAge,
  };
  return { ...state, entries: [...state.entries, entry] };
}

/* ------------------------------------------------------------------ */
/* Narrative Generation                                                */
/* ------------------------------------------------------------------ */

export function generateFirstMatchNarrative(playerName: string, clubName: string, age: number): string {
  return `À ${age} ans, ${playerName} foule pour la première fois la pelouse en tant que professionnel sous les couleurs de ${clubName}. Le jeune joueur, visiblement ému, déclare après le match : "C'est un rêve qui se réalise."`;
}

export function generateFirstGoalNarrative(playerName: string, opponent: string, minute: number): string {
  return `${playerName} inscrit son premier but professionnel face à ${opponent} à la ${minute}e minute ! Le stade explose. Un moment gravé dans la mémoire. Les médias titrent : "La révélation est en marche."`;
}

export function generateTransferNarrative(playerName: string, fromClub: string, toClub: string, fee: number): string {
  return `Transfert officiel : ${playerName} quitte ${fromClub} pour rejoindre ${toClub} contre ${fee}M€. Une nouvelle aventure commence. "Je suis prêt pour ce défi," déclare le joueur lors de sa présentation.`;
}

export function generateInjuryNarrative(playerName: string, injuryType: string, weeks: number): string {
  return `Coup dur pour ${playerName}. Diagnostic : ${injuryType}. Indisponible ${weeks} semaines. Le staff médical se veut rassurant : "Il reviendra plus fort." En attendant, la rééducation commence dès demain.`;
}

export function generateReturnNarrative(playerName: string): string {
  return `${playerName} est de retour ! Après des semaines de rééducation intense, le joueur retrouve le groupe. "Ces semaines ont été les plus longues de ma vie, mais je suis enfin prêt," confie-t-il.`;
}

export function generateTitleNarrative(playerName: string, competition: string): string {
  return `${playerName} remporte ${competition} ! Premier titre professionnel. Les célébrations durent toute la nuit. "On a travaillé dur pour ça. C'est le début, pas la fin," promet le champion.`;
}

export function generateSeasonSummary(
  playerName: string,
  season: number,
  goals: number,
  assists: number,
  matches: number,
  avgRating: number,
): string {
  const perf = avgRating >= 7.5 ? "exceptionnelle" : avgRating >= 6.5 ? "solide" : "difficile";
  return `Saison ${season} terminée. Bilan pour ${playerName} : ${matches} matchs, ${goals} buts, ${assists} passes décisives. Note moyenne : ${avgRating.toFixed(1)}. Une saison ${perf}. ${avgRating >= 7.5 ? "Les scouts des grands clubs commencent à s'intéresser à lui." : avgRating >= 6.5 ? "La progression continue." : "Il faudra faire mieux la saison prochaine."}`;
}

export function generateCallUpNarrative(playerName: string, country: string): string {
  return `${playerName} est convoqué en équipe nationale de ${country} ! "Porter ce maillot, c'est un honneur immense. Je vais tout donner," déclare-t-il, la voix tremblante d'émotion.`;
}

export function generateAwardNarrative(playerName: string, award: string): string {
  return `${playerName} reçoit le prix de ${award} ! Une récompense méritée pour une saison remarquable. "Ce trophée, je le dédie à mes coéquipiers et à ma famille," dit-il sur scène.`;
}

export function generateCaptainNarrative(playerName: string, clubName: string): string {
  return `${playerName} est nommé capitaine de ${clubName} ! Le brassard sur le bras, il mène désormais ses coéquipiers sur le terrain. "C'est une responsabilité que j'accepte avec fierté."`;
}

/* ------------------------------------------------------------------ */
/* Autobiography                                                       */
/* ------------------------------------------------------------------ */

export function generateAutobiography(
  playerName: string,
  entries: JournalEntry[],
): Autobiography {
  if (entries.length === 0) {
    return {
      title: `${playerName} — Mon Histoire`,
      playerName,
      chapters: [{
        id: "ch-1",
        number: 1,
        title: "Le commencement",
        content: "L'histoire reste à écrire...",
        seasonRange: "—",
      }],
      generatedAt: new Date().toISOString(),
    };
  }

  const seasons = [...new Set(entries.map(e => e.seasonYear))].sort((a, b) => a - b);
  const chapters: AutobiographyChapter[] = [];

  // Chapter 1: Les débuts
  const academyEntries = entries.filter(e => e.type === "academy-start" || e.type === "first-match");
  chapters.push({
    id: "ch-1",
    number: 1,
    title: "Les débuts",
    content: academyEntries.length > 0
      ? academyEntries.map(e => e.narrative).join("\n\n")
      : `${playerName} fait ses premiers pas dans le monde du football professionnel. Tout commence par un rêve d'enfant et une détermination sans faille.`,
    seasonRange: seasons.length > 0 ? `Saison ${seasons[0]}` : "—",
  });

  // Chapter 2: La percée
  const breakthroughEntries = entries.filter(e =>
    e.type === "first-goal" || e.type === "first-assist" || e.type === "first-callup"
  );
  if (breakthroughEntries.length > 0) {
    chapters.push({
      id: "ch-2",
      number: 2,
      title: "La percée",
      content: breakthroughEntries.map(e => e.narrative).join("\n\n"),
      seasonRange: breakthroughEntries.length > 0
        ? `Saison ${breakthroughEntries[0].seasonYear}`
        : "—",
    });
  }

  // Middle chapters: group by season
  let chNum = chapters.length + 1;
  for (const season of seasons) {
    const seasonEntries = entries.filter(e =>
      e.seasonYear === season &&
      !["academy-start", "first-match", "first-goal", "first-assist", "first-callup", "retirement"].includes(e.type)
    );
    if (seasonEntries.length > 0) {
      chapters.push({
        id: `ch-${chNum}`,
        number: chNum,
        title: `Saison ${season}`,
        content: seasonEntries.map(e => e.narrative).join("\n\n"),
        seasonRange: `Saison ${season}`,
      });
      chNum++;
    }
  }

  // Last chapter: L'héritage
  const retirementEntry = entries.find(e => e.type === "retirement");
  chapters.push({
    id: `ch-${chNum}`,
    number: chNum,
    title: "L'héritage",
    content: retirementEntry
      ? retirementEntry.narrative
      : `L'histoire de ${playerName} continue de s'écrire. Chaque match est un nouveau chapitre, chaque saison une nouvelle aventure. La légende est en marche.`,
    seasonRange: seasons.length > 0 ? `Saison ${seasons[seasons.length - 1]}+` : "—",
  });

  return {
    title: `${playerName} — Mon Histoire`,
    playerName,
    chapters,
    generatedAt: new Date().toISOString(),
  };
}

/** Pre-populate journal with academy entry. */
export function initJournalWithAcademy(
  playerName: string,
  clubName: string,
  age: number,
  seasonYear: number,
): JournalState {
  const narrative = `À l'âge de ${age} ans, ${playerName} intègre le centre de formation de ${clubName}. Repéré lors d'un tournoi régional, le jeune joueur impressionne par sa technique et sa détermination. Son premier entraîneur déclare : "Ce gamin a quelque chose de spécial."`;
  return addJournalEntry(
    createJournalState(),
    "academy-start",
    "Entrée en académie",
    narrative,
    1,
    seasonYear,
    age,
  );
}

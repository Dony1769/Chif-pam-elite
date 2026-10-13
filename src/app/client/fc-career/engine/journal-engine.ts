/**
 * FC CAREER — Étape 18 : Engine Journal de Carrière & Autobiographie
 */

import type {
  JournalState,
  JournalEntry,
  JournalEventType,
  Autobiography,
  AutobiographyChapter,
} from "../types/journal";

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

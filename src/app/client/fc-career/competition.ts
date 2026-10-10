"use client";

import type { PlayerCareerState, PlayerPosition } from "./types";
import { calculatePositionRating } from "./engine";

export type CompetitionStatus =
| "titulaire"
| "concurrent"
| "remplacant"
| "hors_groupe";

export interface TeamRival {
id: string;
name: string;
position: PlayerPosition;
overallRating: number;
form: number;
fatigue: number;
coachTrust: number;
status: CompetitionStatus;
selectionScore: number;
}

export interface CompetitionEvaluation {
playerScore: number;
rank: number;
totalPlayers: number;
status: CompetitionStatus;
chanceOfStarting: number;
rivals: TeamRival[];
explanation: string;
}

const POSITION_GROUPS: Record<PlayerPosition, PlayerPosition[]> = {
GB: ["GB"],
DD: ["DD", "DG"],
DC: ["DC", "MDC"],
DG: ["DG", "DD"],
MDC: ["MDC", "MC"],
MC: ["MC", "MOC", "MDC"],
MOC: ["MOC", "MC", "AD", "AG"],
AD: ["AD", "AG", "BU"],
AG: ["AG", "AD", "BU"],
BU: ["BU", "AD", "AG"],
};

const RIVAL_NAMES = [
"Nathan Pierre",
"Samuel Joseph",
"David Charles",
"Enzo Michel",
"Kenny Louis",
"Mathis Jean",
"Junior Augustin",
"Wilson François",
"Mikaël Paul",
"Andy Laurent",
"Stevens Dorval",
"Chris Emmanuel",
];

const clamp = (value: number, min: number, max: number) =>
Math.max(min, Math.min(max, value));

function stableHash(value: string): number {
let hash = 2166136261;

for (let i = 0; i < value.length; i++) {
hash ^= value.charCodeAt(i);
hash = Math.imul(hash, 16777619);
}

return hash >>> 0;
}

function seededValue(seed: string, min: number, max: number): number {
const hash = stableHash(seed);
return min + (hash % (max - min + 1));
}

function calculateSelectionScore(
rating: number,
form: number,
fatigue: number,
coachTrust: number,
): number {
return Math.round(
rating +
(form - 50) * 0.18 -
Math.max(0, fatigue - 35) * 0.22 +
(coachTrust - 50) * 0.12,
);
}

function getPlayerSelectionScore(player: PlayerCareerState): number {
const rating = calculatePositionRating(
player.physicalProfile.primaryPosition,
player.attributes,
);

const formBonus = (player.form - 50) * 0.18;
const fatiguePenalty = Math.max(0, player.fatigue - 35) * 0.22;
const coachBonus = (player.coach.relation - 50) * 0.12;
const injuryPenalty = player.injuryWeeks > 0 ? 100 : 0;
const trainingBonus = player.trainedThisWeek ? 2 : -2;

return Math.round(
rating +
formBonus -
fatiguePenalty +
coachBonus +
trainingBonus -
injuryPenalty,
);
}

function getStatus(
rank: number,
totalPlayers: number,
injured: boolean,
): CompetitionStatus {
if (injured) return "hors_groupe";
if (rank === 1) return "titulaire";
if (rank <= 3) return "concurrent";
if (rank <= Math.ceil(totalPlayers * 0.65)) return "remplacant";

return "hors_groupe";
}

export function evaluateCompetition(
player: PlayerCareerState,
): CompetitionEvaluation {
const playerPosition = player.physicalProfile.primaryPosition;
const compatiblePositions = POSITION_GROUPS[playerPosition];

const playerScore = getPlayerSelectionScore(player);
const injured = player.injuryWeeks > 0;

// Le club et la saison déterminent l'identité de l'effectif.
// La semaine permet de faire évoluer les conditions de concurrence.
const clubSeed = `${player.clubId ?? player.clubName}-${player.season}`;
const weeklySeed = `${clubSeed}-${player.week}`;

const rivals: TeamRival[] = Array.from({ length: 7 }, (_, index) => {
const rivalId = `rival-${index + 1}`;

const positionIndex = seededValue(
`${clubSeed}-${rivalId}-position`,
0,
compatiblePositions.length - 1,
);

const rivalPosition = compatiblePositions[positionIndex];

const minimumRating = clamp(playerScore - 14, 25, 76);
const maximumRating = clamp(playerScore + 12, 45, 88);

const ratingMin = Math.min(minimumRating, maximumRating);
const ratingMax = Math.max(minimumRating, maximumRating);

// La note générale reste stable pour éviter un effectif entièrement
// différent chaque semaine.
const baseRating = seededValue(
`${clubSeed}-${rivalId}-rating`,
ratingMin,
ratingMax,
);

// Forme, fatigue et confiance peuvent évoluer au fil de la saison.
const rivalForm = seededValue(
`${weeklySeed}-${rivalId}-form`,
35,
75,
);

const rivalFatigue = seededValue(
`${weeklySeed}-${rivalId}-fatigue`,
5,
65,
);

const rivalTrust = seededValue(
`${weeklySeed}-${rivalId}-trust`,
30,
75,
);

const selectionScore = calculateSelectionScore(
baseRating,
rivalForm,
rivalFatigue,
rivalTrust,
);

const nameIndex = seededValue(
`${clubSeed}-${rivalId}-name`,
0,
RIVAL_NAMES.length - 1,
);

return {
id: rivalId,
name: RIVAL_NAMES[nameIndex],
position: rivalPosition,
overallRating: baseRating,
form: rivalForm,
fatigue: rivalFatigue,
coachTrust: rivalTrust,
status: "hors_groupe",
selectionScore,
};
});

const ranked = [
{
id: "player",
selectionScore: playerScore,
isPlayer: true,
},
...rivals.map((rival) => ({
id: rival.id,
selectionScore: rival.selectionScore,
isPlayer: false,
})),
].sort((a, b) => {
if (b.selectionScore !== a.selectionScore) {
return b.selectionScore - a.selectionScore;
}

// En cas d'égalité, le joueur est prioritaire uniquement s'il est
// disponible. Un joueur blessé ne doit pas gagner une égalité.
if (a.isPlayer !== b.isPlayer) {
if (injured) return a.isPlayer ? 1 : -1;
return a.isPlayer ? -1 : 1;
}

return a.id.localeCompare(b.id);
});

const totalPlayers = ranked.length;

const playerRank = ranked.findIndex((item) => item.isPlayer) + 1;

// Une blessure exclut le joueur de la sélection, même si son score
// théorique le placerait parmi les meilleurs.
const rank = injured ? totalPlayers : playerRank;

const status = getStatus(rank, totalPlayers, injured);

const updatedRivals = rivals.map((rival) => {
const rivalRank =
ranked.findIndex((item) => item.id === rival.id) + 1;

return {
...rival,
status: getStatus(rivalRank, totalPlayers, false),
};
});

const chanceOfStarting = injured
? 0
: clamp(
Math.round(100 - (rank - 1) * (100 / totalPlayers)),
5,
95,
);

let explanation: string;

if (injured) {
explanation =
"Tu es indisponible à cause de ta blessure. Récupère avant de retrouver la compétition.";
} else if (rank === 1) {
explanation =
"Tu es en tête de la concurrence. Maintiens ton niveau et ta condition physique pour conserver ta place.";
} else if (rank <= 3) {
explanation =
"Tu es proche du onze titulaire. La forme, la fatigue, l'entraînement et la confiance du coach peuvent faire la différence.";
} else if (rank <= 5) {
explanation =
"Tu es dans la rotation, mais plusieurs joueurs te devancent. Améliore tes performances pour gagner des places.";
} else {
explanation =
"Tu es en retrait dans la concurrence. Travaille tes attributs prioritaires et surveille ta condition physique.";
}

return {
playerScore,
rank,
totalPlayers,
status,
chanceOfStarting,
rivals: updatedRivals,
explanation,
};
}

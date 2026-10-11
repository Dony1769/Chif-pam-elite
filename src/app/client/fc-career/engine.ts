/**
 * FC CAREER — Barre d'index du moteur (ré-exports)
 * Permet `import { createInitialPlayer } from "../engine"` dans les pages.
 */

export {
  createRng,
  generatePlayer,
  clamp,
  groupSummary,
} from "./engine/player-generator";
export type { GenerationInput } from "./engine/player-generator";

export {
  computeOverall,
  computePotential,
  attributeCap,
  tryImproveAttribute,
  withAttributes,
} from "./engine/attribute-calculator";

export { predictRating, simulateMatch, selectionChance } from "./engine/match-engine";

export {
  TRAINING_SESSIONS,
  runTrainingSession,
  applyRest,
  endOfWeek,
  recommendedSessions,
} from "./engine/progression";
export type { TrainingType, TrainingSessionDef, SessionResult } from "./engine/progression";

export {
  generateRoundRobin,
  createSeason,
  advanceSeason,
  nextUserFixture,
  computeStandings,
} from "./engine/season-manager";

export * from "./engine/transfer-system";
export * from "./engine/economic-engine";

import { ALL_51_ATTRIBUTES } from "./constants";
import type {
AcademyLevel,
PlayerAttributes,
PlayerCareerState,
PlayerPosition,
PlayerArchetype,
PlayerPotential,
TrainingFocus,
AttributeCategory,
Participation,
PreferredFoot,
} from "./types";

const clamp = (value: number, min = 1, max = 99): number =>
Math.max(min, Math.min(max, value));

const randomInt = (min: number, max: number): number =>
Math.floor(Math.random() * (max - min + 1)) + min;

const normalize = (value: string): string =>
value
.toLowerCase()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "")
.replace(/[^a-z0-9]/g, "");

type InitialPlayerOptions = {
playerName?: string;
age?: number;
heightCm?: number;
weightKg?: number;
preferredFoot?: PreferredFoot;
primaryPosition?: PlayerPosition;
secondaryPositions?: PlayerPosition[];
archetype?: PlayerArchetype;
academyLevel?: AcademyLevel;
};

const POSITION_WEIGHTS: Record<PlayerPosition, Record<string, number>> = {
GB: {
gb_reflexes: 3,
gb_plongeon: 2.5,
gb_positionnement: 2.5,
gb_jeu_main: 2,
gb_sorties: 1.5,
gb_degagement: 1,
reactivite: 1.5,
concentration: 1,
calme: 0.5,
},
DD: {
vitesse: 2,
acceleration: 1.5,
endurance: 1.5,
centres: 1.5,
tackle_debout: 2,
interceptions: 2,
marquage: 1.5,
placement_defensif: 1.5,
passes_courtes: 1,
},
DG: {
vitesse: 2,
acceleration: 1.5,
endurance: 1.5,
centres: 1.5,
tackle_debout: 2,
interceptions: 2,
marquage: 1.5,
placement_defensif: 1.5,
passes_courtes: 1,
},
DC: {
tackle_debout: 2.5,
tackle_glisse: 1.5,
interceptions: 2.5,
marquage: 2.5,
placement_defensif: 2.5,
jeu_de_tete_def: 2,
blocage: 1.5,
force: 1.5,
detente: 1,
calme: 1,
},
MDC: {
interceptions: 2.5,
tackle_debout: 2,
placement_defensif: 2,
passes_courtes: 1.5,
passes_longues: 1.5,
lecture_jeu: 2,
endurance: 1.5,
discipline: 1.5,
controle: 1,
},
MC: {
passes_courtes: 2.5,
passes_longues: 2,
lecture_jeu: 2,
controle: 1.5,
dribble: 1.5,
endurance: 1.5,
vista: 1.5,
placement_defensif: 1,
finition: 0.5,
},
MOC: {
vista: 2.5,
passes_courtes: 2,
finesse_passe: 2,
controle: 2,
dribble: 2,
gestes_techniques: 1.5,
finition: 1.5,
tirs_lointains: 1,
calme: 1,
},
AD: {
vitesse: 2.5,
acceleration: 2.5,
dribble: 2.5,
gestes_techniques: 1.5,
finition: 1.5,
centres: 1.5,
controle: 1.5,
agilite: 1.5,
},
AG: {
vitesse: 2.5,
acceleration: 2.5,
dribble: 2.5,
gestes_techniques: 1.5,
finition: 1.5,
centres: 1.5,
controle: 1.5,
agilite: 1.5,
},
BU: {
finition: 3,
placement_offensif: 2.5,
puissance_tir: 2,
tirs_lointains: 1.5,
tete_offensive: 1.5,
controle: 1.5,
calme: 1.5,
reprise_volee: 1,
acceleration: 1,
},
};

const ARCHETYPE_KEYWORDS: Record<PlayerArchetype, string[]> = {
technicien: ["technique", "controle", "dribble", "passe", "vision"],
sprinteur: ["vitesse", "acceleration", "agilite", "endurance"],
physique: ["force", "puissance", "endurance", "detente"],
createur: ["vision", "passe", "controle", "technique", "creativite"],
finisseur: ["finition", "tir", "placement", "sangfroid"],
defenseur: ["tacle", "interception", "marquage", "placement", "force"],
gardien: ["gardien", "reflex", "plonge", "prise", "sortie"],
polyvalent: ["endurance", "controle", "passe", "placement"],
};

export function getAttributeCap(
attrId: string,
heightCm: number,
weightKg: number,
): number {
const attribute = ALL_51_ATTRIBUTES.find((item) => item.id === attrId);
if (!attribute) return 99;

const name = normalize(`${attribute.id} ${attribute.name}`);
let cap = 99;

const isSpeedAttribute =
name.includes("acceleration") ||
name.includes("vitesse") ||
name.includes("agilite");

if (isSpeedAttribute) {
if (heightCm >= 200) cap -= 4;
else if (heightCm >= 195) cap -= 2;

if (weightKg >= 100) cap -= 5;
else if (weightKg >= 90) cap -= 3;
else if (weightKg >= 82) cap -= 1;
}

const isStrengthAttribute =
name.includes("force") ||
name.includes("puissance") ||
name.includes("physique");

if (isStrengthAttribute && weightKg < 50) {
cap -= 2;
}

return clamp(cap, 55, 99);
}

export function calculatePositionRating(
position: string,
attributes: PlayerAttributes,
): number {
const weights = POSITION_WEIGHTS[position as PlayerPosition];

if (!weights) return 45;

let total = 0;
let totalWeight = 0;

for (const [attributeId, weight] of Object.entries(weights)) {
const value = attributes[attributeId] ?? 30;

total += clamp(value, 1, 99) * weight;
totalWeight += weight;
}

if (totalWeight === 0) return 45;

return Math.round(clamp(total / totalWeight, 1, 99));
}

export function evaluatePlayerRole(
attributes: PlayerAttributes,
coach: PlayerCareerState["coach"],
): {
assignedPosition: string;
isStarter: boolean;
overallRating: number;
} {
const positions: PlayerPosition[] = [
"GB",
"DD",
"DC",
"DG",
"MDC",
"MC",
"MOC",
"AD",
"AG",
"BU",
];

const ratings = positions.map((position) => ({
position,
rating: calculatePositionRating(position, attributes),
}));

ratings.sort((a, b) => b.rating - a.rating);

const best = ratings[0] ?? { position: "MC", rating: 45 };
const threshold = clamp(coach.strictness, 35, 90);

return {
assignedPosition: best.position,
isStarter: best.rating >= threshold,
overallRating: best.rating,
};
}

export const TRAINING_FOCUS: Record<
TrainingFocus,
{
label: string;
description: string;
categories: AttributeCategory[];
fatigue: number;
}
> = {
technique: {
label: "Technique",
description: "Travail du ballon, contrôle et qualité de passe.",
categories: ["Technique & Passes", "Attaque"],
fatigue: 10,
},
physique: {
label: "Physique",
description: "Développe l’endurance, la vitesse et la puissance.",
categories: ["Physique & Moteur"],
fatigue: 18,
},
mental: {
label: "Mental",
description: "Améliore la concentration, la décision et le sang-froid.",
categories: ["Mental & Tactique"],
fatigue: 7,
},
tactique: {
label: "Tactique",
description: "Travaille le placement, la lecture du jeu et la défense.",
categories: ["Mental & Tactique", "Défense"],
fatigue: 9,
},
repos: {
label: "Récupération",
description: "Réduit la fatigue et favorise la récupération.",
categories: [],
fatigue: -30,
},
};

function getPhysicalModifier(
attributeName: string,
heightCm: number,
weightKg: number,
): number {
const name = normalize(attributeName);
let modifier = 0;

const isSpeed =
name.includes("vitesse") ||
name.includes("acceleration") ||
name.includes("agilite");

const isStrength =
name.includes("force") ||
name.includes("puissance") ||
name.includes("physique");

const isAerial =
name.includes("detente") ||
name.includes("tete") ||
name.includes("jeuaerien");

if (isSpeed) {
if (heightCm >= 195) modifier -= 2;

if (weightKg >= 90) modifier -= 2;
else if (weightKg >= 82) modifier -= 1;
}

if (isStrength) {
if (heightCm >= 185) modifier += 1;
if (weightKg >= 80) modifier += 1;
}

if (isAerial && heightCm >= 185) {
modifier += 2;
}

if (name.includes("equilibre") && heightCm >= 195) {
modifier -= 1;
}

return modifier;
}

function generateInitialAttributes(
position: PlayerPosition,
archetype: PlayerArchetype,
age: number,
heightCm: number,
weightKg: number,
): PlayerAttributes {
const attributes: PlayerAttributes = {};

const positionBoosts: Record<PlayerPosition, Record<string, number>> = {
GB: {
gb_reflexes: 18,
gb_plongeon: 16,
gb_positionnement: 15,
gb_jeu_main: 12,
gb_sorties: 10,
gb_degagement: 8,
reactivite: 8,
concentration: 4,
},
DD: {
vitesse: 10,
acceleration: 9,
endurance: 8,
centres: 6,
tackle_debout: 9,
interceptions: 8,
marquage: 7,
placement_defensif: 7,
},
DG: {
vitesse: 10,
acceleration: 9,
endurance: 8,
centres: 6,
tackle_debout: 9,
interceptions: 8,
marquage: 7,
placement_defensif: 7,
},
DC: {
tackle_debout: 12,
tackle_glisse: 9,
interceptions: 10,
marquage: 11,
placement_defensif: 11,
jeu_de_tete_def: 10,
blocage: 8,
force: 7,
},
MDC: {
interceptions: 10,
tackle_debout: 8,
placement_defensif: 9,
passes_courtes: 7,
passes_longues: 6,
lecture_jeu: 8,
endurance: 7,
discipline: 6,
},
MC: {
passes_courtes: 10,
passes_longues: 7,
lecture_jeu: 7,
controle: 7,
dribble: 5,
endurance: 7,
vista: 6,
},
MOC: {
vista: 10,
passes_courtes: 8,
finesse_passe: 8,
controle: 8,
dribble: 8,
gestes_techniques: 6,
finition: 5,
},
AD: {
vitesse: 10,
acceleration: 10,
dribble: 10,
gestes_techniques: 7,
finition: 6,
centres: 7,
controle: 7,
agilite: 8,
},
AG: {
vitesse: 10,
acceleration: 10,
dribble: 10,
gestes_techniques: 7,
finition: 6,
centres: 7,
controle: 7,
agilite: 8,
},
BU: {
finition: 12,
placement_offensif: 10,
puissance_tir: 8,
tirs_lointains: 5,
tete_offensive: 7,
controle: 7,
calme: 6,
reprise_volee: 5,
},
};

const archetypeBoosts: Record<PlayerArchetype, Record<string, number>> = {
technicien: {
dribble: 7,
controle: 8,
passes_courtes: 6,
passes_longues: 5,
gestes_techniques: 7,
conduite_balle: 7,
},
sprinteur: {
vitesse: 10,
acceleration: 10,
agilite: 7,
endurance: 4,
},
physique: {
force: 9,
equilibre: 6,
endurance: 5,
detente: 5,
protection_balle: 6,
},
createur: {
vista: 9,
passes_courtes: 7,
passes_longues: 7,
finesse_passe: 8,
lecture_jeu: 6,
},
finisseur: {
finition: 10,
placement_offensif: 8,
puissance_tir: 7,
reprise_volee: 6,
calme: 5,
},
defenseur: {
tackle_debout: 9,
tackle_glisse: 7,
interceptions: 8,
marquage: 8,
placement_defensif: 8,
},
gardien: {
gb_reflexes: 10,
gb_plongeon: 9,
gb_positionnement: 9,
gb_jeu_main: 7,
gb_sorties: 6,
},
polyvalent: {
endurance: 4,
controle: 3,
passes_courtes: 3,
lecture_jeu: 2,
discipline: 2,
},
};

const ageModifier = clamp((age - 15) * 1.2, -3, 4);
const positionProfile = positionBoosts[position];
const archetypeProfile = archetypeBoosts[archetype];

for (const attribute of ALL_51_ATTRIBUTES) {
const id = attribute.id;
const category = attribute.category;

let base = randomInt(27, 43) + ageModifier;

base += positionProfile[id] ?? 0;
base += archetypeProfile[id] ?? 0;

// Les gardiens de champ ne possèdent pas encore les réflexes
// spécialisés d'un gardien confirmé.
if (category === "Gardien" && position !== "GB") {
base = randomInt(10, 24) + Math.max(0, age - 15);
}

// Un gardien conserve des aptitudes de joueur de champ,
// mais celles-ci sont moins développées au départ.
if (category !== "Gardien" && position === "GB") {
base = randomInt(22, 36) + ageModifier;
}

const physicalModifier = getPhysicalModifier(
`${attribute.id} ${attribute.name}`,
heightCm,
weightKg,
);

base += physicalModifier;

attributes[id] = clamp(Math.round(base), 5, 78);
}

return attributes;
}

function generatePotential(
attributes: PlayerAttributes,
age: number,
position: PlayerPosition,
): PlayerPotential {
const attributePotentials: PlayerAttributes = {};

const ageAdjustment = clamp((16 - age) * 1.5, -3, 4);

for (const attribute of ALL_51_ATTRIBUTES) {
const current = attributes[attribute.id] ?? 35;

const developmentCeiling = randomInt(
clamp(72 + ageAdjustment, 65, 88),
clamp(96 + ageAdjustment, 85, 99),
);

attributePotentials[attribute.id] = Math.max(
current,
Math.min(99, developmentCeiling),
);
}

const overallPotential = calculatePositionRating(
position,
attributePotentials,
);

return {
overallPotential,
attributePotentials,
developmentRate: clamp(
randomInt(75, 115) / 100 +
Math.max(0, 16 - age) * 0.015,
0.75,
1.2,
),
consistency: randomInt(65, 95),
};
}

export function createInitialPlayer(
options: InitialPlayerOptions = {},
): PlayerCareerState {
const playerName = options.playerName?.trim() || "Nouveau joueur";
const age = clamp(options.age ?? 15, 13, 18);
const heightCm = clamp(options.heightCm ?? 170, 140, 210);
const weightKg = clamp(options.weightKg ?? 60, 35, 120);
const preferredFoot = options.preferredFoot ?? "droit";
const primaryPosition = options.primaryPosition ?? "MC";
const archetype = options.archetype ?? "polyvalent";
const academyLevel = options.academyLevel ?? "local";

const defaultSecondaryPositions: PlayerPosition[] =
primaryPosition === "MC"
? ["MOC", "MDC"]
: primaryPosition === "AD"
? ["AG", "BU"]
: primaryPosition === "AG"
? ["AD", "BU"]
: primaryPosition === "DC"
? ["MDC", "DD"]
: primaryPosition === "GB"
? []
: ["MC"];

const secondaryPositions = (
options.secondaryPositions ?? defaultSecondaryPositions
).filter((position) => position !== primaryPosition);

const attributes = generateInitialAttributes(
primaryPosition,
archetype,
age,
heightCm,
weightKg,
);

const potential = generatePotential(
attributes,
age,
primaryPosition,
);

const academyNames: Record<AcademyLevel, string> = {
local: "Académie de quartier",
regional: "Centre régional de formation",
national: "Académie nationale",
elite: "Centre d'élite",
};

const academyDivisions: Record<AcademyLevel, string> = {
local: "Championnat local des jeunes",
regional: "Championnat régional des jeunes",
national: "Championnat national des jeunes",
elite: "Championnat élite des jeunes",
};

const academyStrength: Record<AcademyLevel, number> = {
local: 30,
regional: 38,
national: 45,
elite: 52,
};

const initialRating = calculatePositionRating(
primaryPosition,
attributes,
);

return {
saveVersion: 2,
isUnlocked: true,

playerName,
age,
careerStage: "academie",

season: 1,
week: 1,

physicalProfile: {
heightCm,
weightKg,
preferredFoot,
primaryPosition,
secondaryPositions,
archetype,
},

heightCm,
weightKg,

skillPointsAvailable: 0,
attributes,
potential,

assignedPosition: primaryPosition,
isStarter: false,

clubName: academyNames[academyLevel],
clubId: `academy-${academyLevel}-001`,
division: academyDivisions[academyLevel],
teamStrength: academyStrength[academyLevel],

coach: {
id: "coach-001",
name: "Coach Jean-Baptiste",
preferredFormation: "4-3-3",
tacticalStyle: "Possession",
patienceRating: 72,
strictness: 42,
relation: 55,
},

academy: {
academyName: academyNames[academyLevel],
academyLevel,
enrollmentSeason: 1,
enrollmentWeek: 1,
evaluationScore: initialRating,
trialsCompleted: 0,
trainingSessionsCompleted: 0,
youthMatchesPlayed: 0,
promotionEligible: false,
},

contract: null,
activeSponsors: [],

matchHistoryCount: 0,
form: 50,
fatigue: 10,
injuryWeeks: 0,

trainedThisWeek: false,
lastTrainingNote:
"Bienvenue à l’académie. Commence ton développement.",

reputation: {
niveau: 5,
image: 25,
moral: 70,
followers: 0,
},

inbox: [
{
id: "welcome-001",
from: "coach",
season: 1,
week: 1,
title: "Bienvenue à l’académie",
body: "Bienvenue dans l’équipe. Travaille sérieusement, écoute les consignes et progresse chaque semaine. Ton parcours commence maintenant.",
read: false,
},
],

seasonStats: {
matches: 0,
wins: 0,
draws: 0,
losses: 0,
goals: 0,
assists: 0,
ratingSum: 0,
ratedMatches: 0,
},

careerStats: {
matches: 0,
goals: 0,
assists: 0,
},

pendingEvent: null,
lastWeek: null,
};
}

export function trainWeek(
player: PlayerCareerState,
focus: TrainingFocus,
): PlayerCareerState {
if (player.trainedThisWeek) {
return {
...player,
lastTrainingNote: "Tu as déjà effectué ta séance cette semaine.",
};
}

const training = TRAINING_FOCUS[focus];
const attributes = { ...player.attributes };
const isRest = focus === "repos";

// Le repos récupère la fatigue sans compter comme séance de progression.
if (isRest) {
const recovered = Math.min(player.fatigue, 30);

return {
...player,
fatigue: Math.max(0, player.fatigue - 30),
trainedThisWeek: true,
lastTrainingNote:
recovered > 0
? `Repos effectué : ${recovered} points de fatigue récupérés.`
: "Repos effectué. Tu es déjà en pleine récupération.",
};
}

// Seuls les attributs correspondant à la séance peuvent progresser.
// Aucun attribut ne dépasse son potentiel ni son plafond physique.
const eligible = ALL_51_ATTRIBUTES.filter((attribute) => {
if (!training.categories.includes(attribute.category)) {
return false;
}

const current = attributes[attribute.id] ?? 1;
const potential =
player.potential.attributePotentials[attribute.id] ?? 99;
const physicalCap = getAttributeCap(
attribute.id,
player.heightCm,
player.weightKg,
);

return current < Math.min(potential, physicalCap);
});

const fatigue = player.fatigue;
let note = "";

if (eligible.length === 0) {
note =
"Séance terminée. Les attributs ciblés ont atteint leurs limites actuelles.";
} else if (fatigue >= 90) {
note =
"Tu es trop fatigué pour progresser efficacement. Prévois une récupération.";
} else {
const position = player.physicalProfile.primaryPosition;
const positionWeights = POSITION_WEIGHTS[position] ?? {};

const archetypeAttributeIds: Record<string, string[]> = {
technicien: [
"dribble",
"controle",
"conduite_balle",
"gestes_techniques",
"passes_courtes",
],
sprinteur: [
"acceleration",
"vitesse",
"agilite",
"reactivite",
],
physique: [
"force",
"endurance",
"agressivite",
"equilibre",
"detente",
],
createur: [
"vista",
"passes_courtes",
"passes_longues",
"finesse_passe",
"controle",
],
finisseur: [
"finition",
"placement_offensif",
"puissance_tir",
"reprise_volee",
"calme",
],
defenseur: [
"marquage",
"interceptions",
"tackle_debout",
"tackle_glisse",
"placement_defensif",
],
gardien: [
"gb_reflexes",
"gb_positionnement",
"gb_plongeon",
"gb_jeu_main",
"gb_sorties",
],
polyvalent: [],
};

const archetype = player.physicalProfile.archetype;
const preferredIds = archetypeAttributeIds[archetype] ?? [];

// Le poste et l'archétype influencent le choix de l'attribut entraîné.
const weighted = eligible.map((attribute) => {
const positionWeight = positionWeights[attribute.id] ?? 0;
const archetypeBonus = preferredIds.includes(attribute.id) ? 2 : 0;

return {
id: attribute.id,
weight: 1 + positionWeight * 0.2 + archetypeBonus,
};
});

const totalWeight = weighted.reduce(
(sum, item) => sum + item.weight,
0,
);

let roll = Math.random() * totalWeight;
let selectedId = weighted[weighted.length - 1].id;

for (const item of weighted) {
roll -= item.weight;

if (roll <= 0) {
selectedId = item.id;
break;
}
}

const current = attributes[selectedId] ?? 1;
const potential =
player.potential.attributePotentials[selectedId] ?? 99;

const physicalCap = getAttributeCap(
selectedId,
player.heightCm,
player.weightKg,
);

const age = player.age;
const developmentRate = player.potential.developmentRate ?? 1;

const ageBonus =
age <= 17
? 0.25
: age <= 21
? 0.15
: age <= 25
? 0.05
: age <= 29
? -0.1
: -0.2;

const fatiguePenalty = Math.max(0, (fatigue - 30) / 100);

const extraPointChance = Math.max(
0.05,
Math.min(
0.85,
0.25 +
(developmentRate - 1) * 0.35 +
ageBonus -
fatiguePenalty,
),
);

const gain =
fatigue >= 75
? 1
: Math.random() < extraPointChance
? 2
: 1;

const newValue = Math.min(
current + gain,
potential,
physicalCap,
);

attributes[selectedId] = newValue;

const selectedAttribute = ALL_51_ATTRIBUTES.find(
(attribute) => attribute.id === selectedId,
);

const actualGain = newValue - current;

note = `Séance terminée : ${selectedAttribute?.name ?? selectedId} progresse de ${actualGain} point${actualGain > 1 ? "s" : ""}.`;
}

const newFatigue = Math.max(
0,
Math.min(100, player.fatigue + training.fatigue),
);

const academy = player.academy
? {
...player.academy,
trainingSessionsCompleted:
player.academy.trainingSessionsCompleted + 1,
}
: null;

return {
...player,
attributes,
fatigue: newFatigue,

// Une séance d'entraînement n'accorde pas de point de compétence.
// Le point de compétence est attribué lors du passage à la semaine suivante.
skillPointsAvailable: player.skillPointsAvailable,

trainedThisWeek: true,
lastTrainingNote: note,
academy,
};
}

export function rollParticipation(
player: PlayerCareerState,
): Participation {
if (player.injuryWeeks > 0) return "tribune";

const role = evaluatePlayerRole(
player.attributes,
player.coach,
);

const rating = calculatePositionRating(
player.physicalProfile.primaryPosition,
player.attributes,
);

const fatiguePenalty = Math.max(0, player.fatigue - 45) * 0.35;
const formBonus = (player.form - 50) * 0.15;
const effectiveRating = rating - fatiguePenalty + formBonus;

if (
effectiveRating >= player.coach.strictness + 5 &&
role.isStarter
) {
return Math.random() < 0.78
? "titulaire"
: "remplacant";
}

if (
effectiveRating >= player.coach.strictness - 15
) {
return Math.random() < 0.68
? "remplacant"
: "tribune";
}

return Math.random() < 0.25
? "remplacant"
: "tribune";
                       }

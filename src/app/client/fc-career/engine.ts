import { ALL_51_ATTRIBUTES } from './constants';
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
} from './types';

const clamp = (value: number, min = 1, max = 99): number =>
Math.max(min, Math.min(max, value));

const randomInt = (min: number, max: number): number =>
Math.floor(Math.random() * (max - min + 1)) + min;

const normalize = (value: string): string =>
value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const ATTRIBUTE_KEYWORDS: Record<string, string[]> = {
GB: ['gardien', 'reflex', 'plonge', 'prise', 'detente', 'sortie', 'placement'],
DD: ['vitesse', 'acceleration', 'endurance', 'centre', 'tacle', 'interception', 'defense'],
DG: ['vitesse', 'acceleration', 'endurance', 'centre', 'tacle', 'interception', 'defense'],
DC: ['tacle', 'interception', 'marquage', 'placement', 'force', 'detente', 'tete', 'defense'],
MDC: ['interception', 'tacle', 'placement', 'passe', 'vision', 'endurance', 'defense'],
MC: ['passe', 'vision', 'controle', 'dribble', 'endurance', 'placement', 'technique'],
MOC: ['vision', 'passe', 'dribble', 'controle', 'tir', 'technique', 'creativite'],
AD: ['vitesse', 'acceleration', 'dribble', 'centre', 'tir', 'agilite', 'technique'],
AG: ['vitesse', 'acceleration', 'dribble', 'centre', 'tir', 'agilite', 'technique'],
BU: ['finition', 'tir', 'placement', 'puissance', 'detente', 'tete', 'sang-froid'],
};

const POSITION_WEIGHTS: Record<PlayerPosition, Record<string, number>> = {
GB: { gardien: 3, reflex: 3, plonge: 2, prise: 2, sortie: 1.5, placement: 1.5 },
DD: { vitesse: 2, acceleration: 1.5, centre: 1.5, tacle: 2, interception: 2, endurance: 1.5 },
DG: { vitesse: 2, acceleration: 1.5, centre: 1.5, tacle: 2, interception: 2, endurance: 1.5 },
DC: { tacle: 2.5, interception: 2.5, marquage: 2, placement: 2, force: 1.5, tete: 1.5 },
MDC: { interception: 2.5, tacle: 2, placement: 2, passe: 1.5, endurance: 1.5, vision: 1 },
MC: { passe: 2.5, vision: 2, controle: 1.5, endurance: 1.5, dribble: 1.5, placement: 1 },
MOC: { vision: 2.5, passe: 2, dribble: 2, controle: 2, tir: 1.5, finition: 1 },
AD: { vitesse: 2.5, acceleration: 2, dribble: 2.5, finition: 1.5, tir: 1.5, centre: 1 },
AG: { vitesse: 2.5, acceleration: 2, dribble: 2.5, finition: 1.5, tir: 1.5, centre: 1 },
BU: { finition: 3, tir: 2.5, placement: 2, puissance: 1.5, tete: 1.5, sangfroid: 1.5 },
};

function getAttributeValue(
attributes: PlayerAttributes,
keywords: string[],
): number {
const matching = ALL_51_ATTRIBUTES.filter((attribute) => {
const searchable = normalize(`${attribute.id} ${attribute.name}`);
return keywords.some((keyword) => searchable.includes(normalize(keyword)));
});

if (matching.length === 0) return 45;

const unique = Array.from(new Set(matching.map((attribute) => attribute.id)));
return unique.reduce((sum, id) => sum + clamp(attributes[id] ?? 45), 0) / unique.length;
}

function getAttributeByCategory(category: AttributeCategory): string[] {
return ALL_51_ATTRIBUTES
.filter((attribute) => attribute.category === category)
.map((attribute) => attribute.id);
}

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
name.includes('acceleration') ||
name.includes('vitesse') ||
name.includes('agilite') ||
name.includes('agility');

if (isSpeedAttribute) {
if (heightCm >= 200) cap -= 5;
else if (heightCm >= 195) cap -= 3;

if (weightKg >= 100) cap -= 7;
else if (weightKg >= 90) cap -= 4;
else if (weightKg >= 82) cap -= 2;
}

const isStrengthAttribute =
name.includes('force') ||
name.includes('puissance') ||
name.includes('physique');

if (isStrengthAttribute && weightKg < 50) {
cap -= 4;
}

return clamp(cap, 55, 99);
}

export function calculatePositionRating(
position: string,
attributes: PlayerAttributes,
): number {
const validPosition = position as PlayerPosition;
const weights = POSITION_WEIGHTS[validPosition];

if (!weights) return 45;

let total = 0;
let totalWeight = 0;

for (const [keyword, weight] of Object.entries(weights)) {
total += getAttributeValue(attributes, [keyword]) * weight;
totalWeight += weight;
}

if (totalWeight === 0) return 45;

return Math.round(clamp(total / totalWeight, 1, 99));
}

export function evaluatePlayerRole(
attributes: PlayerAttributes,
coach: PlayerCareerState['coach'],
): {
assignedPosition: string;
isStarter: boolean;
overallRating: number;
} {
const positions: PlayerPosition[] = [
'GB', 'DD', 'DC', 'DG', 'MDC', 'MC', 'MOC', 'AD', 'AG', 'BU',
];

const ratings = positions.map((position) => ({
position,
rating: calculatePositionRating(position, attributes),
}));

ratings.sort((a, b) => b.rating - a.rating);

const best = ratings[0] ?? { position: 'MC', rating: 45 };
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
label: 'Technique',
description: 'Travail du ballon, contrôle et qualité de passe.',
categories: ['Technique & Passes', 'Attaque'],
fatigue: 10,
},
physique: {
label: 'Physique',
description: 'Développe l’endurance, la vitesse et la puissance.',
categories: ['Physique & Moteur'],
fatigue: 18,
},
mental: {
label: 'Mental',
description: 'Améliore la concentration, la décision et le sang-froid.',
categories: ['Mental & Tactique'],
fatigue: 7,
},
tactique: {
label: 'Tactique',
description: 'Travaille le placement, la lecture du jeu et la défense.',
categories: ['Mental & Tactique', 'Défense'],
fatigue: 9,
},
repos: {
label: 'Récupération',
description: 'Réduit la fatigue et favorise la récupération.',
categories: [],
fatigue: -30,
},
};

function generateInitialAttributes(
position: PlayerPosition,
archetype: PlayerArchetype,
): PlayerAttributes {
const attributes: PlayerAttributes = {};

const positionKeywords = ATTRIBUTE_KEYWORDS[position] ?? [];
const archetypeKeywords: Record<PlayerArchetype, string[]> = {
technicien: ['technique', 'controle', 'dribble', 'passe', 'vision'],
sprinteur: ['vitesse', 'acceleration', 'agilite', 'endurance'],
physique: ['force', 'puissance', 'endurance', 'detente'],
createur: ['vision', 'passe', 'controle', 'technique', 'creativite'],
finisseur: ['finition', 'tir', 'placement', 'sangfroid'],
defenseur: ['tacle', 'interception', 'marquage', 'placement', 'force'],
gardien: ['gardien', 'reflex', 'plonge', 'prise', 'sortie'],
polyvalent: ['endurance', 'controle', 'passe', 'placement'],
};

for (const attribute of ALL_51_ATTRIBUTES) {
const searchable = normalize(`${attribute.id} ${attribute.name}`);
let min = 27;
let max = 55;

if (positionKeywords.some((keyword) => searchable.includes(normalize(keyword)))) {
min += 7;
max += 8;
}

if (
archetypeKeywords[archetype].some((keyword) =>
searchable.includes(normalize(keyword)),
)
) {
min += 4;
max += 7;
}

if (attribute.category === 'Gardien' && position !== 'GB') {
min = 10;
max = 28;
}

if (attribute.category !== 'Gardien' && position === 'GB') {
min = 22;
max = 48;
}

attributes[attribute.id] = randomInt(min, Math.min(max, 72));
}

return attributes;
}

function generatePotential(attributes: PlayerAttributes): PlayerPotential {
const attributePotentials: PlayerAttributes = {};

for (const attribute of ALL_51_ATTRIBUTES) {
const current = attributes[attribute.id] ?? 35;
const ceiling = randomInt(72, 96);
attributePotentials[attribute.id] = Math.max(
current,
Math.min(99, ceiling),
);
}

const values = Object.values(attributePotentials);
const overallPotential = Math.round(
values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1),
);

return {
overallPotential: clamp(overallPotential, 45, 96),
attributePotentials,
developmentRate: randomInt(75, 115) / 100,
consistency: randomInt(65, 95),
};
}

export function createInitialPlayer(): PlayerCareerState {
const primaryPosition: PlayerPosition = 'MC';
const archetype: PlayerArchetype = 'polyvalent';
const heightCm = 170;
const weightKg = 60;
const attributes = generateInitialAttributes(primaryPosition, archetype);
const potential = generatePotential(attributes);

const academyLevel: AcademyLevel = 'local';

return {
saveVersion: 2,
isUnlocked: true,

playerName: 'Nouveau joueur',
age: 15,
careerStage: 'academie',

season: 1,
week: 1,

physicalProfile: {
heightCm,
weightKg,
preferredFoot: 'droit',
primaryPosition,
secondaryPositions: ['MOC', 'MDC'],
archetype,
},
heightCm,
weightKg,

skillPointsAvailable: 0,
attributes,
potential,

assignedPosition: primaryPosition,
isStarter: false,

clubName: 'Académie de quartier',
clubId: 'academy-local-001',
division: 'Championnat local des jeunes',
teamStrength: 35,

coach: {
id: 'coach-001',
name: 'Coach Jean-Baptiste',
preferredFormation: '4-3-3',
tacticalStyle: 'Possession',
patienceRating: 72,
strictness: 42,
relation: 55,
},

academy: {
academyName: 'Académie de quartier',
academyLevel,
enrollmentSeason: 1,
enrollmentWeek: 1,
evaluationScore: 35,
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
lastTrainingNote: 'Bienvenue à l’académie. Commence ton développement.',

reputation: {
niveau: 5,
image: 25,
moral: 70,
followers: 0,
},

inbox: [
{
id: 'welcome-001',
from: 'coach',
season: 1,
week: 1,
title: 'Bienvenue à l’académie',
body: 'Bienvenue dans l’équipe. Travaille sérieusement, écoute les consignes et progresse chaque semaine. Ton parcours commence maintenant.',
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
lastTrainingNote: 'Tu as déjà effectué ta séance cette semaine.',
};
}

const training = TRAINING_FOCUS[focus];
const attributes = { ...player.attributes };
let note = '';

if (focus === 'repos') {
note = 'Repos effectué. Ton corps récupère avant la prochaine séance.';
} else {
const eligibleIds = ALL_51_ATTRIBUTES
.filter((attribute) => training.categories.includes(attribute.category))
.map((attribute) => attribute.id)
.filter((id) => (attributes[id] ?? 1) < (player.potential.attributePotentials[id] ?? 99))
.filter((id) => (attributes[id] ?? 1) < getAttributeCap(id, player.heightCm, player.weightKg));

if (eligibleIds.length > 0) {
const selectedId = eligibleIds[randomInt(0, eligibleIds.length - 1)];
const current = attributes[selectedId] ?? 30;
const potential = player.potential.attributePotentials[selectedId] ?? 99;
const cap = getAttributeCap(selectedId, player.heightCm, player.weightKg);

attributes[selectedId] = clamp(
current + 1,
1,
Math.min(potential, cap),
);

const selectedAttribute = ALL_51_ATTRIBUTES.find(
(attribute) => attribute.id === selectedId,
);

note = `Séance terminée : ${selectedAttribute?.name ?? 'attribut'} progresse de 1 point.`;
} else {
note = 'Séance terminée. Tes attributs ciblés ont atteint leurs limites actuelles.';
}
}

const fatigue = focus === 'repos'
? clamp(player.fatigue + training.fatigue, 0, 100)
: clamp(player.fatigue + training.fatigue, 0, 100);

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
fatigue,
skillPointsAvailable:
focus === 'repos' ? player.skillPointsAvailable : player.skillPointsAvailable + 1,
trainedThisWeek: true,
lastTrainingNote: note,
academy,
};
}

export function rollParticipation(
player: PlayerCareerState,
): Participation {
if (player.injuryWeeks > 0) return 'tribune';

const role = evaluatePlayerRole(player.attributes, player.coach);
const rating = calculatePositionRating(
player.physicalProfile.primaryPosition,
player.attributes,
);

const fatiguePenalty = Math.max(0, player.fatigue - 45) * 0.35;
const formBonus = (player.form - 50) * 0.15;
const effectiveRating = rating - fatiguePenalty + formBonus;

if (effectiveRating >= player.coach.strictness + 5 && role.isStarter) {
return Math.random() < 0.78 ? 'titulaire' : 'remplacant';
}

if (effectiveRating >= player.coach.strictness - 15) {
return Math.random() < 0.68 ? 'remplacant' : 'tribune';
}

return Math.random() < 0.25 ? 'remplacant' : 'tribune';
}

import type { PlayerCareerState, PlayerAttributes } from '../types';
import { createInitialPlayer } from '../engine';
import { ALL_51_ATTRIBUTES } from '../constants';

const STORAGE_KEY = 'fc_career_save';
const CURRENT_SAVE_VERSION = 2;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
return typeof value === 'string';
}

function normalizeAttributes(
value: unknown,
fallback: PlayerAttributes,
): PlayerAttributes {
const result: PlayerAttributes = { ...fallback };

if (!isRecord(value)) return result;

for (const attribute of ALL_51_ATTRIBUTES) {
const savedValue = value[attribute.id];

if (isNumber(savedValue)) {
result[attribute.id] = Math.max(1, Math.min(99, Math.round(savedValue)));
}
}

return result;
}

function normalizeSave(raw: unknown): PlayerCareerState | null {
if (!isRecord(raw)) return null;

const base = createInitialPlayer();
const saved = raw as UnknownRecord;

const attributes = normalizeAttributes(saved.attributes, base.attributes);

const savedPotential = isRecord(saved.potential) ? saved.potential : {};
const potentialAttributes = normalizeAttributes(
savedPotential.attributePotentials,
base.potential.attributePotentials,
);

for (const attribute of ALL_51_ATTRIBUTES) {
potentialAttributes[attribute.id] = Math.max(
attributes[attribute.id] ?? 1,
potentialAttributes[attribute.id] ?? 1,
);
}

const oldHeight = isNumber(saved.heightCm) ? saved.heightCm : base.heightCm;
const oldWeight = isNumber(saved.weightKg) ? saved.weightKg : base.weightKg;

const oldPhysicalProfile = isRecord(saved.physicalProfile)
? saved.physicalProfile
: {};

const validPositions = [
'GB', 'DD', 'DC', 'DG', 'MDC', 'MC', 'MOC', 'AD', 'AG', 'BU',
];

const primaryPosition = isString(oldPhysicalProfile.primaryPosition) &&
validPositions.includes(oldPhysicalProfile.primaryPosition)
? oldPhysicalProfile.primaryPosition
: validPositions.includes(String(saved.assignedPosition))
? String(saved.assignedPosition)
: base.physicalProfile.primaryPosition;

const preferredFoot = ['droit', 'gauche', 'ambidextre'].includes(
String(oldPhysicalProfile.preferredFoot),
)
? oldPhysicalProfile.preferredFoot as 'droit' | 'gauche' | 'ambidextre'
: base.physicalProfile.preferredFoot;

const validArchetypes = [
'technicien', 'sprinteur', 'physique', 'createur',
'finisseur', 'defenseur', 'gardien', 'polyvalent',
];

const archetype = isString(oldPhysicalProfile.archetype) &&
validArchetypes.includes(oldPhysicalProfile.archetype)
? oldPhysicalProfile.archetype as PlayerCareerState['physicalProfile']['archetype']
: base.physicalProfile.archetype;

const secondaryPositions = Array.isArray(oldPhysicalProfile.secondaryPositions)
? oldPhysicalProfile.secondaryPositions.filter(
(position): position is PlayerCareerState['physicalProfile']['primaryPosition'] =>
typeof position === 'string' && validPositions.includes(position),
)
: base.physicalProfile.secondaryPositions;

const coachRecord = isRecord(saved.coach) ? saved.coach : {};
const baseCoach = base.coach;

const coach: PlayerCareerState['coach'] = {
id: isString(coachRecord.id) ? coachRecord.id : baseCoach.id,
name: isString(coachRecord.name) ? coachRecord.name : baseCoach.name,
preferredFormation: ['4-3-3', '4-2-3-1', '3-5-2', '4-4-2'].includes(
String(coachRecord.preferredFormation),
)
? coachRecord.preferredFormation as PlayerCareerState['coach']['preferredFormation']
: ['4-3-3', '4-2-3-1', '3-5-2', '4-4-2'].includes(
String(coachRecord.formation),
)
? coachRecord.formation as PlayerCareerState['coach']['preferredFormation']
: baseCoach.preferredFormation,
tacticalStyle: ['Possession', 'Contre-attaque', 'Gegenpressing', 'Bus'].includes(
String(coachRecord.tacticalStyle),
)
? coachRecord.tacticalStyle as PlayerCareerState['coach']['tacticalStyle']
: baseCoach.tacticalStyle,
patienceRating: isNumber(coachRecord.patienceRating)
? coachRecord.patienceRating
: baseCoach.patienceRating,
strictness: isNumber(coachRecord.strictness)
? coachRecord.strictness
: baseCoach.strictness,
relation: isNumber(coachRecord.relation)
? coachRecord.relation
: baseCoach.relation,
};

const academyRecord = isRecord(saved.academy) ? saved.academy : null;
const academyLevels = ['local', 'regional', 'national', 'elite'];

const academy: PlayerCareerState['academy'] = academyRecord
? {
academyName: isString(academyRecord.academyName)
? academyRecord.academyName
: base.academy!.academyName,
academyLevel: academyLevels.includes(String(academyRecord.academyLevel))
? academyRecord.academyLevel as PlayerCareerState['academy'] extends infer A
? A extends { academyLevel: infer L } ? L : never
: never
: base.academy!.academyLevel,
enrollmentSeason: isNumber(academyRecord.enrollmentSeason)
? academyRecord.enrollmentSeason
: 1,
enrollmentWeek: isNumber(academyRecord.enrollmentWeek)
? academyRecord.enrollmentWeek
: 1,
evaluationScore: isNumber(academyRecord.evaluationScore)
? academyRecord.evaluationScore
: 35,
trialsCompleted: isNumber(academyRecord.trialsCompleted)
? academyRecord.trialsCompleted
: 0,
trainingSessionsCompleted: isNumber(academyRecord.trainingSessionsCompleted)
? academyRecord.trainingSessionsCompleted
: 0,
youthMatchesPlayed: isNumber(academyRecord.youthMatchesPlayed)
? academyRecord.youthMatchesPlayed
: 0,
promotionEligible: academyRecord.promotionEligible === true,
}
: base.academy;

const savedReputation = isRecord(saved.reputation) ? saved.reputation : {};
const savedSeasonStats = isRecord(saved.seasonStats) ? saved.seasonStats : {};
const savedCareerStats = isRecord(saved.careerStats) ? saved.careerStats : {};

const validStages = [
'academie', 'jeunes', 'reserve', 'professionnel', 'retraite',
];

const careerStage = isString(saved.careerStage) &&
validStages.includes(saved.careerStage)
? saved.careerStage as PlayerCareerState['careerStage']
: 'academie';

const potential: PlayerCareerState['potential'] = {
overallPotential: isNumber(savedPotential.overallPotential)
? Math.max(1, Math.min(99, savedPotential.overallPotential))
: base.potential.overallPotential,
attributePotentials: potentialAttributes,
developmentRate: isNumber(savedPotential.developmentRate)
? Math.max(0.5, Math.min(1.5, savedPotential.developmentRate))
: base.potential.developmentRate,
consistency: isNumber(savedPotential.consistency)
? Math.max(1, Math.min(99, savedPotential.consistency))
: base.potential.consistency,
};

const result: PlayerCareerState = {
...base,
saveVersion: CURRENT_SAVE_VERSION,
isUnlocked: saved.isUnlocked !== false,

playerName: isString(saved.playerName) && saved.playerName.trim()
? saved.playerName
: base.playerName,
age: isNumber(saved.age) ? Math.max(12, Math.min(45, saved.age)) : base.age,
careerStage,

season: isNumber(saved.season) ? Math.max(1, saved.season) : 1,
week: isNumber(saved.week) ? Math.max(1, Math.min(52, saved.week)) : 1,

physicalProfile: {
heightCm: isNumber(oldPhysicalProfile.heightCm)
? oldPhysicalProfile.heightCm
: oldHeight,
weightKg: isNumber(oldPhysicalProfile.weightKg)
? oldPhysicalProfile.weightKg
: oldWeight,
preferredFoot,
primaryPosition: primaryPosition as PlayerCareerState['physicalProfile']['primaryPosition'],
secondaryPositions,
archetype,
},
heightCm: oldHeight,
weightKg: oldWeight,

skillPointsAvailable: isNumber(saved.skillPointsAvailable)
? Math.max(0, saved.skillPointsAvailable)
: 0,
attributes,
potential,

assignedPosition: isString(saved.assignedPosition)
? saved.assignedPosition
: primaryPosition,
isStarter: saved.isStarter === true,

clubName: isString(saved.clubName) ? saved.clubName : base.clubName,
clubId: isString(saved.clubId) ? saved.clubId : base.clubId,
division: isString(saved.division) ? saved.division : base.division,
teamStrength: isNumber(saved.teamStrength) ? saved.teamStrength : base.teamStrength,

coach,

academy,
contract: isRecord(saved.contract)
? saved.contract as unknown as PlayerCareerState['contract']
: null,

activeSponsors: Array.isArray(saved.activeSponsors)
? saved.activeSponsors as PlayerCareerState['activeSponsors']
: [],

matchHistoryCount: isNumber(saved.matchHistoryCount)
? Math.max(0, saved.matchHistoryCount)
: 0,
form: isNumber(saved.form) ? Math.max(0, Math.min(100, saved.form)) : 50,
fatigue: isNumber(saved.fatigue)
? Math.max(0, Math.min(100, saved.fatigue))
: 10,
injuryWeeks: isNumber(saved.injuryWeeks)
? Math.max(0, saved.injuryWeeks)
: 0,

trainedThisWeek: saved.trainedThisWeek === true,
lastTrainingNote: isString(saved.lastTrainingNote)
? saved.lastTrainingNote
: null,

reputation: {
niveau: isNumber(savedReputation.niveau) ? savedReputation.niveau : 5,
image: isNumber(savedReputation.image) ? savedReputation.image : 25,
moral: isNumber(savedReputation.moral) ? savedReputation.moral : 70,
followers: isNumber(savedReputation.followers)
? Math.max(0, savedReputation.followers)
: 0,
},

inbox: Array.isArray(saved.inbox)
? saved.inbox as PlayerCareerState['inbox']
: base.inbox,

seasonStats: {
matches: isNumber(savedSeasonStats.matches) ? savedSeasonStats.matches : 0,
wins: isNumber(savedSeasonStats.wins) ? savedSeasonStats.wins : 0,
draws: isNumber(savedSeasonStats.draws) ? savedSeasonStats.draws : 0,
losses: isNumber(savedSeasonStats.losses) ? savedSeasonStats.losses : 0,
goals: isNumber(savedSeasonStats.goals) ? savedSeasonStats.goals : 0,
assists: isNumber(savedSeasonStats.assists) ? savedSeasonStats.assists : 0,
ratingSum: isNumber(savedSeasonStats.ratingSum) ? savedSeasonStats.ratingSum : 0,
ratedMatches: isNumber(savedSeasonStats.ratedMatches)
? savedSeasonStats.ratedMatches
: 0,
},

careerStats: {
matches: isNumber(savedCareerStats.matches) ? savedCareerStats.matches : 0,
goals: isNumber(savedCareerStats.goals) ? savedCareerStats.goals : 0,
assists: isNumber(savedCareerStats.assists) ? savedCareerStats.assists : 0,
},

pendingEvent: isRecord(saved.pendingEvent)
? saved.pendingEvent as unknown as PlayerCareerState['pendingEvent']
: null,
lastWeek: isRecord(saved.lastWeek)
? saved.lastWeek as unknown as PlayerCareerState['lastWeek']
: null,
};

return result;
}

export function saveGame(player: PlayerCareerState): boolean {
try {
if (typeof window === 'undefined') return false;

const save: PlayerCareerState = {
...player,
saveVersion: CURRENT_SAVE_VERSION,
};

window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
return true;
} catch {
return false;
}
}

export function loadGame(): PlayerCareerState | null {
try {
if (typeof window === 'undefined') return null;

const json = window.localStorage.getItem(STORAGE_KEY);
if (!json) return null;

const raw: unknown = JSON.parse(json);
const normalized = normalizeSave(raw);

if (!normalized) {
window.localStorage.removeItem(STORAGE_KEY);
return null;
}

if (normalized.saveVersion !== CURRENT_SAVE_VERSION) {
normalized.saveVersion = CURRENT_SAVE_VERSION;
}

return normalized;
} catch {
return null;
}
}

export function clearAllSaves(): void {
try {
if (typeof window !== 'undefined') {
window.localStorage.removeItem(STORAGE_KEY);
}
} catch {
// Le navigateur peut bloquer l'accès au stockage local.
}
  }

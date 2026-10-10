
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

const ATTRIBUTE_KEYWORDS: Record<PlayerPosition, string[]> = {
  GB: ["gardien", "reflex", "plonge", "prise", "detente", "sortie", "placement"],
  DD: ["vitesse", "acceleration", "endurance", "centre", "tacle", "interception", "defense"],
  DG: ["vitesse", "acceleration", "endurance", "centre", "tacle", "interception", "defense"],
  DC: ["tacle", "interception", "marquage", "placement", "force", "detente", "tete", "defense"],
  MDC: ["interception", "tacle", "placement", "passe", "vision", "endurance", "defense"],
  MC: ["passe", "vision", "controle", "dribble", "endurance", "placement", "technique"],
  MOC: ["vision", "passe", "dribble", "controle", "tir", "technique", "creativite"],
  AD: ["vitesse", "acceleration", "dribble", "centre", "tir", "agilite", "technique"],
  AG: ["vitesse", "acceleration", "dribble", "centre", "tir", "agilite", "technique"],
  BU: ["finition", "tir", "placement", "puissance", "detente", "tete", "sangfroid"],
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

function getAttributeValue(
  attributes: PlayerAttributes,
  keywords: string[],
): number {
  const matching = ALL_51_ATTRIBUTES.filter((attribute) => {
    const searchable = normalize(`${attribute.id} ${attribute.name}`);
    return keywords.some((keyword) => searchable.includes(normalize(keyword)));
  });

  if (matching.length === 0) return 45;

  const uniqueIds = Array.from(new Set(matching.map((attribute) => attribute.id)));

  return (
    uniqueIds.reduce(
      (sum, id) => sum + clamp(attributes[id] ?? 45),
      0,
    ) / uniqueIds.length
  );
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
    "GB", "DD", "DC", "DG", "MDC",
    "MC", "MOC", "AD", "AG", "BU",
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
    name.includes("jeu aerien");

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
  const positionKeywords = ATTRIBUTE_KEYWORDS[position] ?? [];
  const archetypeKeywords = ARCHETYPE_KEYWORDS[archetype];

  const ageModifier = clamp((age - 15) * 1.2, -3, 4);

  for (const attribute of ALL_51_ATTRIBUTES) {
    const searchable = normalize(`${attribute.id} ${attribute.name}`);

    let min = 27 + ageModifier;
    let max = 55 + ageModifier;

    const isPositionRelevant = positionKeywords.some((keyword) =>
      searchable.includes(normalize(keyword)),
    );

    const isArchetypeRelevant = archetypeKeywords.some((keyword) =>
      searchable.includes(normalize(keyword)),
    );

    if (isPositionRelevant) {
      min += 7;
      max += 8;
    }

    if (isArchetypeRelevant) {
      min += 4;
      max += 7;
    }

    if (isPositionRelevant && isArchetypeRelevant) {
      max += 2;
    }

    if (attribute.category === "Gardien" && position !== "GB") {
      min = 10 + Math.max(0, age - 15);
      max = 28 + Math.max(0, age - 15);
    }

    if (attribute.category !== "Gardien" && position === "GB") {
      min = 22 + ageModifier;
      max = 48 + ageModifier;
    }

    const physicalModifier = getPhysicalModifier(
      `${attribute.id} ${attribute.name}`,
      heightCm,
      weightKg,
    );

    min += physicalModifier;
    max += physicalModifier;

    const lower = clamp(Math.round(min), 5, 75);
    const upper = clamp(Math.round(max), lower, 85);

    attributes[attribute.id] = randomInt(lower, upper);
  }

  return attributes;
}

function generatePotential(
  attributes: PlayerAttributes,
  age: number,
): PlayerPotential {
  const attributePotentials: PlayerAttributes = {};

  const ageAdjustment = clamp((16 - age) * 1.5, -3, 4);

  for (const attribute of ALL_51_ATTRIBUTES) {
    const current = attributes[attribute.id] ?? 35;
    const ceiling = randomInt(
      clamp(72 + ageAdjustment, 65, 88),
      clamp(96 + ageAdjustment, 85, 99),
    );

    attributePotentials[attribute.id] = Math.max(
      current,
      Math.min(99, ceiling),
    );
  }

  const values = Object.values(attributePotentials);
  const overallPotential = Math.round(
    values.reduce((sum, value) => sum + value, 0) /
      Math.max(values.length, 1),
  );

  return {
    overallPotential: clamp(overallPotential, 45, 96),
    attributePotentials,
    developmentRate: clamp(
      randomInt(75, 115) / 100 + Math.max(0, 16 - age) * 0.015,
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

  const potential = generatePotential(attributes, age);

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
    lastTrainingNote: "Bienvenue à l’académie. Commence ton développement.",

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
  let note = "";

  if (focus === "repos") {
    note = "Repos effectué. Ton corps récupère avant la prochaine séance.";
  } else {
    const eligibleIds = ALL_51_ATTRIBUTES
      .filter((attribute) =>
        training.categories.includes(attribute.category),
      )
      .map((attribute) => attribute.id)
      .filter(
        (id) =>
          (attributes[id] ?? 1) <
          (player.potential.attributePotentials[id] ?? 99),
      )
      .filter(
        (id) =>
          (attributes[id] ?? 1) <
          getAttributeCap(id, player.heightCm, player.weightKg),
      );

    if (eligibleIds.length > 0) {
      const selectedId =
        eligibleIds[randomInt(0, eligibleIds.length - 1)];

      const current = attributes[selectedId] ?? 30;
      const potential =
        player.potential.attributePotentials[selectedId] ?? 99;
      const cap = getAttributeCap(
        selectedId,
        player.heightCm,
        player.weightKg,
      );

      attributes[selectedId] = clamp(
        current + 1,
        1,
        Math.min(potential, cap),
      );

      const selectedAttribute = ALL_51_ATTRIBUTES.find(
        (attribute) => attribute.id === selectedId,
      );

      note = `Séance terminée : ${
        selectedAttribute?.name ?? "attribut"
      } progresse de 1 point.`;
    } else {
      note =
        "Séance terminée. Tes attributs ciblés ont atteint leurs limites actuelles.";
    }
  }

  const fatigue = clamp(
    player.fatigue + training.fatigue,
    0,
    100,
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
    fatigue,
    skillPointsAvailable:
      focus === "repos"
        ? player.skillPointsAvailable
        : player.skillPointsAvailable + 1,
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

  const fatiguePenalty =
    Math.max(0, player.fatigue - 45) * 0.35;

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

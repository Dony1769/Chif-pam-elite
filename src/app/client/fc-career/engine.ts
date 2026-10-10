export function trainWeek(
  player: PlayerCareerState,
  focus: TrainingFocus
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

  // Le repos récupère la fatigue sans progression d'attribut
  // ni incrémentation du compteur de séances d'entraînement.
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

  // Sélection des attributs pouvant encore progresser.
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
      player.weightKg
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
    // Le poste influence les probabilités de progression.
    const position = player.physicalProfile.primaryPosition;
    const positionWeights = POSITION_WEIGHTS[position] ?? {};

    // L'archétype favorise les attributs correspondant au profil du joueur.
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

    const preferredIds =
      archetypeAttributeIds[player.physicalProfile.archetype] ?? [];

    // Pondération selon le poste et l'archétype.
    const weighted = eligible.map((attribute) => ({
      id: attribute.id,
      weight:
        1 +
        (positionWeights[attribute.id] ?? 0) * 0.2 +
        (preferredIds.includes(attribute.id) ? 2 : 0),
    }));

    const totalWeight = weighted.reduce(
      (sum, item) => sum + item.weight,
      0
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
      player.weightKg
    );

    // Les jeunes joueurs et les joueurs à fort potentiel
    // ont davantage de chances de gagner deux points.
    const age = player.age;
    const developmentRate =
      player.potential.developmentRate ?? 1;

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

    const fatiguePenalty = Math.max(
      0,
      (fatigue - 30) / 100
    );

    const extraPointChance = Math.max(
      0.05,
      Math.min(
        0.85,
        0.25 +
          (developmentRate - 1) * 0.35 +
          ageBonus -
          fatiguePenalty
      )
    );

    const gain =
      fatigue >= 75
        ? 1
        : Math.random() < extraPointChance
          ? 2
          : 1;

    // La progression ne dépasse jamais le potentiel ni la limite physique.
    const newValue = Math.min(
      current + gain,
      potential,
      physicalCap
    );

    attributes[selectedId] = newValue;

    const selectedAttribute = ALL_51_ATTRIBUTES.find(
      (attribute) => attribute.id === selectedId
    );

    const actualGain = newValue - current;

    note =
      `Séance terminée : ${selectedAttribute?.name ?? selectedId} ` +
      `progresse de ${actualGain} point${actualGain > 1 ? "s" : ""}.`;
  }

  // Application de la fatigue de la séance.
  const newFatigue = Math.max(
    0,
    Math.min(100, player.fatigue + training.fatigue)
  );

  // Seules les séances d'entraînement normales sont comptabilisées.
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
    skillPointsAvailable: player.skillPointsAvailable,
    trainedThisWeek: true,
    lastTrainingNote: note,
    academy,
  };
}

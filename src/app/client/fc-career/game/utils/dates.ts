/**
 * FC CAREER — Utilitaires de dates de jeu
 */

/** Convertit une semaine de jeu (1-38) en mois fictif */
export function weekToMonth(week: number): string {
  const months = [
    "Août","Août","Septembre","Septembre","Septembre",
    "Octobre","Octobre","Octobre","Novembre","Novembre",
    "Novembre","Décembre","Décembre","Janvier","Janvier",
    "Janvier","Février","Février","Mars","Mars",
    "Mars","Avril","Avril","Avril","Mai","Mai",
    "Mai","Juin","Juin","Juin","Juillet","Juillet",
    "Juillet","Juillet","Juillet","Juillet","Juillet","Juillet",
  ];
  return months[Math.max(0, Math.min(week - 1, 37))];
}

/** Calcule l'âge du joueur en fonction de la saison actuelle */
export function playerAge(birthAge: number, currentSeason: number, careerStartSeason = 1): number {
  return birthAge + (currentSeason - careerStartSeason);
}

/** Étiquette lisible pour une saison : 1 → "Saison 1 (2025-26)" */
export function seasonLabel(season: number, baseYear = 2025): string {
  const y = baseYear + season - 1;
  return `Saison ${season} (${y}-${String(y + 1).slice(2)})`;
}

// /src/services/matchEngine.t

import type { FootballMatchRaw } from './fetchFootballMatches'; // Ajuste le chemin si nécessaire

// ============================================================================
// TYPES STRICTS
// ============================================================================

export interface MatchEngineOutput {
  expected_goals_home: number;
  expected_goals_away: number;
  probability_home: number;
  probability_draw: number;
  probability_away: number;
  over25_prob: number;
}

// ============================================================================
// FONCTIONS MATHÉMATIQUES (PURES)
// ============================================================================

/**
 * Calcule la factorielle d'un entier (n!)
 */
const factorial = (n: number): number => {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
};

/**
 * Calcule la probabilité de marquer k buts avec une espérance lambda (Loi de Poisson)
 */
const poisson = (k: number, lambda: number): number => {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
};

// ============================================================================
// LOGIQUE MÉTIER DÉTERMINISTE
// ============================================================================

/**
 * Génère une force d'équipe déterministe basée uniquement sur son ID.
 * Ne fait appel à aucun random. Un ID donné retournera toujours la même force.
 * Retourne une valeur de base entre 0.8 et 2.3 buts.
 */
const generateDeterministicStrength = (teamId: number): number => {
  // Utilisation d'un modulo asymétrique pour simuler une distribution de niveaux
  const pseudoHash = (teamId * 137) % 150; 
  return 0.8 + (pseudoHash / 100);
};

/**
 * Analyse un match brut et génère des probabilités mathématiques déterministes.
 * * @param match Objet brut issu de l'API Football
 * @returns {MatchEngineOutput} xG et probabilités (Home, Draw, Away, Over 2.5)
 */
export const analyzeMatch = (match: FootballMatchRaw): MatchEngineOutput => {
  // 1. Calcul des Expected Goals (xG) de manière 100% déterministe
  const baseHomeStrength = generateDeterministicStrength(match.teams.home.id);
  const baseAwayStrength = generateDeterministicStrength(match.teams.away.id);

  // Application de l'avantage du terrain (Home Advantage : +15% pour domicile, -5% pour extérieur)
  const xgHomeRaw = baseHomeStrength * 1.15;
  const xgAwayRaw = baseAwayStrength * 0.95;

  let probHome = 0;
  let probDraw = 0;
  let probAway = 0;
  let probOver25 = 0;

  // 2. Matrice de Poisson (Simulation des scores de 0-0 à 7-7)
  const MAX_GOALS = 7;

  for (let homeGoals = 0; homeGoals <= MAX_GOALS; homeGoals++) {
    for (let awayGoals = 0; awayGoals <= MAX_GOALS; awayGoals++) {
      // Probabilité de ce score exact
      const probScoreExact = poisson(homeGoals, xgHomeRaw) * poisson(awayGoals, xgAwayRaw);

      // Agrégation 1X2
      if (homeGoals > awayGoals) {
        probHome += probScoreExact;
      } else if (homeGoals === awayGoals) {
        probDraw += probScoreExact;
      } else {
        probAway += probScoreExact;
      }

      // Agrégation Over 2.5
      if (homeGoals + awayGoals > 2) {
        probOver25 += probScoreExact;
      }
    }
  }

  // 3. Normalisation (Assurer que la somme 1X2 = 1.0)
  const totalProb = probHome + probDraw + probAway;
  
  // 4. Formatage et retour strict
  return {
    expected_goals_home: parseFloat(xgHomeRaw.toFixed(2)),
    expected_goals_away: parseFloat(xgAwayRaw.toFixed(2)),
    probability_home: parseFloat(((probHome / totalProb) * 100).toFixed(2)),
    probability_draw: parseFloat(((probDraw / totalProb) * 100).toFixed(2)),
    probability_away: parseFloat(((probAway / totalProb) * 100).toFixed(2)),
    over25_prob: parseFloat((probOver25 * 100).toFixed(2)),
  };
};

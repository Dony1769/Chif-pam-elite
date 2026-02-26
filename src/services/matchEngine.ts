// /services/matchEngine.ts

/**
 * Interface d'entrée provenant théoriquement de fetchMatches.ts
 * Contient les données de base pour estimer les xG.
 */
export interface RawMatchData {
  id: string; // Utile pour le tracking, mais non utilisé dans le calcul
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  // Les xG peuvent être pré-calculés par l'API, ou nous les estimons
  estimated_xg_home?: number; 
  estimated_xg_away?: number;
}

/**
 * Interface de sortie strictement alignée avec la table `pari_predictions`
 */
export interface PariPredictionOutput {
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  expected_goals_home: number;
  expected_goals_away: number;
  probability_home: number;
  probability_draw: number;
  probability_away: number;
  over25_prob: number;
  // Initialisés par défaut pour le matchEngine, le valueEngine les modifiera
  value_home: boolean;
  value_draw: boolean;
  value_away: boolean;
  value_detected: boolean;
}

// --- FONCTIONS MATHÉMATIQUES PURS ---

/**
 * Calcule la factorielle d'un nombre (n!)
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
 * Applique la distribution de Poisson
 * @param k Nombre de buts (x dans la formule)
 * @param lambda Expected goals (λ dans la formule)
 */
const poisson = (k: number, lambda: number): number => {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
};

// --- MOTEUR PRINCIPAL ---

/**
 * Analyse un match, simule les probabilités et retourne l'objet pour la BDD.
 * @param match Les données brutes du match
 * @returns PariPredictionOutput
 */
export const analyzeMatch = (match: RawMatchData): PariPredictionOutput => {
  // 1. Estimation des xG (Si non fournis par l'API, on applique un fallback statistique basique)
  // Dans un modèle réel, ces xG seraient calculés via la force d'attaque/défense historique.
  const xgHome = match.estimated_xg_home ?? 1.45; // Avantage terrain statistique
  const xgAway = match.estimated_xg_away ?? 1.15;

  let probHome = 0;
  let probDraw = 0;
  let probAway = 0;
  let probUnder25 = 0;

  // 2. Création de la matrice de scores (Limité à 7 buts par équipe, au-delà la proba est négligeable)
  const MAX_GOALS = 7;

  for (let i = 0; i <= MAX_GOALS; i++) { // i = buts de l'équipe à domicile
    for (let j = 0; j <= MAX_GOALS; j++) { // j = buts de l'équipe à l'extérieur
      // Probabilité que ce score exact (i - j) se produise
      const probScoreExact = poisson(i, xgHome) * poisson(j, xgAway);

      // Calcul 1X2
      if (i > j) {
        probHome += probScoreExact;
      } else if (i === j) {
        probDraw += probScoreExact;
      } else {
        probAway += probScoreExact;
      }

      // Calcul Under 2.5 (Si i + j <= 2)
      if (i + j <= 2) {
        probUnder25 += probScoreExact;
      }
    }
  }

  // Normalisation des probabilités (pour s'assurer que la somme 1X2 fasse exactement 1 ou 100%)
  const totalProb = probHome + probDraw + probAway;
  const normalizedHome = (probHome / totalProb) * 100;
  const normalizedDraw = (probDraw / totalProb) * 100;
  const normalizedAway = (probAway / totalProb) * 100;
  
  // Calcul de l'Over 2.5
  const over25Prob = (1 - probUnder25) * 100;

  // 3. Retourne l'objet structuré
  return {
    home_team: match.home_team,
    away_team: match.away_team,
    league: match.league,
    match_date: match.match_date,
    expected_goals_home: parseFloat(xgHome.toFixed(2)),
    expected_goals_away: parseFloat(xgAway.toFixed(2)),
    probability_home: parseFloat(normalizedHome.toFixed(2)),
    probability_draw: parseFloat(normalizedDraw.toFixed(2)),
    probability_away: parseFloat(normalizedAway.toFixed(2)),
    over25_prob: parseFloat(over25Prob.toFixed(2)),
    // Valeurs par défaut, le module valueEngine s'en chargera
    value_home: false,
    value_draw: false,
    value_away: false,
    value_detected: false,
  };
};

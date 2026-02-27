// /src/services/valueEngine.t

// ============================================================================
// INTERFACES ET TYPAGE STRICT
// ============================================================================

export interface ModelProbabilities {
  /** Probabilité estimée en décimal (entre 0 et 1) */
  home: number;
  draw: number;
  away: number;
}

export interface BookmakerOdds {
  /** Cote décimale proposée par le bookmaker (strictement supérieure à 1.00) */
  home: number;
  draw: number;
  away: number;
}

export interface ValueEngineOutput {
  value_home: boolean;
  value_draw: boolean;
  value_away: boolean;
  value_detected: boolean;
  edge_home: number;
  edge_draw: number;
  edge_away: number;
}

// ============================================================================
// FONCTION PURE DE DÉTECTION DE VALEUR
// ============================================================================

/**
 * Compare les probabilités d'un modèle mathématique aux cotes d'un bookmaker
 * pour détecter un avantage statistique (Value Bet).
 * Fonction pure : conserve la précision native JS sans arrondis.
 * * @param modelProbabilities Probabilités calculées par le moteur (ex: 0.52)
 * @param bookmakerOdds Cotes décimales du marché (ex: 2.10)
 * @returns {ValueEngineOutput} Les edges réels et les drapeaux de détection
 */
export const detectValue = (
  modelProbabilities: ModelProbabilities,
  bookmakerOdds: BookmakerOdds
): ValueEngineOutput => {
  
  // 1. Calcul des probabilités implicites (Implied Probability)
  const impliedHome = 1 / bookmakerOdds.home;
  const impliedDraw = 1 / bookmakerOdds.draw;
  const impliedAway = 1 / bookmakerOdds.away;

  // 2. Calcul de l'avantage (Edge réel)
  const edgeHome = modelProbabilities.home - impliedHome;
  const edgeDraw = modelProbabilities.draw - impliedDraw;
  const edgeAway = modelProbabilities.away - impliedAway;

  // 3. Détermination de la valeur (Value Bet si Edge > 0)
  const valueHome = edgeHome > 0;
  const valueDraw = edgeDraw > 0;
  const valueAway = edgeAway > 0;

  // 4. Synthèse globale (True si au moins un des 3 résultats a de la valeur)
  const valueDetected = valueHome || valueDraw || valueAway;

  return {
    value_home: valueHome,
    value_draw: valueDraw,
    value_away: valueAway,
    value_detected: valueDetected,
    edge_home: edgeHome,
    edge_draw: edgeDraw,
    edge_away: edgeAway,
  };
};

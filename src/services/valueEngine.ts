// /services/valueEngine.ts

export interface EdgeResult {
  edge_percent: number;
  isValue: boolean;
}

/**
 * Calcule l'avantage (Edge) mathématique sur une cote donnée.
 * * @param probability Probabilité estimée par notre modèle (accepte les formats 0.53 ou 53.0)
 * @param odds Cote décimale proposée par le bookmaker (ex: 2.10)
 * @returns Un objet contenant l'edge en pourcentage et l'indicateur de Value Bet.
 */
export const calculateEdge = (probability: number, odds: number): EdgeResult => {
  // 1. Sécurisation des données entrantes
  if (probability < 0 || odds <= 1) {
    return { edge_percent: 0, isValue: false };
  }

  // 2. Normalisation de la probabilité en décimale (0 à 1)
  // Si la probabilité reçue est supérieure à 1, on assume qu'elle est en pourcentage (ex: 53.4)
  const probDecimal = probability > 1 ? probability / 100 : probability;

  // 3. Application de la formule de l'Expected Value
  const rawEdge = (probDecimal * odds - 1) * 100;

  // 4. Arrondi professionnel à 2 décimales
  const edgePercent = parseFloat(rawEdge.toFixed(2));

  // 5. Un pari est considéré comme "Value" si l'Edge est strictement supérieur à 0
  return {
    edge_percent: edgePercent,
    isValue: edgePercent > 0,
  };
};

/**
 * (Fonction utilitaire bonus)
 * Compare les cotes d'un match entier et met à jour l'objet pour la base de données.
 */
export const evaluateMatchValues = (
  matchProbs: { home: number; draw: number; away: number },
  bookmakerOdds: { home: number; draw: number; away: number }
) => {
  const homeEdge = calculateEdge(matchProbs.home, bookmakerOdds.home);
  const drawEdge = calculateEdge(matchProbs.draw, bookmakerOdds.draw);
  const awayEdge = calculateEdge(matchProbs.away, bookmakerOdds.away);

  // Détection globale si au moins un des trois résultats présente de la valeur
  const valueDetected = homeEdge.isValue || drawEdge.isValue || awayEdge.isValue;

  // Détermination du meilleur "Pick" (celui avec le plus grand Edge)
  let bestPick = '';
  let highestEdge = 0;

  if (homeEdge.isValue && homeEdge.edge_percent > highestEdge) {
    bestPick = 'Home';
    highestEdge = homeEdge.edge_percent;
  }
  if (drawEdge.isValue && drawEdge.edge_percent > highestEdge) {
    bestPick = 'Draw';
    highestEdge = drawEdge.edge_percent;
  }
  if (awayEdge.isValue && awayEdge.edge_percent > highestEdge) {
    bestPick = 'Away';
    highestEdge = awayEdge.edge_percent;
  }

  return {
    value_home: homeEdge.isValue,
    value_draw: drawEdge.isValue,
    value_away: awayEdge.isValue,
    value_detected: valueDetected,
    best_edge: highestEdge,
    best_pick: bestPick
  };
};


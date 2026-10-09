import { ALL_51_ATTRIBUTES } from './constants';
import { PlayerAttributes, CoachProfile } from './types';

// CALCUL DU CAP MAXIMUM (Biomécanique)
export function getAttributeCap(attrId: string, heightCm: number, weightKg: number): number {
  // Les joueurs lourds ou très grands subissent des limites d'accélération et agilité
  if (attrId === 'acceleration' || attrId === 'agilite') {
    if (weightKg > 85 || heightCm > 190) {
      const penalty = Math.floor((weightKg - 75) * 0.8 + (heightCm - 180) * 0.5);
      return Math.max(65, 99 - penalty);
    }
  }
  // Les joueurs plus légers subissent une limite de Force pure
  if (attrId === 'force' && weightKg < 70) {
    return Math.min(78, 55 + (weightKg - 50) * 1.1);
  }
  return 99; // Cap par défaut
}

// SYNERGIE DES ATTRIBUTS : Calcul de la valeur réelle d'un poste
export function calculatePositionRating(position: string, attrs: PlayerAttributes): number {
  const getVal = (id: string) => attrs[id] || 40;

  switch (position) {
    case 'BU': {
      // Pour être un grand Buteur, la Finition seule ne suffit pas !
      const finition = getVal('finition');
      const placement = getVal('placement_offensif');
      const calme = getVal('calme');
      const puissance = getVal('puissance_tir');
      const reactivite = getVal('reactivite');

      // Pondération : Finition (30%), Placement (25%), Calme (20%), Puissance (15%), Réactivité (10%)
      const rating = (finition * 0.3) + (placement * 0.25) + (calme * 0.20) + (puissance * 0.15) + (reactivite * 0.10);
      return Math.round(rating);
    }
    case 'MOC': {
      const vista = getVal('vista');
      const passesC = getVal('passes_courtes');
      const controle = getVal('controle');
      const dribble = getVal('dribble');
      const tirsL = getVal('tirs_lointains');
      return Math.round((vista * 0.3) + (passesC * 0.25) + (controle * 0.2) + (dribble * 0.15) + (tirsL * 0.1));
    }
    case 'DC': {
      const tackle = getVal('tackle_debout');
      const marquage = getVal('marquage');
      const force = getVal('force');
      const placementDef = getVal('placement_defensif');
      const detente = getVal('detente');
      return Math.round((tackle * 0.25) + (marquage * 0.25) + (force * 0.2) + (placementDef * 0.2) + (detente * 0.1));
    }
    default:
      return 50;
  }
}

// CHOIX DU COACH POUR LE POSTE ET TITULARISATION
export function evaluatePlayerRole(attrs: PlayerAttributes, coach: CoachProfile): { assignedPosition: string; isStarter: boolean; overallRating: number } {
  const buRating = calculatePositionRating('BU', attrs);
  const mocRating = calculatePositionRating('MOC', attrs);
  const dcRating = calculatePositionRating('DC', attrs);

  let bestPosition = 'BU';
  let bestScore = buRating;

  if (mocRating > bestScore) {
    bestPosition = 'MOC';
    bestScore = mocRating;
  }
  if (dcRating > bestScore) {
    bestPosition = 'DC';
    bestScore = dcRating;
  }

  // Le coach décide si tu es titulaire selon ses exigences
  const isStarter = bestScore >= coach.strictness;

  return {
    assignedPosition: bestPosition,
    isStarter,
    overallRating: bestScore
  };
}

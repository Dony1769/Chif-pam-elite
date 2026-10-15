/** Noms d'affichage : gère les joueurs connus sous un seul nom (prénom vide). */
export interface Named { firstName: string; lastName: string }
export const fullName = (p: Named) => (p.firstName ? `${p.firstName} ${p.lastName}` : p.lastName).trim();
export const shortName = (p: Named) => (p.firstName ? `${p.firstName.charAt(0)}. ${p.lastName}` : p.lastName).trim();

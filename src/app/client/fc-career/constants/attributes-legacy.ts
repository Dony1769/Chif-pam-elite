import type { AttributeDefinition } from "../types/legacy";

export const ALL_51_ATTRIBUTES: AttributeDefinition[] = [
  // ATTAQUE (9)
  { id: 'finition', name: 'Finition', category: 'Attaque', description: 'Précision des tirs dans la surface' },
  { id: 'puissance_tir', name: 'Puissance de tir', category: 'Attaque', description: 'Force pure lors de la frappe' },
  { id: 'tirs_lointains', name: 'Tirs lointains', category: 'Attaque', description: 'Efficacité hors de la surface' },
  { id: 'reprise_volee', name: 'Reprises de volée', category: 'Attaque', description: 'Frappes instinctives' },
  { id: 'penaltys', name: 'Pénaltys', category: 'Attaque', description: 'Calme au point de pénalty' },
  { id: 'placement_offensif', name: 'Placement offensif', category: 'Attaque', description: 'Capacité à se libérer' },
  { id: 'effets', name: 'Effet / Enroulé', category: 'Attaque', description: 'Courbure donnée au ballon' },
  { id: 'coup_franc', name: 'Coups francs', category: 'Attaque', description: 'Précision sur balle arrêtée' },
  { id: 'tete_offensive', name: 'Tête offensive', category: 'Attaque', description: 'Précision des coups de tête' },

  // TECHNIQUE & PASSES (10)
  { id: 'dribble', name: 'Dribbles', category: 'Technique & Passes', description: 'Maniement du ballon à vitesse' },
  { id: 'controle', name: 'Contrôle de balle', category: 'Technique & Passes', description: 'Qualité première touche' },
  { id: 'passes_courtes', name: 'Passes courtes', category: 'Technique & Passes', description: 'Précision jeu au sol' },
  { id: 'passes_longues', name: 'Passes longues', category: 'Technique & Passes', description: 'Ouvertures' },
  { id: 'centres', name: 'Centres', category: 'Technique & Passes', description: 'Ballons dans la surface' },
  { id: 'vista', name: 'Vista / Panache', category: 'Technique & Passes', description: 'Passes imprévisibles' },
  { id: 'mauvais_pied', name: 'Mauvais pied', category: 'Technique & Passes', description: 'Qualité pied faible' },
  { id: 'gestes_techniques', name: 'Gestes techniques', category: 'Technique & Passes', description: 'Fentes et feintes' },
  { id: 'conduite_balle', name: 'Conduite sous pression', category: 'Technique & Passes', description: 'Ballon au pied' },
  { id: 'finesse_passe', name: 'Passes en profondeur', category: 'Technique & Passes', description: 'Dosage coupants' },

  // PHYSIQUE & MOTEUR (10)
  { id: 'acceleration', name: 'Accélération', category: 'Physique & Moteur', description: 'Vitesse de démarrage' },
  { id: 'vitesse', name: 'Vitesse de pointe', category: 'Physique & Moteur', description: 'Vitesse maximale' },
  { id: 'agilite', name: 'Agilité', category: 'Physique & Moteur', description: 'Changement de direction' },
  { id: 'equilibre', name: 'Équilibre', category: 'Physique & Moteur', description: 'Résistance au duel' },
  { id: 'reactivite', name: 'Réactivité', category: 'Physique & Moteur', description: 'Temps de réponse' },
  { id: 'detente', name: 'Détente verticale', category: 'Physique & Moteur', description: 'Hauteur de saut' },
  { id: 'endurance', name: 'Endurance', category: 'Physique & Moteur', description: 'Maintien de la forme' },
  { id: 'force', name: 'Force physique', category: 'Physique & Moteur', description: 'Puissance musculaire' },
  { id: 'agressivite', name: 'Agressivité', category: 'Physique & Moteur', description: 'Engagement duels' },
  { id: 'resilience', name: 'Résistance blessures', category: 'Physique & Moteur', description: 'Solidité physique' },

  // MENTAL & TACTIQUE (8)
  { id: 'calme', name: 'Calme / Sang-froid', category: 'Mental & Tactique', description: 'Maintien sous pression' },
  { id: 'lecture_jeu', name: 'Vision / Lecture du jeu', category: 'Mental & Tactique', description: 'Anticipation' },
  { id: 'discipline', name: 'Discipline tactique', category: 'Mental & Tactique', description: 'Respect consignes' },
  { id: 'leadership', name: 'Leadership', category: 'Mental & Tactique', description: 'Influence équipe' },
  { id: 'composure_def', name: 'Sang-froid défensif', category: 'Mental & Tactique', description: 'Gestion attaques' },
  { id: 'concentration', name: 'Concentration', category: 'Mental & Tactique', description: 'Évite les erreurs' },
  { id: 'determination', name: 'Détermination', category: 'Mental & Tactique', description: 'Elève niveau' },
  { id: 'placement_defensif', name: 'Placement défensif', category: 'Mental & Tactique', description: 'Couverture espaces' },

  // DÉFENSE (8)
  { id: 'tackle_debout', name: 'Tacle debout', category: 'Défense', description: 'Interception propre' },
  { id: 'tackle_glisse', name: 'Tacle glissé', category: 'Défense', description: 'Dernière chance' },
  { id: 'interceptions', name: 'Interceptions', category: 'Défense', description: 'Coupure lignes passe' },
  { id: 'marquage', name: 'Marquage individuel', category: 'Défense', description: 'Suivi attaquant' },
  { id: 'jeu_de_tete_def', name: 'Jeu de tête défensif', category: 'Défense', description: 'Dégagements aériens' },
  { id: 'blocage', name: 'Blocage de tir', category: 'Défense', description: 'Interposition' },
  { id: 'protection_balle', name: 'Protection de balle', category: 'Défense', description: 'Corps masque ballon' },
  { id: 'charge', name: 'Charge d\'épaule', category: 'Défense', description: 'Dépossession duel' },

  // GARDIEN (6)
  { id: 'gb_plongeon', name: 'Plongeon GB', category: 'Gardien', description: 'Portée de saut' },
  { id: 'gb_jeu_main', name: 'Jeu à la main GB', category: 'Gardien', description: 'Prise et relances' },
  { id: 'gb_degagement', name: 'Dégagement GB', category: 'Gardien', description: 'Renvois au pied' },
  { id: 'gb_reflexes', name: 'Réflexes GB', category: 'Gardien', description: 'Arrêts réflexes' },
  { id: 'gb_positionnement', name: 'Positionnement GB', category: 'Gardien', description: 'Fermeture angles' },
  { id: 'gb_sorties', name: 'Sorties dans les pieds', category: 'Gardien', description: 'Prise décision' },
];

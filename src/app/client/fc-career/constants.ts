import { AttributeDefinition } from './types';

export const ALL_51_ATTRIBUTES: AttributeDefinition[] = [
  // --- ATTAQUE (9) ---
  { id: 'finition', name: 'Finition', category: 'Attaque', description: 'Précision des tir dans la surface' },
  { id: 'puissance_tir', name: 'Puissance de tir', category: 'Attaque', description: 'Force pure lors de la frappe' },
  { id: 'tirs_lointains', name: 'Tirs lointains', category: 'Attaque', description: 'Efficacité hors de la surface' },
  { id: 'reprise_volee', name: 'Reprises de volée', category: 'Attaque', description: 'Frappes instinctives sans contrôle' },
  { id: 'penaltys', name: 'Pénaltys', category: 'Attaque', description: 'Calme et précision au point de pénalty' },
  { id: 'placement_offensif', name: 'Placement offensif', category: 'Attaque', description: 'Capacité à se libérer des marquages' },
  { id: 'effets', name: 'Effet / Enroulé', category: 'Attaque', description: 'Courbure donnée au ballon' },
  { id: 'coup_franc', name: 'Coups francs', category: 'Attaque', description: 'Précision sur balle arrêtée' },
  { id: 'tete_offensive', name: 'Tête offensive', category: 'Attaque', description: 'Précision des coups de tête au but' },

  // --- TECHNIQUE & PASSES (10) ---
  { id: 'dribble', name: 'Dribbles', category: 'Technique & Passes', description: 'Maniement du ballon à haute vitesse' },
  { id: 'controle', name: 'Contrôle de balle', category: 'Technique & Passes', description: 'Qualité de la première touche' },
  { id: 'passes_courtes', name: 'Passes courtes', category: 'Technique & Passes', description: 'Précision et vitesse du jeu au sol' },
  { id: 'passes_longues', name: 'Passes longues', category: 'Technique & Passes', description: 'Ouverture et transversales' },
  { id: 'centres', name: 'Centres', category: 'Technique & Passes', description: 'Qualité des ballons envoyés dans la surface' },
  { id: 'vista', name: 'Vista / Panache', category: 'Technique & Passes', description: 'Capacité à tenter des passes imprévisibles' },
  { id: 'mauvais_pied', name: 'Utilisation mauvais pied', category: 'Technique & Passes', description: 'Qualité du pied faible' },
  { id: 'gestes_techniques', name: 'Gestes techniques', category: 'Technique & Passes', description: 'Aisance pour effectuer des fentes et feintes' },
  { id: 'conduite_balle', name: 'Conduite sous pression', category: 'Technique & Passes', description: 'Garder le ballon collé au pied' },
  { id: 'finesse_passe', name: 'Passes en profondeur', category: 'Technique & Passes', description: 'Dosage des ballons coupants' },

  // --- PHYSIQUE & MOTEUR (10) ---
  { id: 'acceleration', name: 'Accélération', category: 'Physique & Moteur', description: 'Capacité à atteindre sa vitesse maximale rapidement' },
  { id: 'vitesse', name: 'Vitesse de pointe', category: 'Physique & Moteur', description: 'Vitesse maximale de course' },
  { id: 'agilite', name: 'Agilité', category: 'Physique & Moteur', description: 'Capacité à changer de direction promptement' },
  { id: 'equilibre', name: 'Équilibre', category: 'Physique & Moteur', description: 'Résistance aux duels au coude à coude' },
  { id: 'reactivite', name: 'Réactivité', category: 'Physique & Moteur', description: 'Temps de réponse aux événements du match' },
  { id: 'detente', name: 'Détente verticale', category: 'Physique & Moteur', description: 'Hauteur d saut' },
  { id: 'endurance', name: 'Endurance', category: 'Physique & Moteur', description: 'Maintien de la forme au fil des minutes' },
  { id: 'force', name: 'Force physique', category: 'Physique & Moteur', description: 'Puissance musculaire pure' },
  { id: 'agressivite', name: 'Agressivité', category: 'Physique & Moteur', description: 'Engagement dans les duels' },
  { id: 'resilience', name: 'Résistance aux blessures', category: 'Physique & Moteur', description: 'Solidité physique globale' },

  // --- MENTAL & TACTIQUE (8) ---
  { id: 'calme', name: 'Calme / Sang-froid', category: 'Mental & Tactique', description: 'Maintien des capacités sous pression intense' },
  { id: 'lecture_jeu', name: 'Vision / Lecture du jeu', category: 'Mental & Tactique', description: 'Anticipation des trajectoires et mouvements' },
  { id: 'discipline', name: 'Discipline tactique', category: 'Mental & Tactique', description: 'Respect des consignes fixées par le coach' },
  { id: 'leadership', name: 'Leadership', category: 'Mental & Tactique', description: 'Influence positive sur le moral de l\'équipe' },
  { id: 'composure_def', name: 'Sang-froid défensif', category: 'Mental & Tactique', description: 'Gestion des attaques adverses sans paniquer' },
  { id: 'concentration', name: 'Concentration', category: 'Mental & Tactique', description: 'Évite les erreurs d\'attention en fin de match' },
  { id: 'determination', name: 'Détermination', category: 'Mental & Tactique', description: 'Capacité à élever son niveau quand l\'équipe perd' },
  { id: 'placement_defensif', name: 'Placement défensif', category: 'Mental & Tactique', description: 'Couverture des espaces dangereux' },

  // --- DÉFENSE (8) ---
  { id: 'tackle_debout', name: 'Tacle debout', category: 'Défense', description: 'Interception propre dans les pieds' },
  { id: 'tackle_glisse', name: 'Tacle glissé', category: 'Défense', description: 'Tacle de la dernière chance' },
  { id: 'interceptions', name: 'Interceptions', category: 'Défense', description: 'Coupure des lignes de passe adverses' },
  { id: 'marquage', name: 'Marquage individuel', category: 'Défense', description: 'Suivi strict de l\'attaquant désigné' },
  { id: 'jeu_de_tete_def', name: 'Jeu de tête défensif', category: 'Défense', description: 'Dégagements aériens' },
  { id: 'blocage', name: 'Contre / Blocage de tir', category: 'Défense', description: 'Interposition devant les frappes' },
  { id: 'protection_balle', name: 'Protection de balle', category: 'Défense', description: 'Utilisation du corps pour masquer le ballon' },
  { id: 'charge', name: 'Charge d\'épaule', category: 'Défense', description: 'Dépossession au duel physique' },

  // --- GARDIEN (6) ---
  { id: 'gb_plongeon', name: 'Plongeon GB', category: 'Gardien', description: 'Portée de saut pour arrêter les tirs' },
  { id: 'gb_jeu_main', name: 'Jeu à la main GB', category: 'Gardien', description: 'Prise de balle et relances' },
  { id: 'gb_degagement', name: 'Dégagement GB', category: 'Gardien', description: 'Longueur et précision des renvois au pied' },
  { id: 'gb_reflexes', name: 'Réflexes GB', category: 'Gardien', description: 'Arrêts réflexes à bout portant' },
  { id: 'gb_positionnement', name: 'Positionnement GB', category: 'Gardien', description: 'Fermeture des angles de tir' },
  { id: 'gb_sorties', name: 'Sorties dans les pieds', category: 'Gardien', description: 'Prise de décision sur les ballons profonds' }
];

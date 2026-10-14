# 🏆 FC-CAREER — ARCHITECTURE MASTERCLASS v5

> **Vision** : Tu vis la vie d'un footballeur. Pas un jeu — une vie.
> Chaque décision a des conséquences qui durent. Une seule action par jour.
> Du centre de formation d'un petit club de D3 jusqu'au Globe d'Or — ou la chute.
> Tu choisis ton pays, tu commences en bas, et tu te bats pour monter.
> Le monde vit autour de toi. Les autres joueurs progressent, déclinent, changent de club.
> Ce n'est pas toi contre le jeu. C'est toi dans un monde de football vivant.
>
> **v5 — Masterclass** : Refonte totale design, gameplay et technique.
> Le jeu doit être CHAUD, VIVANT, BEAU. Pas une feuille Excel.

---

## ⚠️ DIAGNOSTIC v4 — CE QUI NE VA PAS

Avant de construire la v5, voici le constat brutal de la v4 :

```
TECHNIQUE :
  ❌ Pages qui ne s'ouvrent pas → navigation bloquée
  ❌ Sauvegarde peu fiable → perte de progression
  ❌ Crashes aléatoires → expérience frustrante
  ❌ Pas de validation côté moteur → double-actions possibles

GAMEPLAY :
  ❌ Entraînements répétitifs → aucune profondeur
  ❌ Progression mal calibrée → trop rapide ou trop lente
  ❌ IA faible → comportements irréalistes
  ❌ Pas de feedback → le joueur ne comprend pas l'impact de ses choix
  ❌ Playstyles invisibles → on ne les voit jamais, on ne les débloque jamais
  ❌ Pas de points d'attributs → progression passive et froide
  ❌ Sponsors sans missions → juste un chiffre de revenu

DESIGN / UI / UX :
  ❌ Direction artistique quelconque → pas d'identité
  ❌ Écrans surchargés et confus → interactions contre-intuitives
  ❌ Pas d'animations → le jeu est MORT visuellement
  ❌ Aucun glassmorphism → fond plat, cartes plates, zéro profondeur
  ❌ Pas de textes animés → tout apparaît d'un coup, froid
  ❌ Pas de défilement de casiers → les attributs sont une liste morte

CONTENU :
  ❌ Peu d'événements → rapidement répétitif
  ❌ Pas de personnalisation → le joueur ne s'incarne pas
  ❌ Aucune rejouabilité → une saison et c'est fini
  ❌ Le jeu est FROID → aucune émotion, aucune chaleur
```

**La v5 corrige TOUT.**

---

## 📖 TABLE DES MATIÈRES

| Étape | Titre | Focus |
|-------|-------|-------|
| 0 | [Design System Masterclass](#-étape-0--design-system-masterclass) | Glassmorphism, animations, identité visuelle |
| 1 | [Univers Fictif — 5 Grands Pays](#-étape-1--univers-fictif--les-5-grands-pays) | Clubs, ligues, coupes, récompenses |
| 2 | [Correction Bugs + Stabilité](#-étape-2--correction-bugs--stabilité-technique) | Zéro crash, navigation fluide, sauvegarde fiable |
| 3 | [Création de Carrière & Académie → Pro](#-étape-3--création-de-carrière--académie--pro) | Choix du pays, parcours complet |
| 4 | [Attributs, PlayStyles Débloquables & Potentiel](#-étape-4--attributs-playstyles-débloquables--potentiel) | 51 attributs + cases playstyle + étoiles + points |
| 5 | [Entraînement Immersif & Casiers d'Attributs](#-étape-5--entraînement-immersif--casiers-dattributs) | Sessions visuelles, casiers défilants, skill tree |
| 6 | [Saison & Compétitions](#-étape-6--saison--compétitions) | Calendrier complet, toutes coupes |
| 7 | [Concurrence, Coach & Objectifs](#-étape-7--concurrence-coach--objectifs) | Relation coach, banc, prêts, suggestions tactiques |
| 8 | [Matchs, Notation & Moments Dramatiques](#-étape-8--matchs-notation--moments-dramatiques--points-dattributs) | Choix, VAR, célébrations, rituels, **points d'attributs** |
| 9 | [Agents, Contrats & Sagas de Transfert](#-étape-9--agents-contrats--sagas-de-transfert) | 3 profils, mercato, négociations saga |
| 10 | [Économie, Marques & Missions Sponsors](#-étape-10--économie-marques--missions-sponsors) | Marques fictives, endorsements, **missions qui donnent des points** |
| 11 | [Médias, Blessures, Mental & Sanctions](#-étape-11--médias-blessures-mental--sanctions) | Presse, santé mentale, psychologie blessure |
| 12 | [Récompenses & Trophées](#-étape-12--récompenses--trophées) | Globe d'Or, classements, équipes type |
| 13 | [Sélection Nationale](#-étape-13--sélection-nationale) | Appels, qualifications, tournois |
| 14 | [Téléphone & Relations Humaines](#-étape-14--téléphone--relations-humaines) | Messages, coéquipiers, rivalités, mentor |
| 15 | [Monde Vivant & Adaptation](#-étape-15--monde-vivant--adaptation-culturelle) | Monde dynamique, adaptation pays |
| 16 | [Fans, Vestiaire & Capitanat](#-étape-16--fans-vestiaire--capitanat) | Chants, tifos, discours vestiaire |
| 17 | [Motion Design & Immersion](#-étape-17--motion-design--immersion) | Le jeu respire, ressent, réagit |
| 18 | [Journal de Carrière & Autobiographie](#-étape-18--journal-de-carrière--autobiographie) | Ton histoire s'écrit automatiquement |
| 19 | [Retraite, Vie Après & Héritage](#-étape-19--retraite-vie-après--héritage) | Post-carrière jouable, legacy cross-save |
| 20 | [Structure Technique & Dossiers](#-étape-20--structure-technique--dossiers) | Code, types, engine, components |

---

## 🎨 ÉTAPE 0 — DESIGN SYSTEM MASTERCLASS

> **C'EST LA BASE DE TOUT. PAS DE BON JEU SANS BON DESIGN.**
> **Terminé quand** : Chaque écran est beau, fluide, lisible. Le joueur dit "wow" en ouvrant le jeu.

### 0.1 — Glassmorphism : L'Identité Visuelle

```
LE JEU UTILISE LE GLASSMORPHISM COMME SIGNATURE VISUELLE.
Chaque carte, chaque panneau, chaque modal = verre dépoli sur fond vivant.

CSS DE BASE (Tailwind v4 + custom) :

.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.glass-card-accent {
  background: linear-gradient(
    135deg,
    rgba(16, 185, 129, 0.08),    /* emerald */
    rgba(6, 182, 212, 0.05)      /* cyan */
  );
  backdrop-filter: blur(20px) saturate(200%);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 24px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 60px rgba(16, 185, 129, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

FONDS VIVANTS (derrière le glass) :
  - Dashboard : gradient animé sombre (slate-950 → emerald-950/10)
  - Match : pulsation de couleur selon le score (vert si on gagne, rouge si on perd)
  - Entraînement : particules flottantes subtiles (comme de la poussière dorée)
  - Profil joueur : couleurs du club en arrière-plan, animées doucement
  - Transfert : flou directionnel + couleurs du nouveau club qui apparaissent

RÈGLES STRICTES :
  ✅ Toutes les cartes utilisent glass-card ou glass-card-accent
  ✅ Les modals utilisent un backdrop blur + overlay sombre
  ✅ Les boutons principaux ont un glow subtil (box-shadow colored)
  ✅ Les bordures sont toujours semi-transparentes, JAMAIS opaques
  ❌ JAMAIS de fond opaque plat (bg-slate-800, bg-gray-900...)
  ❌ JAMAIS de bords durs sans arrondi
  ❌ JAMAIS de carte sans profondeur (shadow + border)
```

### 0.2 — Textes Animés : Tout Apparaît avec Vie

```
RIEN N'APPARAÎT D'UN COUP. Tout entre en scène.

TITRES DE PAGE :
  - Chaque mot apparaît un par un (stagger 60ms)
  - framer-motion : variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
  - Le titre "pulse" une fois arrivé (scale 1.02 puis 1.0)

CHIFFRES / STATS :
  - Animation de compteur (0 → valeur finale en 800ms)
  - easeOut pour un effet naturel
  - Flash de couleur quand la stat change (+vert, -rouge)

NOTIFICATIONS / TOASTS :
  - Slide-in depuis le haut-droit (200ms)
  - Glassmorphism + bordure accent
  - Auto-dismiss avec barre de progression visible

RÉSULTATS DE MATCH :
  - Score apparaît chiffre par chiffre
  - Note du joueur : cercle qui se remplit (animation SVG stroke-dasharray)
  - Événements : cascade avec stagger (chaque but, passe, carton)

TRANSITIONS ENTRE PAGES :
  - Fade + slide-up (300ms, ease [0.25, 0.46, 0.45, 0.94])
  - La page sortante glisse vers le bas en devenant transparente
  - La nouvelle page arrive par le bas en devenant opaque

RÈGLE : Aucune donnée n'apparaît sans animation.
Si un chiffre change → il s'anime. Si un texte arrive → il slide-in.
```

### 0.3 — Palette de Couleurs

```
COULEURS PRIMAIRES (oklch dans Tailwind v4) :
  --primary      : oklch(0.7 0.18 160)   /* Emerald vibrant */
  --primary-glow : oklch(0.65 0.2 160)   /* Pour les box-shadow */
  --accent       : oklch(0.7 0.15 195)   /* Cyan/Teal */
  --surface      : oklch(0.15 0.01 260)  /* Fond sombre profond */
  --card         : rgba(255, 255, 255, 0.04)
  --border       : rgba(255, 255, 255, 0.08)
  --text         : oklch(0.95 0 0)       /* Blanc cassé */
  --muted        : oklch(0.55 0.01 260)  /* Texte secondaire */

COULEURS CONTEXTUELLES :
  --success  : oklch(0.7 0.2 145)   /* Vert vif */
  --danger   : oklch(0.65 0.25 25)  /* Rouge */
  --warning  : oklch(0.75 0.18 85)  /* Ambre */
  --info     : oklch(0.7 0.15 230)  /* Bleu */
  --gold     : oklch(0.8 0.15 85)   /* Or — pour les récompenses */

GRADIENTS SIGNATURE :
  --gradient-hero    : linear-gradient(135deg, var(--primary), var(--accent))
  --gradient-card    : linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.03))
  --gradient-danger  : linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.03))
  --gradient-gold    : linear-gradient(135deg, rgba(234,179,8,0.1), rgba(245,158,11,0.04))
```

### 0.4 — Typographie & Espacement

```
FONTS :
  Titres : 'Barlow Condensed', sans-serif (bold, uppercase, italic)
  Corps  : 'Inter', sans-serif (regular, medium)
  Mono   : 'JetBrains Mono' (stats, chiffres)

TAILLES :
  Page title : 28px bold condensed uppercase italic
  Section title : 18px bold condensed uppercase
  Card title : 15px semibold
  Body : 13px regular
  Caption : 11px medium, letter-spacing 0.05em
  Stat number : 24px mono bold

ESPACEMENT :
  Page padding : 16px (mobile-first)
  Card padding : 16px-20px
  Card gap : 12px
  Section gap : 24px
  Border-radius cards : 20px (grand) | 12px (boutons) | 8px (tags)
```

### 0.5 — Composants UI Masterclass

```
BOUTONS :

  Button "career" (principal) :
    background: var(--gradient-hero)
    color: black
    font: bold condensed uppercase
    border-radius: 14px
    padding: 14px 24px
    box-shadow: 0 0 20px rgba(16,185,129,0.3)
    hover: scale(1.03), shadow augmente
    active: scale(0.97)
    transition: all 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)

  Button "outline" (secondaire) :
    background: transparent
    border: 1px solid rgba(255,255,255,0.12)
    color: white
    hover: background rgba(255,255,255,0.05)

  Button "ghost" :
    background: transparent
    color: var(--muted)
    hover: color white

  Button "action" (accentué) :
    background: rgba(16,185,129,0.15)
    border: 1px solid rgba(16,185,129,0.3)
    color: var(--primary)

CARTES :
  Toutes en glass-card. Bords arrondis 20px.
  Hover subtil : translateY(-2px) + shadow augmente.
  Contenu structuré : header (titre + badge) | body | footer (actions).

BADGES / TAGS :
  Petit pill arrondi (border-radius 999px)
  Background semi-transparent coloré
  Font 10px uppercase bold, letter-spacing 0.08em
  Ex : "TITULAIRE" vert | "BLESSÉ" rouge | "EN FORME" bleu

PROGRESS BARS :
  Background: rgba(255,255,255,0.06)
  Fill: gradient (vert si bon, jaune si moyen, rouge si mauvais)
  Border-radius: 999px
  Height: 6px
  Animation: width transition 600ms ease-out
  Glow subtil sur la barre remplie

MODALS :
  Overlay: rgba(0,0,0,0.7) + backdrop-filter blur(8px)
  Card: glass-card-accent, max-width 400px, centered
  Entrée: scale(0.95, 1.0) + fade (200ms)
  Sortie: scale(1.0, 0.95) + fade (150ms)
```

---

## 🌍 ÉTAPE 1 — UNIVERS FICTIF : LES 5 GRANDS PAYS

> **Objectif** : Un monde football complet avec 5 pays majeurs. Noms proches des vrais, reconnaissables mais fictifs.
> **Terminé quand** : Chaque pays a ses divisions, ses clubs, ses coupes. Aucun nom réel.

### 1.1 — Les 5 Pays & Confédération

| Pays Fictif | Inspiré de | Confédération | Divisions |
|-------------|-----------|---------------|-----------|
| **Gallia** | France | Europa Football Conf. (EFC) | D1, D2, D3 |
| **Albion** | Angleterre | EFC | D1, D2, D3, D4 |
| **Castilla** | Espagne | EFC | D1, D2 |
| **Germania** | Allemagne | EFC | D1, D2 |
| **Azzurria** | Italie | EFC | D1, D2 |

---

### 🇫🇷 1.2 — GALLIA (France)

#### Élite Gallia (D1 — 18 clubs)

| Club | Ville | Surnom | Couleurs | ⭐ Rating |
|------|-------|--------|----------|-----------|
| **Paris Gallia FC** | Paris | Les Étoiles | Bleu/Rouge | 95 |
| **Olympique de Marsalia** | Marsalia | Les Phocéens | Blanc/Bleu | 84 |
| **Olympique Lyonais** | Lyona | Les Gones | Rouge/Bleu | 82 |
| **RC Lensois** | Lensa | Les Sang et Or | Rouge/Or | 81 |
| **Stade Renais** | Renia | Les Rouges et Noirs | Rouge/Noir | 80 |
| **Stade Brestien** | Bresta | Les Pirates | Rouge/Blanc | 78 |
| **AS Monéga** | Monéga | Les Monégasques | Rouge/Blanc | 77 |
| **OGC Nissart** | Nissa | Les Aiglons | Rouge/Noir | 76 |
| **LOSC Lillois** | Lilla | Les Dogues | Rouge/Blanc | 76 |
| **FC Nantais** | Nantia | Les Canaris | Jaune/Vert | 74 |
| **Girondins de Bordélia** | Bordélia | Les Girondins | Bleu Marine | 73 |
| **RC Strasbourgien** | Strasbourg | Les Cigognes | Bleu/Blanc | 72 |
| **Montpelier HSC** | Montpelia | La Paillade | Orange/Bleu | 71 |
| **Stade Reimois** | Reima | Les Rémois | Rouge/Blanc | 70 |
| **FC Tolosain** | Tolosa | Les Violets | Violet | 69 |
| **Havre Athletic** | Le Havra | Les Ciel et Marine | Bleu Ciel/Marine | 68 |
| **RC Lorientais** | Lorienta | Les Merlus | Orange | 67 |
| **Clermont Athletic** | Clermontia | Les Lanciers | Bordeaux/Bleu | 66 |

#### Gallia Seconde (D2 — 20 clubs)
```
20 clubs (ratings 58-65). Promotion : 2 premiers montent en D1.
Barrage : 3e D2 vs 16e D1.
Relégation : 2 derniers descendent en National Gallia.
```

#### National Gallia (D3 — 18 clubs)
```
18 clubs (ratings 48-58). Promotion : 2 premiers montent en D2.
C'est ici que beaucoup de carrières commencent après l'académie.
```

#### Coupes de Gallia

| Compétition | Format |
|------------|--------|
| **Coupe de Gallia** | Élimination directe, 64e → Finale (tous les clubs, amateurs inclus) |
| **Supercoupe de Gallia** | 1 match : Champion D1 vs Vainqueur Coupe |

---

### 🏴󠁧󠁢󠁥󠁮󠁧󠁿 1.3 — ALBION (Angleterre)

> Albion a **4 divisions** — le parcours le plus long et le plus réaliste pour monter.

#### Premier Albion (D1 — 20 clubs)

| Club | Ville | Surnom | Couleurs | ⭐ Rating |
|------|-------|--------|----------|-----------|
| **Manchester Cityzens** | Manchester | The Citizens | Bleu Ciel | 93 |
| **Arsenwall FC** | Londra | The Gunners | Rouge/Blanc | 90 |
| **Liverport FC** | Liverport | The Reds | Rouge | 89 |
| **Manchester Reds** | Manchester | Red Devils | Rouge | 87 |
| **Cheltown FC** | Londra | The Blues | Bleu | 84 |
| **Totbury Hotspur** | Londra | Spurs | Blanc | 83 |
| **Newford United** | Newford | The Magpies | Noir/Blanc | 82 |
| **Asbury Villa** | Birmington | The Villans | Claret/Bleu | 80 |
| **West Borough** | Londra | The Hammers | Claret/Bleu | 78 |
| **Brighton Rovers** | Brightona | The Seagulls | Bleu/Blanc | 77 |
| **Wolverton Wanderers** | Wolverton | Wolves | Or/Noir | 76 |
| **Crystal Town** | Londra | The Eagles | Rouge/Bleu | 75 |
| **Fulborough FC** | Londra | The Cottagers | Blanc/Noir | 74 |
| **Evermere FC** | Liverport | The Toffees | Bleu | 74 |
| **Brentwick FC** | Londra | The Bees | Rouge/Blanc | 73 |
| **Bournecastle** | Bourna | The Cherries | Rouge/Noir | 72 |
| **Nottingford Forest** | Nottingford | Forest | Rouge | 71 |
| **Ipston Town** | Ipston | The Tractor Boys | Bleu | 68 |
| **Leighton FC** | Leighton | The Foxes | Bleu | 67 |
| **Southton FC** | Southton | The Saints | Rouge/Blanc | 65 |

#### Albion Championship (D2 — 24 clubs)
```
24 clubs (ratings 60-72). C'est la division la plus compétitive au monde.
Promotion : 2 premiers montent. 3e-6e jouent les playoffs (demi + finale).
Relégation : 3 derniers descendent en League One.
```

#### Albion League One (D3 — 24 clubs)
```
24 clubs (ratings 52-62).
Promotion : 2 premiers + playoffs (3e-6e).
Relégation : 4 derniers descendent en League Two.
```

#### Albion League Two (D4 — 24 clubs)
```
24 clubs (ratings 45-55).
Promotion : 3 premiers + playoffs (4e-7e).
C'est le point de départ le plus bas possible pour un joueur en Albion.
```

#### Coupes d'Albion

| Compétition | Format |
|------------|--------|
| **FA Trophy** | Élimination directe, tous les clubs d'Albion (des centaines) |
| **League Trophy** | Élimination directe, clubs de D1 et D2 uniquement |
| **Community Shield** | 1 match : Champion D1 vs Vainqueur FA Trophy |

---

### 🇪🇸 1.4 — CASTILLA (Espagne)

#### Primera Castilla (D1 — 20 clubs)

| Club | Ville | Surnom | Couleurs | ⭐ Rating |
|------|-------|--------|----------|-----------|
| **Real Madrista** | Madrista | Los Blancos | Blanc | 93 |
| **FC Barceloneta** | Barceloneta | Los Culés | Bleu/Grenat | 91 |
| **Atlético Madrista** | Madrista | Los Colchoneros | Rouge/Blanc | 86 |
| **Athletic Bilbano** | Bilbano | Los Leones | Rouge/Blanc | 80 |
| **Real Societad** | San Sebastia | La Real | Bleu/Blanc | 80 |
| **Villareal CF** | Villareal | El Submarino Amarillo | Jaune | 79 |
| **Real Bétique** | Sevilia | Los Verdiblancos | Vert/Blanc | 78 |
| **Sevilia FC** | Sevilia | Los Nervionenses | Rouge/Blanc | 77 |
| **Valençia CF** | Valençia | Los Ches | Blanc/Orange | 75 |
| **Celta de Viga** | Viga | Los Celestes | Bleu Ciel | 74 |
| **Osasuna Pamplona** | Pamplona | Los Rojillos | Rouge | 73 |
| **Getafé CF** | Getafé | Los Azulones | Bleu | 72 |
| **Rayo Vallecaso** | Madrista | Los Franjirrojos | Blanc/Rouge | 71 |
| **RCD Mallorça** | Mallorça | Los Bermellones | Rouge/Noir | 70 |
| **Girona Futbol** | Girona | Los de Montilivi | Rouge/Blanc | 78 |
| **UD Las Palmeras** | Las Palmeras | La Unión | Jaune | 69 |
| **Alavés Deportivo** | Vitória | El Glorioso | Bleu/Blanc | 67 |
| **RCD Espanyola** | Barceloneta | Los Periquitos | Bleu/Blanc | 68 |
| **Cádiz Futbol** | Cádiza | Los Piratas | Jaune | 66 |
| **Legañes CF** | Legañes | Los Pepineros | Bleu/Blanc | 65 |

#### Segunda Castilla (D2 — 22 clubs)
```
22 clubs (ratings 58-68). Promotion : 2 premiers + playoffs (3e-6e).
Relégation : 4 derniers.
```

#### Coupes de Castilla

| Compétition | Format |
|------------|--------|
| **Copa del Rey de Castilla** | Élimination directe, tous les clubs professionnels |
| **Supercopa de Castilla** | 4 équipes (2 meilleurs de D1 + 2 finalistes Copa), format Final Four |

---

### 🇩🇪 1.5 — GERMANIA (Allemagne)

#### Bundesliga (D1 — 18 clubs)

| Club | Ville | Surnom | Couleurs | ⭐ Rating |
|------|-------|--------|----------|-----------|
| **Bayern Münich** | Münich | Der Rekordmeister | Rouge/Blanc | 91 |
| **Borussia Dortheim** | Dortheim | Die Schwarzgelben | Jaune/Noir | 84 |
| **RB Leipzich** | Leipzich | Die Roten Bullen | Rouge/Blanc | 82 |
| **Bayer Leverkusen** | Leverkusen | Die Werkself | Rouge/Noir | 84 |
| **VfB Stuttgard** | Stuttgard | Die Schwaben | Blanc/Rouge | 78 |
| **Eintracht Frankfürt** | Frankfürt | Die Adler | Noir/Rouge | 77 |
| **VfL Wolfsbürg** | Wolfsbürg | Die Wölfe | Vert | 76 |
| **SC Freibürg** | Freibürg | Die Breisgauer | Rouge/Blanc | 75 |
| **Borussia Mönchenglaad** | Gladbach | Die Fohlen | Vert/Noir/Blanc | 74 |
| **TSG Hoffenhaim** | Hoffenhaim | Die Kraichgauer | Bleu | 73 |
| **FC Union Berlina** | Berlina | Die Eisernen | Rouge/Blanc | 72 |
| **SV Werder Brema** | Brema | Die Grün-Weißen | Vert/Blanc | 71 |
| **FC Augsbürg** | Augsbürg | Die Fuggerstädter | Rouge/Vert | 70 |
| **1. FSV Mainza** | Mainza | Die Nullfünfer | Rouge/Blanc | 69 |
| **1. FC Heidenhain** | Heidenhain | Die Brenz | Bleu/Rouge | 66 |
| **1. FC Kölna** | Kölna | Die Geißböcke | Blanc/Rouge | 68 |
| **FC St. Paulis** | Hambürg | Die Kiezkicker | Marron/Blanc | 67 |
| **Holstein Kieler** | Kieler | Die Störche | Bleu/Blanc | 65 |

#### Zweite Germania (D2 — 18 clubs)
```
18 clubs (ratings 55-68). Promotion : 2 premiers montent.
Barrage : 3e D2 vs 16e Bundesliga.
Relégation : 2 derniers.
```

#### Coupes de Germania

| Compétition | Format |
|------------|--------|
| **DFB-Pokal Germania** | Élimination directe, tous les clubs (amateurs inclus) |
| **DFL-Supercup** | 1 match : Champion vs Vainqueur Coupe |

---

### 🇮🇹 1.6 — AZZURRIA (Italie)

#### Serie A Azzurria (D1 — 20 clubs)

| Club | Ville | Surnom | Couleurs | ⭐ Rating |
|------|-------|--------|----------|-----------|
| **Inter Milana** | Milana | I Nerazzurri | Bleu/Noir | 87 |
| **AC Milana** | Milana | I Rossoneri | Rouge/Noir | 83 |
| **Juventus Torina** | Torina | La Vecchia Signora | Blanc/Noir | 85 |
| **SSC Napolia** | Napolia | I Partenopei | Bleu Ciel | 84 |
| **AS Roma** | Roma | I Giallorossi | Jaune/Rouge | 80 |
| **SS Lazia** | Roma | I Biancocelesti | Blanc/Bleu Ciel | 79 |
| **Atalanta Bergama** | Bergama | La Dea | Bleu/Noir | 81 |
| **ACF Fiorentina** | Fiorenza | I Viola | Violet | 78 |
| **Bologna Calcio** | Bolona | I Rossoblù | Rouge/Bleu | 77 |
| **Torino Calcio** | Torina | Il Toro | Grenat | 74 |
| **Udinese Calcio** | Udina | I Friulani | Blanc/Noir | 73 |
| **US Leccia** | Leccia | I Giallorossi | Jaune/Rouge | 70 |
| **Empoli Calcio** | Empolia | Gli Azzurri | Bleu | 69 |
| **Genoa Calcio** | Genova | Il Grifone | Rouge/Bleu | 72 |
| **Cagliari Calcio** | Cagliari | I Rossoblù | Rouge/Bleu | 71 |
| **Hellas Verona** | Verona | I Gialloblu | Jaune/Bleu | 68 |
| **US Sassuola** | Sassuola | I Neroverdi | Vert/Noir | 67 |
| **Como Calcio** | Coma | I Lariani | Bleu | 66 |
| **Parma Calcio** | Parma | I Crociati | Blanc/Jaune/Bleu | 67 |
| **Venezia Calcio** | Venezia | I Lagunari | Vert/Orange/Noir | 65 |

#### Serie B Azzurria (D2 — 20 clubs)
```
20 clubs (ratings 56-66). Promotion : 2 premiers + playoffs (3e-8e).
Relégation : 3 derniers.
```

#### Coupes d'Azzurria

| Compétition | Format |
|------------|--------|
| **Coppa d'Azzurria** | Élimination directe, clubs professionnels |
| **Supercoppa d'Azzurria** | 1 match : Champion vs Vainqueur Coppa |

---

### 🌐 1.7 — Compétitions Européennes & Mondiales

| Compétition | Format | Fréquence |
|-------------|--------|-----------|
| **Coupe des Champions d'Europa** | 36 matchs phase de ligue + 8e → Finale | Annuel |
| **Coupe d'Europa** | Phase de ligue + éliminations | Annuel |
| **Conference d'Europa** | Phase de ligue + éliminations | Annuel |
| **Supercoupe d'Europa** | 1 match : Vainqueur Champions vs Vainqueur Europa | Annuel |
| **Coupe du Monde des Clubs** | 32 clubs, tous les 4 ans | Tous les 4 ans |
| **Coupe du Monde des Nations** | 48 nations, phase de groupes + éliminations | Tous les 4 ans |
| **Championnat d'Europa des Nations** | 24 nations | Tous les 4 ans (décalé) |

### 1.8 — Récompenses Individuelles

| Récompense | Fréquence | Remplace |
|-----------|-----------|----------|
| **Globe d'Or** | Annuel | Ballon d'Or |
| **Soulier d'Or d'Europa** | Annuel | Soulier d'Or |
| **Meilleur Buteur** | Par championnat, par saison | — |
| **Meilleur Passeur** | Par championnat, par saison | — |
| **Meilleur Joueur** | Par championnat, par saison | — |
| **Meilleur Jeune (U21)** | Par championnat, par saison | — |
| **Meilleur Gardien** | Par championnat, par saison | — |
| **Joueur du Mois** | Mensuel, par championnat | — |
| **Équipe Type** | Par saison, par championnat | — |
| **MVP Coupe des Champions** | Par édition | — |
| **Trophée des Trophées** | Annuel (Gallia) | Trophées UNFP |

---

## 🐛 ÉTAPE 2 — CORRECTION BUGS + STABILITÉ TECHNIQUE

> **Terminé quand** : ZÉRO page bloquée. ZÉRO crash. ZÉRO perte de sauvegarde. Navigation fluide partout.

### 2.1 — Bugs Critiques à Résoudre

| # | Bug | Gravité | Solution |
|---|-----|---------|----------|
| B1 | **Pages qui ne s'ouvrent pas** | 🔴 BLOQUANT | Chaque page vérifie ses données au mount. Fallback si données manquantes. Aucun crash silencieux. |
| B2 | **Sauvegarde peu fiable** | 🔴 BLOQUANT | Double-write : localStorage + sessionStorage backup. Vérification d'intégrité au chargement. Export/Import JSON. |
| B3 | Barre d'entraînement reset au rechargement | 🔴 Critique | Progression sauvée dans `localStorage` à chaque tick. Reprise exacte. |
| B4 | Entraînement comptabilisé plusieurs fois | 🔴 Critique | Flag `sessionCompleted` + action du jour verrouillée. |
| B5 | Match repris ne restaure pas l'état | 🟠 Majeur | État match sauvé à chaque événement. Reprise fidèle via `match-result.ts`. |
| B6 | Actions interdites non bloquées côté logique | 🟠 Majeur | `GameEngine` valide chaque action. Règles métier côté moteur. |
| B7 | **Navigation incohérente** | 🟠 Majeur | Toutes les routes testées. Sidebar avec état actif visible. Retour arrière cohérent. |
| B8 | Pas de confirmation avant actions irréversibles | 🟡 Mineur | Modal confirmation glassmorphism : transfert, retraite, changement club. |

### 2.2 — Règles de Stabilité

```
CHAQUE PAGE DOIT :
  ✅ Gérer le cas "pas de données" → afficher un état vide élégant, pas un crash
  ✅ Gérer le cas "données corrompues" → reset propre avec notification
  ✅ Avoir un loading state animé (skeleton glassmorphism)
  ✅ Sauvegarder à chaque action critique (match, entraînement, transfert)
  ✅ Vérifier la sauvegarde au mount (intégrité)

NAVIGATION :
  ✅ Toutes les 18+ pages accessibles depuis la sidebar
  ✅ État actif visible (highlight glassmorphism sur le lien courant)
  ✅ Transitions fluides entre les pages (fade + slide)
  ✅ Breadcrumb ou retour possible sur chaque sous-page

TESTS REQUIS :
  ✅ Recharger pendant un entraînement → barre reprend
  ✅ 10x clic "Entraîner" → 1 seule session comptée
  ✅ Fermer pendant un match → reprise correcte
  ✅ 2 matchs le même jour → refusé par le moteur
  ✅ Export → Import → état identique
  ✅ Ouvrir CHAQUE page de la sidebar → AUCUNE ne crash
```

---

## 🎓 ÉTAPE 3 — CRÉATION DE CARRIÈRE & ACADÉMIE → PRO

> **Objectif** : Le joueur choisit son pays de départ. Il commence en académie. Sa progression détermine où il atterrit.
> **Terminé quand** : Un joueur peut commencer dans n'importe quel pays et monter par la performance.
> **DESIGN** : Chaque étape est un écran plein, glassmorphism, avec transition slide entre les étapes.

### 3.1 — Écran de Création (5 étapes visuelles)

```
ÉTAPE 1 — IDENTITÉ (fond animé : particules dorées) :
  - Prénom, Nom (input glassmorphism, placeholder animé)
  - Nationalité (parmi les 5 pays + 15 autres nations) — dropdown avec drapeaux
  - Date de naissance (14-16 ans) — slider tactile
  - Apparence (visage, coupe, couleur peau — à minima)
  → Transition : slide-left + fade

ÉTAPE 2 — PHYSIQUE (fond animé : silhouette qui change) :
  - Taille (160-195 cm) — slider avec silhouette qui s'adapte
  - Poids (55-95 kg) — idem
  - Pied préféré (gauche / droite / les deux) — toggle animé
  - Morphotype : Agile / Équilibré / Puissant / Élancé — cartes à sélectionner

ÉTAPE 3 — FOOTBALL (fond animé : terrain de foot stylisé) :
  - Position principale (GK, DC, DG, DD, MDC, MC, MOC, AG, AD, BU, SA)
    → Sélection sur un TERRAIN VISUEL (tap sur la position)
  - Position secondaire (optionnelle)
  - Style de jeu initial : voir PlayStyles (Étape 4)
    → Carte PlayStyle avec animation de déblocage

ÉTAPE 4 — PAYS DE DÉPART (fond : carte du monde avec les 5 pays) :
  "Dans quel pays veux-tu commencer ta carrière ?"
  → 5 cartes glassmorphism avec drapeau + info pays
  → Hover/tap : la carte s'agrandit, montre les clubs possibles

  Le jeu place automatiquement le joueur dans une ACADÉMIE
  d'un club de D1 ou D2 du pays choisi (aléatoire, pondéré par rating joueur).
  - Joueur potentiel ⭐⭐⭐⭐⭐ → Académie d'un top club
  - Joueur potentiel ⭐⭐⭐ → Académie d'un club moyen
  - Joueur potentiel ⭐⭐ → Académie d'un petit club

ÉTAPE 5 — GÉNÉRATION (fond : couleurs du club, explosion de particules) :
  Animation de génération du joueur :
  - Carte joueur qui se construit en live (attributs qui roulent)
  - Rating qui monte progressivement (animation compteur)
  - Couleurs du club qui se révèlent
  - Nom + numéro de maillot apparaissent
  - Bouton "COMMENCER MA CARRIÈRE" → glow emerald pulsant
```

### 3.2 — Parcours Académie

| Niveau | Âge | Matchs/Saison | Adversaires | Promotion vers |
|--------|-----|---------------|------------|----------------|
| **U17** | 14-16 | 20-25 | Académies U17 | → U19 si rating ≥ 55 + avis coach |
| **U19** | 16-18 | 25-30 | Académies U19 | → Réserve si rating ≥ 62 + avis coach |
| **Réserve** | 17-21 | 30-34 | Clubs D3/D4 | → Pros si rating ≥ 68 + appel coach 1er |
| **Équipe Première** | 17+ | 34-50+ | Championnat + Coupes | Titulaire si rating atteint le seuil du club |

### 3.3 — Règle d'Or

```
❌ UN JOUEUR D'ACADÉMIE NE PEUT PAS JOUER EN SENIOR.

Exceptions contrôlées :
  - Le coach peut "appeler" un joueur de Réserve pour UN match
    → 3+ blessés au même poste requis
    → Retour en Réserve après le match
    → Max 3 appels/saison sans promotion

Promotion officielle :
  - Fin de saison (ou mi-saison exceptionnelle)
  - Rating minimum + matchs joués + note moyenne ≥ 6.5
  - Le coach propose → promotion automatique
  - Pas de retour au niveau inférieur (sauf prêt)
```

### 3.4 — Sortie de l'Académie : Où tu atterris

```
C'est ICI que le jeu est différent de FC 27.
Tu ne vas pas forcément en D1. Ta PERFORMANCE décide.

SCÉNARIO A — Tu es exceptionnel (rating 70+, note moy. > 7.5) :
  → Le club te propose un contrat pro (équipe première D1)
  → Des clubs plus gros peuvent aussi te contacter

SCÉNARIO B — Tu es bon (rating 65-70, note moy. 6.5-7.5) :
  → Le club te propose un contrat pro mais tu seras remplaçant
  → OU un club de D2 te veut comme titulaire
  → Le joueur CHOISIT : banc en D1 ou titulaire en D2 ?

SCÉNARIO C — Tu es correct (rating 58-65) :
  → Le club te libère de l'académie
  → Des clubs de D2 ou D3 te proposent un contrat
  → Tu commences en bas et tu montes par tes performances

SCÉNARIO D — Tu n'es pas prêt (rating < 58) :
  → Le club te garde 1 an de plus en réserve
  → OU te libère → tu cherches un club en D3/D4
  → Risque de ne jamais devenir pro (fin de carrière possible)

C'est le CŒUR du réalisme. La route vers le sommet n'est pas garantie.
```

### 3.5 — Vie en Académie

```
Quotidien U17-U19 :
  - 5 entraînements/semaine (obligatoires)
  - 1 match/semaine (week-end)
  - Événements scolaires ("Examen raté → moral -5")
  - Bourse seulement (50-200€/mois)
  - Pas d'agent avant 16 ans
  - Logement au centre de formation
  - Couvre-feu, discipline stricte

Quotidien Réserve :
  - 5 entraînements/semaine
  - 1-2 matchs/semaine
  - Premier contrat stagiaire (500-2 000€/mois)
  - Agent autorisé
  - Observation par des scouts d'autres clubs
```

---

## 📊 ÉTAPE 4 — ATTRIBUTS, PLAYSTYLES DÉBLOQUABLES & POTENTIEL

> **CHANGEMENT MAJEUR v5** : Les PlayStyles ne sont plus invisibles. Ils ont des CASES à débloquer.
> Les attributs montent par POINTS gagnés (match, entraînement, missions sponsors).
> **Terminé quand** : PlayStyles visibles avec cases. Points d'attributs. Étoiles gestes techniques. Traits.

### 4.1 — 51 Attributs

```
PHYSIQUE (7) : Vitesse | Force | Endurance | Accélération |
  Sprint | Agilité | Équilibre

TECHNIQUE (12) : Dribble | Centre | Passe | Passe Courte |
  Précision Centre | Puissance Frappe | Finition |
  Tir Lointain | Effet | Volée | Contrôle | Pied Faible

MENTAL (15) : Positionnement | Sang-Froid | Décision | Réaction |
  Vision | Conscience | Concentration | Détente | Tête |
  Sens Défensif | Discipline Tactique | Hors-Balle |
  Intensité | Leadership | Personnalité

DÉFENSE (12) : Marquage | Tacle | Position Défensive | Tacle Glissé |
  Tacle Debout | Interception | Tête Défensive | Contres |
  Dégagements | Agressivité | Anticipation | Force Bras (GK)

GARDIEN (5) : Plongeon | Prise de Balle | Jeu au Pied | Placement | Réflexes
```

### 4.2 — POINTS D'ATTRIBUTS (NOUVEAU — Change tout)

```
LE JOUEUR GAGNE DES POINTS D'ATTRIBUTS (PA) :

SOURCES DE PA :
  ⚽ MATCH BIEN JOUÉ :
    Note ≥ 7.0 → +1 PA
    Note ≥ 8.0 → +2 PA
    Note ≥ 9.0 → +3 PA
    Homme du Match → +1 PA bonus
    But ou Passe D. → +1 PA bonus (max 2/match)

  🏋️ ENTRAÎNEMENT :
    Session complétée → +1 PA (dans la catégorie entraînée)
    Session parfaite (aucune erreur) → +2 PA

  📋 MISSIONS SPONSORS (voir Étape 10) :
    Mission complétée → +2 à +5 PA selon difficulté
    Série de missions → bonus PA cumulatif

  🏆 ACCOMPLISSEMENTS :
    Premier but → +3 PA
    Premier titre → +5 PA
    Premier appel sélection → +3 PA
    Joueur du mois → +3 PA
    Globe d'Or → +10 PA

COMMENT DÉPENSER LES PA :
  → Le joueur ouvre l'écran ATTRIBUTS
  → Il voit ses 51 attributs dans des CASIERS visuels (voir Étape 5)
  → Il tap sur un attribut → modal "Améliorer ?"
  → Coût : 1 PA par point d'attribut (base)
  → Au-dessus de 80 : 2 PA par point
  → Au-dessus de 90 : 3 PA par point
  → Maximum par attribut par saison : +5 (évite le power-gaming)

LIMITES INTELLIGENTES :
  → Un attribut ne peut pas dépasser le potentiel du joueur
  → Certains attributs baissent avec l'âge (physique après 29 ans)
  → Le joueur CHOISIT quoi améliorer = personnalisation réelle
  → Un attaquant peut investir en défense s'il veut (mais c'est cher)

C'EST CE QUI MANQUAIT : le joueur contrôle activement sa progression.
Pas juste "entraîne-toi et attends". Tu CHOISIS qui tu deviens.
```

### 4.3 — PLAYSTYLES DÉBLOQUABLES (Système de Cases)

```
NOUVEAU SYSTÈME INSPIRÉ DE FC 27, EN MIEUX :

Chaque PlayStyle a des CASES (paliers) à débloquer.

VISUALISATION :
  ┌─────────────────────────────────────────────┐
  │  ⚡ FINESSE                                  │
  │  [████░░░░░░]  Niveau 1/3                    │
  │                                              │
  │  Case 1 : Finition ≥ 75  ✅ Débloqué        │
  │  Case 2 : Finition ≥ 85  🔒 Verrouillé      │
  │  Case 3 : Finition ≥ 92  🔒 Verrouillé (PS+)│
  │                                              │
  │  Effet actuel : Tirs enroulés +15% précision │
  └─────────────────────────────────────────────┘

SYSTÈME :
  - Chaque PlayStyle a 3 cases (niveaux)
  - Case 1 (PlayStyle basique) : attribut lié ≥ 75
  - Case 2 (PlayStyle avancé) : attribut lié ≥ 85
  - Case 3 (PlayStyle+) : attribut lié ≥ 92

  - Quand un attribut atteint le seuil → NOTIFICATION "Nouvelle case débloquée !"
  - Animation : la case s'illumine, effet de particules, son de déblocage
  - Le PlayStyle s'active automatiquement en match

  - Un joueur peut avoir MAX 4 PlayStyles actifs (choix stratégique)
  - Si plus de 4 sont débloqués → le joueur choisit lesquels équiper
  - C'est comme un LOADOUT de compétences

TOUS LES PLAYSTYLES :

ATTAQUE :
  ⚡ Finesse (Finition) → Tirs enroulés
    Case 1 (75) : +15% précision tirs enroulés
    Case 2 (85) : +30% précision + tirs depuis l'angle
    Case 3+ (92) : +50% précision, tirs impossibles réussis

  💥 Puissance (Puissance Frappe) → Frappes surpuissantes
    Case 1 (75) : +15% puissance de frappe
    Case 2 (85) : +30% puissance + tirs de loin dangereux
    Case 3+ (92) : Tirs imparables à 25m+

  🦅 Tête d'Or (Détente + Tête) → Dominant aérien
    Case 1 (75) : +20% duels aériens
    Case 2 (85) : +35% + buts de la tête x2
    Case 3+ (92) : Imbattable dans les airs

  🔄 Acrobate (Volée + Agilité) → Retournés, bicyclettes
    Case 1 (75) : Peut tenter des volées
    Case 2 (85) : Retournés acrobatiques disponibles
    Case 3+ (92) : Bicyclettes + scores parfaits

VITESSE :
  🏃 Dribbleur Rapide (Dribble + Agilité) → Changements de direction
    Case 1 (75) : Dribbles plus efficaces
    Case 2 (85) : Changements de direction sans perdre le ballon
    Case 3+ (92) : Quasi inarrêtable en 1v1

  🚀 Fusée (Accélération + Sprint) → Accélérations fulgurantes
    Case 1 (75) : Sprint boost en contre-attaque
    Case 2 (85) : Démarrage éclair + résistance aux tacles
    Case 3+ (92) : Vitesse maximale instantanée

PASSE :
  🎯 Passeur Fouetté (Centre + Effet) → Centres parfaits
    Case 1 (75) : Centres précis au 1er poteau
    Case 2 (85) : Centres parfaits n'importe où
    Case 3+ (92) : Centres-tirs possibles

  👁️ Visionnaire (Vision + Passe) → Passes impossibles
    Case 1 (75) : Passes en profondeur améliorées
    Case 2 (85) : Passes dans l'espace impossibles réussies
    Case 3+ (92) : Passes aveugles parfaites

DÉFENSE :
  🛡️ Mur (Tacle + Anticipation) → Tacles parfaits
    Case 1 (75) : Tacles propres + récupération rapide
    Case 2 (85) : Timing parfait, 0 faute
    Case 3+ (92) : Récupère le ballon dans n'importe quelle situation

  🧱 Roc (Force + Équilibre) → Imbattable en duel
    Case 1 (75) : Duels physiques +20%
    Case 2 (85) : Quasiment impossible à passer
    Case 3+ (92) : Dominance physique totale

GARDIEN :
  🐱 Réflexe Chat (Réflexes) → Arrêts réflexes
    Case 1 (78) : Arrêts réflexes améliorés
    Case 2 (86) : Arrêts impossibles possibles
    Case 3+ (93) : Arrêts surhumains

ÉCRAN PLAYSTYLES (design) :
  → Carte glassmorphism par PlayStyle
  → Cases visualisées comme des jauges ou des hexagones
  → Cases verrouillées : grisées avec icône cadenas
  → Cases débloquées : illuminées avec couleur du PlayStyle
  → Animation au déblocage : explosion de particules + sound
  → Effet visuel en match quand le PlayStyle s'active (flash subtil)
```

### 4.4 — Étoiles (Gestes Techniques & Pied Faible)

```
GESTES TECHNIQUES (⭐ 1-5) :
  ⭐     : Feintes basiques seulement
  ⭐⭐    : Roulette, crochet intérieur
  ⭐⭐⭐   : Sombrero, élastique, passement de jambes
  ⭐⭐⭐⭐  : Rainbow flick, hocus pocus, rabona
  ⭐⭐⭐⭐⭐ : Toutes les techniques, improvisation libre

  → Affecte les choix disponibles pendant les matchs
  → Un ⭐⭐ ne peut pas tenter un geste ⭐⭐⭐⭐
  → Peut monter par entraînement spécialisé (très lent, max +1/saison)

PIED FAIBLE (⭐ 1-5) :
  ⭐     : Presque inutilisable (-40% précision)
  ⭐⭐    : Maladroit (-25%)
  ⭐⭐⭐   : Correct (-10%)
  ⭐⭐⭐⭐  : Bon (-3%)
  ⭐⭐⭐⭐⭐ : Ambidextre (0% de différence)
```

### 4.5 — Traits de Personnalité

```
Chaque joueur a 2-4 traits (certains cachés, révélés au fil du temps) :

POSITIFS :
  🏆 Grand Joueur de Grands Matchs → +10% perf en finale/derby/Champions
  🦁 Meneur d'Hommes → Booste le moral des coéquipiers (+5)
  💎 Clutch → Meilleur sous pression (dernières 15 min)
  🔄 Longévité → Déclin physique retardé de 2 ans
  🧠 Intelligent → Apprend les tactiques plus vite, adaptation rapide
  🎯 Perfectionniste → Gains d'entraînement +10%
  😎 Cool → Sang-froid en pénalty et moments de pression

NÉGATIFS :
  🤕 Sujet aux Blessures → Risque blessure +5% permanent
  😤 Tête Brûlée → +30% chance de carton, conflits avec arbitre
  📉 Inconstant → Performances varient beaucoup d'un match à l'autre
  😰 Joueur de Petits Matchs → -10% en matchs importants
  🌙 Fêtard → Si pas géré, fatigue +10 le lundi, risque scandale
  💰 Mercenaire → Demande toujours plus d'argent, moral lié au salaire

NEUTRES :
  🤫 Introverti → Moins de médias, moins de sponsors, mais concentration +5
  📢 Extraverti → Plus de médias, plus de sponsors, mais plus de pression
  🏠 Attaché → Ne veut pas quitter son club/pays, malus si transféré loin
```

### 4.6 — Courbe d'Âge

```
14-17 : Croissance rapide      → Gains ×1.5
18-21 : Croissance forte       → Gains ×1.3
22-24 : Pic                    → Gains ×1.0
25-28 : Prime (plateau)        → Gains ×0.7, maintien
29-31 : Début déclin           → Gains ×0.3, Physique -1/saison
32-34 : Déclin marqué          → Gains ×0.1, Physique -2/saison, Mental stable
35+   : Déclin fort            → Physique -3, Technique -1/saison

Exception "Longévité" : déclin retardé de 2 ans.
Exception blessure grave : déclin prématuré possible.
```

### 4.7 — Forme, Moral & Fatigue

```
FORME (0-100) : Perf match -15% si < 30. Blessure +20% si < 30.
MORAL (0-100) : Prog entraînement ±10%. Moral < 20 → demande transfert.
FATIGUE (0-100) :
  Match entier +25 | Remplaçant 30min +10 | Entraînement +15-22
  Repos actif -25 | Repos complet -40 | Jour off -10
  Fatigue > 80 → perf -20%, blessure ×2
```

---

## 🏋️ ÉTAPE 5 — ENTRAÎNEMENT IMMERSIF & CASIERS D'ATTRIBUTS

> **CHANGEMENT MAJEUR v5** : L'entraînement n'est plus une liste morte.
> C'est un écran VIVANT avec des casiers qui défilent, des animations, des feedbacks.
> **Terminé quand** : L'entraînement est visuellement excitant. Les attributs défilent. Le joueur voit SA progression.

### 5.1 — Écran d'Entraînement (Design Masterclass)

```
LAYOUT DE LA PAGE ENTRAÎNEMENT :

┌─────────────────────────────────────────────┐
│  🏋️ CENTRE D'ENTRAÎNEMENT                   │
│  "Forge ton talent, un jour à la fois"       │
├─────────────────────────────────────────────┤
│                                              │
│  ┌── CASIERS D'ATTRIBUTS (défilement H) ──┐ │
│  │                                          │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │ │
│  │  │ VIT │ │ FOR │ │ END │ │ ACC │  →→→   │ │
│  │  │ 78  │ │ 65  │ │ 72  │ │ 81  │       │ │
│  │  │ +2  │ │     │ │ +1  │ │ +3  │       │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘       │ │
│  │                                          │ │
│  │  ← Swipe pour voir tous les attributs → │ │
│  └──────────────────────────────────────────┘ │
│                                              │
│  ┌── SESSIONS DISPONIBLES ────────────────┐  │
│  │                                          │ │
│  │  [🏃 Vitesse]  [⚽ Technique]            │ │
│  │  [🛡️ Défense]  [🎯 Finition]            │ │
│  │  [🧠 Mental]   [⭐ Gestes Tech]          │ │
│  │  [⚖️ Équilibré] [🧤 Gardien]            │ │
│  │  [😴 Repos Actif] [🛏️ Repos Complet]    │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                              │
│  ┌── BARRE DE PROGRESSION ────────────────┐  │
│  │  ████████████░░░░░░░░░░  62%            │ │
│  │  Session en cours : Vitesse             │ │
│  │  Gains prévus : VIT +2, ACC +3, SPR +1 │ │
│  └──────────────────────────────────────────┘ │
│                                              │
│  PA disponibles : 7 ⚡                       │
│  [Distribuer mes points →]                   │
│                                              │
└─────────────────────────────────────────────┘

CASIERS D'ATTRIBUTS — DESIGN :
  → Chaque attribut est un CASIER (card 80×100px)
  → Fond glassmorphism avec bordure colorée selon la catégorie :
    Physique → bleu | Technique → vert | Mental → violet
    Défense → rouge | Gardien → jaune
  → Le chiffre est GROS (24px mono bold), centré
  → En dessous : nom abrégé (VIT, FOR, END...)
  → Si l'attribut a changé récemment : badge "+2" animé (pulse vert)
  → Si l'attribut est au max : bordure dorée + particules
  → SCROLL HORIZONTAL : le joueur swipe pour voir tous les casiers
  → Animation au scroll : les casiers entrent avec un léger bounce
  → Tap sur un casier → modal détaillé avec historique de progression

BARRE DE PROGRESSION ANIMÉE :
  → Background: glassmorphism sombre
  → Fill: gradient emerald → teal, animé (shimmer effect)
  → Particules qui scintillent sur la barre pendant le fill
  → Quand 100% : explosion + son + les casiers concernés flashent
```

### 5.2 — Sessions d'Entraînement

| Session | Cibles | Gain | Fatigue | Limite | PA Gagné |
|---------|--------|------|---------|--------|----------|
| Équilibré | Tous | +0.5-1.5 | +15 | Illimité | +1 |
| Vitesse | Vit, Accél, Sprint | +2-4 | +20 | 2x/sem | +1 |
| Technique | Dribble, Passe, Ctrl | +2-4 | +18 | 2x/sem | +1 |
| Défense | Marq, Tacle, Pos | +2-4 | +18 | 2x/sem | +1 |
| Finition | Fin, Frappe, Effet | +2-4 | +20 | 2x/sem | +1 |
| Mental | Vision, Décision, Conc | +1-3 | +12 | 3x/sem | +1 |
| Gestes Techniques | Étoiles gestes | Progression lente | +15 | 1x/sem | +1 |
| Gardien | Plongeon, Réflexes | +2-4 | +18 | GK only | +1 |
| Repos Actif | — | 0 | -25 | Illimité | 0 |
| Repos Complet | — | 0 | -40 | Illimité | 0 |

### 5.3 — Distribution des PA (Écran dédié)

```
ÉCRAN "DISTRIBUER MES POINTS" :

  → Même casiers que l'entraînement, mais interactifs
  → Tap sur un casier → bouton "+" apparaît
  → Chaque "+" consomme 1 PA (ou 2 si > 80, ou 3 si > 90)
  → Animation : le chiffre monte avec un compteur
  → L'attribut flashe en vert quand amélioré
  → Compteur de PA restants en haut (toujours visible)
  → Bouton "Confirmer" pour valider les changements
  → Bouton "Annuler" pour tout remettre

  → Si un seuil de PlayStyle est atteint → notification immédiate !
    "🔓 Nouvelle case PlayStyle débloquée : Finesse (Case 2) !"
    Animation de déblocage avec particules
```

### 5.4 — Formule de Gains

```
Gain = Base × Âge × Fatigue × Potentiel × Moral × Coach

Facteur Coach :
  - Coach D3/D4 : ×0.8
  - Coach D2 : ×0.9
  - Coach D1 moyen : ×1.0
  - Coach D1 top : ×1.15
  - Coach d'élite (top 5 mondial) : ×1.3

→ Changer de club change ton coach → change ta progression
→ Raison de plus pour viser un gros club
```

---

## 📅 ÉTAPE 6 — SAISON & COMPÉTITIONS

> **Terminé quand** : Calendrier complet avec toutes les compétitions du pays choisi + Europe. Classements temps réel.
> **DESIGN** : Calendrier glassmorphism avec cartes matchs animées.

### 6.1 — Calendrier (380 jours)

```
JUILLET (1-31)      : Pré-saison, amicaux, Supercoupe
AOÛT (32-62)        : Début championnat (J1-J3), qualifs Champions
SEPT-DÉC (63-184)  : Championnat (J4-J17), Groupes Champions/Europa, Coupe nationale, trêves internationales
JANVIER (185-215)   : Champ. (J18-J20), MERCATO HIVER, Coupe 16e
FÉV-AVRIL (216-305) : Champ. (J21-J30), 8e→Demi Champions, Coupe 8e→Demi
MAI (306-336)       : Champ. (J31-J34), Finales Coupe + Champions
JUIN (337-370)      : MERCATO ÉTÉ, Globe d'Or, Bilan, (Coupe du Monde si année paire)
FIN (370-380)       : Résumé, contrats, passage saison suivante
```

### 6.2 — Qualifications Européennes par Pays

| Pays | Champions | Europa | Conference |
|------|-----------|--------|-----------|
| Gallia | 1er (groupes) + 2e (qualifs) | 3e | Vainqueur Coupe |
| Albion | 1er-4e (groupes) | 5e | Vainqueur FA Trophy si pas qualifié |
| Castilla | 1er-4e (groupes) | 5e | Vainqueur Copa |
| Germania | 1er-4e (groupes) | 5e | Vainqueur DFB-Pokal |
| Azzurria | 1er-4e (groupes) | 5e | Vainqueur Coppa |

### 6.3 — Écran Calendrier (Design)

```
DESIGN CALENDRIER :
  → Timeline horizontale scrollable (mois en haut)
  → Chaque match = carte glassmorphism avec :
    - Logos des 2 clubs
    - Compétition (badge coloré)
    - Date + Journée
    - Si joué : score + note du joueur
    - Si à venir : heure + importance (badge si derby, finale, etc.)
  → Match du jour : carte agrandie, glow emerald, pulsation
  → Filtres : "Tous | Championnat | Coupe | Europe | Sélection"
```

---

## 🪑 ÉTAPE 7 — CONCURRENCE, COACH & OBJECTIFS

> **Terminé quand** : Le coach est un personnage. Il te parle. Il te met sur le banc. Tu peux lui suggérer des tactiques.

### 7.1 — Relation avec le Coach

```
CONFIANCE DU COACH (0-100) :
  - Monte : bonnes notes, objectifs atteints, attitude pro
  - Descend : mauvaises notes, indiscipline, conflits

  Confiance > 80 → Titulaire quasi garanti, il t'écoute
  Confiance 50-80 → En concurrence, tu dois prouver
  Confiance < 50 → Banc, tribune, pas de discussion
  Confiance < 20 → Il veut te vendre ou te prêter

CONVERSATIONS AVEC LE COACH (événements) :
  - "Coach, je mérite de jouer plus" → Risqué si confiance basse
  - "Je voudrais jouer en 10 au lieu d'ailier" → Suggérer un changement
  - "Pourquoi je ne suis pas titulaire ?" → Il explique (rating, forme, tactique)
  - Le coach convoque le joueur : "Je compte sur toi pour le derby"
  - Le coach t'engueule : "Ta dernière prestation était inacceptable"

→ Chaque conversation = choix de réponse = conséquence
→ Design : bulles de chat glassmorphism, avatar du coach, animation de réponse
```

### 7.2 — Hiérarchie & Concurrence

```
Effectif de 25 joueurs simulés avec ratings.
2-3 concurrents par poste.

Le coach choisit selon :
  - Rating au poste (50%)
  - Forme + fatigue (25%)
  - 3 dernières notes (15%)
  - Confiance coach (10%)

Résultat : TITULAIRE | REMPLAÇANT | TRIBUNE
→ Affiché dans une carte glassmorphism avec icône de statut
```

### 7.3 — Objectifs de Saison

```
En début de saison, le coach fixe des objectifs personnalisés :

Attaquant : "Marque 12 buts et 5 passes décisives"
Milieu : "Maintiens une note moyenne de 7.0 sur 25 matchs"
Défenseur : "Pas plus de 3 cartons, 10 clean sheets"
Gardien : "70% d'arrêts, 12 clean sheets"

Réussite → Moral +15, confiance coach +20, prolongation proposée, +3 PA BONUS
Échec → Moral -10, banc, pas de prolongation
```

### 7.4 — Prêts

```
PRÊT SEC (6 mois ou 1 saison) :
  - Club inférieur, plus de temps de jeu
  - Bon prêt (rating +5) → retour comme titulaire potentiel

PRÊT AVEC OPTION D'ACHAT :
  - Le club emprunteur peut t'acheter définitivement
  - Si tu brilles → ils achètent → tu changes de club
  - Si tu es moyen → tu retournes au club parent

PRÊT AVEC OBLIGATION D'ACHAT :
  - Transfert déguisé. Tu pars en prêt mais le club DOIT t'acheter.
  - Activé si certaines conditions sont remplies (matchs joués, par ex.)
```

---

## ⚽ ÉTAPE 8 — MATCHS, NOTATION & MOMENTS DRAMATIQUES + POINTS D'ATTRIBUTS

> **CHANGEMENT v5** : Un bon match te rapporte des PA. Le match n'est plus une corvée, c'est une opportunité.
> **Terminé quand** : Choix tactiques, VAR, célébrations, rituels, points d'attributs post-match.

### 8.1 — Rituels d'Avant-Match

```
Le joueur développe des rituels. Il choisit 1-2 :
  🎵 Écouter de la musique → Concentration +3
  🧘 Méditer → Sang-froid +3
  📱 Appeler la famille → Moral +5
  🏃 Être le dernier à sortir → Superstition active
  🙏 Prier → Calme +3

Si tu maintiens le même rituel 10 matchs → bonus permanent +1
Si tu le brises → malus superstition pour 3 matchs (-2 sang-froid)

DESIGN : Écran pré-match glassmorphism avec les rituels en cartes.
Animation : le rituel choisi s'illumine et pulse doucement.
```

### 8.2 — Déroulement du Match (Simuler OU Jouer)

```
DEUX MODES DISPONIBLES (dashboard ET page match) :

MODE "SIMULER" (instantané) :
  → Résultat en 1 seconde
  → Score, note, événements clés
  → PA gagnés affichés immédiatement
  → Idéal pour les matchs moins importants

MODE "JOUER LE MATCH" (~1min30 en temps réel) :
  → Chrono 0'-90'+ avec ticks (1 tick/seconde ≈ 90 ticks)
  → Score en direct, événements, note live
  → 3-5 MOMENTS DE CHOIX par match :
    "Corner : 1er poteau (agressif) ou 2e (prudent) ?"
    "Tu dribbles (risqué) ou tu passes (sûr) ?"
    "Tu tires de loin (30%) ou tu avances (50% mais perte possible) ?"
    "Tu contestes l'arbitre (risque carton) ou tu acceptes ?"
    → PlayStyles et étoiles affectent les % de réussite
    → Bonne décision = PA bonus !

  MOMENTS VAR (aléatoire, 1-2 par match max) :
    - But marqué → "L'arbitre consulte la VAR..."
    - Animation glassmorphism : écran TV, replay, tension 3s
    - Verdict : But validé ✅ ou But annulé ❌ (hors-jeu, main)
    - Pénalty accordé ou refusé après review

  CÉLÉBRATIONS (quand tu marques) :
    → Menu rapide glassmorphism avec 6-8 célébrations
    → Animation de la célébration choisie
    → Célébration signature (10x la même) → les fans l'attendent

LES DEUX MODES utilisent le même moteur (buildPostMatchState).
Les deux donnent des PA. Les deux sont accessibles depuis le dashboard.

DESIGN POST-MATCH :
  → Écran résultat glassmorphism plein écran
  → Score qui apparaît chiffre par chiffre (animation)
  → Note dans un cercle SVG qui se remplit (0 → note)
  → Événements en cascade (stagger 100ms)
  → PA gagnés : "+3 PA ⚡" avec animation doré pulsant
  → Bouton "Distribuer mes points" si PA > 0
```

### 8.3 — Célébrations Personnalisées

```
Quand tu marques, tu choisis ta célébration :
  🏃 Glissade sur les genoux
  ☝️ Doigt vers le ciel
  🤫 Chut aux supporters adverses (risque carton !)
  🕺 Danse signature
  🫂 Câlin avec les coéquipiers
  🎭 Masque / Célébration avec accessoire
  👶 Bercer le bébé (si enfant récent)

  - Tu débloques des célébrations avec tes accomplissements
  - Une célébration répétée 10x devient ta "signature"
  - Les fans l'attendent → buzz si tu la fais, déception si tu ne la fais pas
  - Copier la célébration d'un rival → scandale médiatique 🔥
```

### 8.4 — Notation (0.0 - 10.0)

```
Base : 6.0

Bonus : But +1.5 | Passe D. +1.0 | Tir cadré +0.5 | Passe clé +0.3
  Interception +0.3 | Tacle réussi +0.2 | Dribble réussi +0.2
  Clean sheet +0.5 | Arrêt (GK) +0.3 | Duel aérien +0.2
  Homme du match bonus +0.3

Malus : Erreur→but -1.5 | Pénalty concédé -0.5 | Perte balle -0.3
  Passes ratées (<70%) -0.2 | Jaune -0.5 | Rouge -2.0
  Dribble raté -0.3 | Tir hors cadre -0.2

Plafond : [3.0 - 10.0]
Homme du match : note la plus haute (≥ 7.5 requis)
```

---

## 🤝 ÉTAPE 9 — AGENTS, CONTRATS & SAGAS DE TRANSFERT

> **Terminé quand** : L'agent est un personnage. Les transferts sont des sagas. Mercato été/hiver seulement.

### 9.1 — 3 Profils d'Agents

| Agent | Commission | Forces | Faiblesses |
|-------|-----------|--------|------------|
| **Le Prudent** | 5% | Contrats stables, fidélité, protection | Pas ambitieux, offres moyennes |
| **L'Ambitieux** | 10% | Meilleurs salaires, clubs top | Pression constante, peut forcer un transfert |
| **Le Requin** | 15% | Sponsors max, primes énormes | Commission élevée, relations club ruinées |

```
Choix agent à 16 ans (ou premier contrat pro).
Changement possible : pénalité 10% salaire + 6 mois sans agent.
L'agent a des DIALOGUES — il t'envoie des messages (voir Étape 14).
Design : chaque agent a un avatar, un style de message, une personnalité visuelle.
```

### 9.2 — Contrats

```typescript
type Contract = {
  club: string
  salary: number              // €/mois
  duration: number            // 1-5 saisons
  signingBonus: number
  releaseClause: number | null
  imageRights: number         // % des droits à l'image (10-50%)
  performanceBonuses: {
    perGoal, perAssist, perCleanSheet, perMatch,
    leagueTitle, cupWin, championsWin
  }
  loyaltyBonus: number
  agentFee: number            // % commission
  status: 'active' | 'expiring' | 'expired'
}
```

### 9.3 — Saga de Transfert (PAS un simple clic)

```
QUAND UN CLUB TE VEUT, C'EST UNE HISTOIRE :

Jour 1-3 : RUMEURS
  → Les médias publient : "Selon nos sources, [Club] s'intéresse à [Joueur]"
  → Ton agent t'envoie un message : "J'ai eu un appel..."
  → Tes coéquipiers réagissent : "C'est vrai que tu pars ?"

Jour 4-7 : PREMIER CONTACT
  → L'agent négocie les premiers termes
  → Le coach te convoque : "C'est vrai cette rumeur ?"
    → Choix : "Non, je reste" | "Je réfléchis" | "Oui, je veux partir"
  → Les fans réagissent (surtout si tu veux partir)

Jour 8-14 : NÉGOCIATIONS
  → Tu vois les termes proposés (salaire, durée, primes)
  → Tu peux demander plus (risque de faire capoter le deal)
  → Visite des installations du club (événement spécial)
  → Tu rencontres le coach du club acheteur : "Voilà mon projet pour toi"

Jour 15-21 : DÉCISION FINALE
  → Accepter → transfert confirmé, conférence de presse, nouveau club
  → Refuser → retour au club, relations possiblement endommagées
  → Le deal peut capoter à la dernière minute
  → DEADLINE DAY : si c'est le 31 janvier ou le 31 août, tension maximale

Toute la saga arrive par MESSAGES sur le téléphone du joueur (Étape 14).
Design : timeline glassmorphism avec étapes visuelles et progress bar.
```

### 9.4 — Fenêtres de Mercato

```
MERCATO ÉTÉ : 1er juin - 31 août
MERCATO HIVER : 1er - 31 janvier
HORS MERCATO : Aucun transfert. Prolongations et joueurs libres seulement.
  Joueurs en fin de contrat (6 derniers mois) contactables par d'autres clubs.
```

---

## 💰 ÉTAPE 10 — ÉCONOMIE, MARQUES & MISSIONS SPONSORS

> **CHANGEMENT MAJEUR v5** : Les sponsors ne sont plus passifs. Ils donnent des MISSIONS.
> Compléter une mission = PA + argent + image. C'est un GAME LOOP entier.
> **Terminé quand** : Marques fictives avec missions. Rewards clairs. Le joueur veut ses sponsors.

### 10.1 — Échelle des Salaires

```
Académie : 50-200€/mois | Stagiaire : 500-2 000€
D4 Albion : 1 000-3 000€ | D3 : 2 000-8 000€
D2 : 5 000-20 000€ | D1 petit club : 10 000-50 000€
D1 gros club : 50 000-200 000€ | Star mondiale : 200 000-500 000€
```

### 10.2 — Marques Fictives & Endorsements

```
Pas juste "sponsor". Des MARQUES avec une identité :

CHAUSSURES :
  👟 VELOX → Pour les joueurs rapides (Vitesse > 85)
    Slogan : "Faster Than Light". Contrat : 5 000-50 000€/mois.
  👟 IRONWALL → Pour les défenseurs (Tacle + Force > 85)
    Slogan : "Unbreakable". Contrat : 3 000-30 000€/mois.
  👟 PHANTOM → Pour les techniciens (Dribble + Contrôle > 85)
    Slogan : "Touch of Genius". Contrat : 5 000-60 000€/mois.
  👟 STRIKE FORCE → Pour les buteurs (Finition + Frappe > 85)
    Slogan : "Born to Score". Contrat : 5 000-50 000€/mois.
  👟 CLASSIC → Pour tous, marque d'entrée de gamme
    Slogan : "Play Your Way". Contrat : 500-5 000€/mois.

PARTENAIRES LIFESTYLE :
  ⌚ KRONOS (montres luxe) → Rating > 85 + image > 70
  🚗 THUNDER MOTORS (voitures sport) → Rating > 80
  🥤 BOOST ENERGY (boisson) → Disponible dès D1
  🎮 NEXUS GAMING (jeux vidéo) → Jeune + populaire sur réseaux
  👔 ELEGANZA (mode) → Image > 80

NIVEAUX D'ENDORSEMENT :
  - Ambassadeur simple : logo sur tes réseaux, prime mensuelle
  - Ambassadeur principal : pub TV fictive, affiche dans le stade
  - Signature Line : chaussures à TON nom, design personnalisé (rating > 90)
```

### 10.3 — MISSIONS SPONSORS (NOUVEAU — Game Loop)

```
CHAQUE SPONSOR TE DONNE DES MISSIONS :

MISSIONS VELOX (chaussures vitesse) :
  🎯 "Sprint décisif" : Marque un but après un sprint → +2 PA, +500€
  🎯 "Course record" : Sois le joueur le plus rapide du match → +3 PA, +1 000€
  🎯 "Série rapide" : 3 matchs consécutifs avec un sprint réussi → +5 PA, +2 000€

MISSIONS STRIKE FORCE (chaussures buteur) :
  🎯 "Doublé" : Marque 2 buts dans un match → +3 PA, +1 000€
  🎯 "Feu à volonté" : 5 tirs cadrés dans un match → +2 PA, +500€
  🎯 "Série de buteur" : Marque dans 3 matchs consécutifs → +5 PA, +3 000€

MISSIONS KRONOS (montres luxe) :
  🎯 "Timing parfait" : Homme du match → +2 PA, +2 000€
  🎯 "Ponctualité" : 5 matchs en tant que titulaire d'affilée → +3 PA, +3 000€

MISSIONS BOOST ENERGY :
  🎯 "Endurance" : Joue 90 minutes 3 matchs de suite → +2 PA, +500€
  🎯 "Énergie" : Note > 7 avec fatigue > 60 → +3 PA, +1 000€

MÉCANISME :
  → Les missions sont affichées dans un onglet "Sponsors" du dashboard
  → Chaque mission a une barre de progression glassmorphism
  → Quand complétée → notification animée (confettis mini + PA gagné)
  → Les missions se renouvellent chaque mois (certaines hebdomadaires)
  → Série de missions complétées → bonus multiplicateur

DESIGN ÉCRAN SPONSORS :
  → Carte par sponsor (glassmorphism avec logo de la marque)
  → Missions listées avec progress bars
  → Récompenses visibles (PA + argent)
  → Historique des missions complétées
  → Badge "Top Ambassadeur" si toutes les missions du mois sont faites (+10 PA !)

C'EST CE QUI REND LES SPONSORS INTÉRESSANTS.
Pas juste un revenu passif. Un vrai game loop avec des objectifs.
```

### 10.4 — Style de Vie & Conséquences

```
DÉPENSES OBLIGATOIRES :
  Impôts : 30-45% | Agent : 5-15% | Logement : adapté au salaire

CHOIX DE VIE (le joueur décide) :
  🏠 Style Simple → 0€ extra, image "travailleur", sponsors fidèles
  🏡 Style Confortable → 2 000-5 000€/mois, neutre
  🏰 Style Extravagant → 10 000-30 000€/mois, +image mais risque critiques

  🚗 Voiture : Pas de voiture | Normale | Sport | Luxe
  💝 Dons caritatifs : 0-5% du salaire → améliore image publique
  📈 Investissements : 0-20% → revenus passifs à la retraite

ÉVÉNEMENTS DE VIE :
  + Naissance enfant (moral +20) | Mariage (moral +15)
  - Scandale (image -20) | Problème familial (moral -15)
  ± Interview TV (choix réponses) | Gala (accepter/refuser)
```

---

## 📰 ÉTAPE 11 — MÉDIAS, BLESSURES, MENTAL & SANCTIONS

> **Terminé quand** : Santé mentale existe. Psychologie post-blessure. Conférences de presse avec impact.

### 11.1 — Médias & Conférences de Presse

```
APRÈS CHAQUE MATCH, LES MÉDIAS RÉAGISSENT :
  Note < 5 → "Prestation catastrophique"
  Note 5-6 → "Match discret"
  Note 7-8 → "Très bon match !"
  Note 9+ → "MAGISTRAL !"

CONFÉRENCES DE PRESSE (événements ponctuels, 2-3 par mois) :
  2-3 questions avec choix de réponses :

  Q: "Que pensez-vous de votre concurrent au poste ?"
  → "Il est bon, ça me motive" (diplomate, +image)
  → "Je suis meilleur" (arrogant, -image, +confiance)
  → "Pas de commentaire" (neutre)

  Q: "Vous êtes en forme, vous visez le Globe d'Or ?"
  → "Ce serait un rêve" (humble, +image)
  → "Je le mérite" (arrogant, buzz médiatique)
  → "Je pense d'abord au collectif" (diplomate, +confiance coach)

  Impact : image publique, relation coach, sponsors, moral

  Design : écran conférence glassmorphism, micros et caméras en arrière-plan,
  questions qui slide-in, choix de réponses en cartes à tapper.
```

### 11.2 — Santé Mentale (UNIQUE — aucun jeu ne fait ça)

```
PRESSION (0-100) :
  Monte : enchaînement de matchs, critiques médias, finale proche,
          saga de transfert, objectifs non atteints, conflit coach
  Descend : repos, victoires, soutien de l'agent/famille, psychologue

  Pression > 70 → Anxiété pré-match (-5% performance)
  Pression > 85 → Risque de burnout (fatigue +15 permanent pendant 2 semaines)
  Pression > 95 → Burnout total → 1 mois sans match, -10 moral

PSYCHOLOGUE SPORTIF (action journalière) :
  - Disponible dans les gros clubs (D1)
  - Réduit la pression de -15 par session
  - Aide après une blessure grave (voir 11.4)
  - Coût : gratuit si le club le fournit, sinon 500€/session
```

### 11.3 — Blessures

```
RISQUE PAR MATCH :
  Base 3% | Fatigue>70 ×2 | Fatigue>90 ×3 | Forme<30 +2%
  Trait "Sujet aux Blessures" +5% permanent

| Blessure | Durée | Fréquence |
|----------|-------|-----------|
| Contusion | 1-3 jours | 35% |
| Élongation | 1-2 semaines | 25% |
| Entorse | 2-4 semaines | 15% |
| Déchirure | 4-8 semaines | 10% |
| Fracture | 2-4 mois | 8% |
| Ligaments croisés | 6-9 mois | 5% |
| Chronique | Récurrente | 2% |
```

### 11.4 — Psychologie Post-Blessure (UNIQUE)

```
Après une blessure grave (> 1 mois) :
  - 1er mois de retour : PEUR DU CONTACT
    → Le joueur évite les duels (-30% tacle, -20% agressivité)
    → Accélération réduite (-10%) même si physiquement guéri
  - Sessions avec psychologue : -10% peur par session
  - Matchs joués sans re-blessure : -5% peur par match
  - Après 5-8 matchs sans problème : peur disparaît
  - RECHUTE pendant cette période → peur revient à 100%, encore plus longue

→ Ce n'est pas juste "blessé → guéri → OK"
→ C'est "blessé → guéri physiquement → reconstruction mentale → OK"
```

### 11.5 — Sanctions

```
CARTONS : 3 jaunes en 10 matchs = 1 match suspendu
  5 jaunes/saison = 1 match | 10 jaunes = 2 matchs
  Rouge = 1-3 matchs | 3 rouges/saison = audition (3-5 matchs)

HORS TERRAIN :
  Retard entraînement → amende 1 jour salaire
  Conflit coach → banc 2-3 matchs
  Scandale public → suspension + amende + pression +20
```

---

## 🏆 ÉTAPE 12 — RÉCOMPENSES & TROPHÉES

> **Terminé quand** : Globe d'Or jouable. Classements buteurs/passeurs en temps réel par championnat.

### 12.1 — Globe d'Or

```
Cérémonie en juin. Critères :
  Note moyenne saison (30%) | Trophées collectifs (25%)
  Buts + passes D. (20%) | Perf en Champions (15%) | Popularité (10%)

Conditions minimum : Rating moy ≥ 8.0, 25+ matchs, 1 trophée OU 20+ buts
  → Top 30 = Nominé (événement)
  → Top 3 = Finaliste (gala, discours)
  → 1er = Vainqueur (animation dorée, confettis, moral +30, sponsors +50%, +10 PA !)

Design : cérémonie plein écran, fond noir + or, trophée 3D rotatif,
nom qui apparaît lettre par lettre, explosion de particules dorées.
```

### 12.2 — Par Championnat (chacun des 5 pays)

```
Chaque championnat a SES récompenses :
  - Meilleur Buteur | Meilleur Passeur | Meilleur Joueur
  - Meilleur Jeune (U21) | Meilleur Gardien
  - Joueur du Mois (mensuel) → +3 PA
  - Équipe Type de la Saison (11 meilleurs par poste)
```

### 12.3 — Européennes

```
  - Soulier d'Or d'Europa (meilleur buteur tous championnats, coeff ×2 pour top 5)
  - MVP Coupe des Champions → +5 PA
  - Équipe Type de la Coupe des Champions
```

---

## 🏳️ ÉTAPE 13 — SÉLECTION NATIONALE

> **Terminé quand** : Trêves internationales. Matchs de sélection. Coupe du Monde et Euro jouables.

### 13.1 — Appel en Sélection

```
Critères : Rating ≥ 78 (A) | 70-77 (Espoirs U21) | Forme > 50 | Pas blessé
Le joueur peut refuser (mais -image, -relation sélectionneur)
Capitaine possible si : leadership élevé + ancienneté + rating top 3

Design : notification spéciale (drapeau + convocation officielle glassmorphism)
```

### 13.2 — Compétitions

```
Amicaux (2-4/saison) | Qualifications Coupe du Monde/Euro (8-10 matchs)
Coupe du Monde (48 nations, tous les 4 ans)
Championnat d'Europa (24 nations, tous les 4 ans décalé)
```

---

## 📱 ÉTAPE 14 — TÉLÉPHONE & RELATIONS HUMAINES

> **UNIQUE — Aucun jeu de foot ne fait ça.**
> **Terminé quand** : Le joueur a un téléphone. Il reçoit des messages. Il interagit avec des personnages.

### 14.1 — Le Téléphone

```
Un écran TÉLÉPHONE accessible depuis le dashboard.
Design : slide-up comme un vrai téléphone. Glassmorphism sombre.
Notifications push quand un message arrive (badge rouge).

CONTACTS :
  📞 Agent → Négociations, conseils, offres, contrats
  📞 Coach → Convocations, objectifs, critiques, encouragements
  📞 Coéquipier(s) → Amitié, blagues, invitations, conflits
  📞 Rival au poste → Provocations, respect mutuel, motivation
  📞 Famille → Soutien moral, événements de vie
  📞 Sélectionneur → Appel en sélection, feedback
  📞 Journaliste → Interviews exclusives (choix de répondre ou non)
  📞 Fans (réseaux sociaux) → Réactions après les matchs
  📞 Sponsor → Missions, objectifs, récompenses

Chaque message = texte + choix de réponse (2-3 options)
Les réponses affectent les relations, le moral, l'image, la carrière.
Design : bulles de chat avec avatars, timestamps, indicateur "vu/lu".
```

### 14.2 — Relations Détaillées

```
MENTOR (en début de carrière) :
  - Un joueur vétéran du club (30+ ans, rating 80+)
  - Il t'envoie des conseils : "Fais gaffe au tacle par derrière en D1"
  - Il t'aide en entraînement : gains +10% si bonne relation
  - Il peut partir (transfert, retraite) → tu perds le mentor
  - Plus tard, TU deviens le mentor d'un jeune

RIVALITÉ :
  - Un joueur au même poste que toi, dans ton club ou un rival
  - Il te provoque par messages ou en conférence de presse
  - Vous êtes comparés par les médias
  - Si tu le surpasses → satisfaction, image +10, +2 PA
  - Si il te surpasse → pression +10
  - La rivalité peut évoluer en respect mutuel

AMITIÉ :
  - 1-2 coéquipiers proches
  - Ils t'invitent à sortir (attention au trait "Fêtard")
  - Ils te défendent si les médias t'attaquent
  - Ils peuvent partir (transfert) → moral -10
  - Vous pouvez vous retrouver en sélection
```

---

## 🌍 ÉTAPE 15 — MONDE VIVANT & ADAPTATION CULTURELLE

> **UNIQUE — Le monde ne tourne pas autour de toi.**
> **Terminé quand** : Les autres joueurs vivent. L'adaptation culturelle existe.

### 15.1 — Monde Vivant

```
LES AUTRES JOUEURS ONT UNE VIE :
  - Ils progressent, déclinent, se blessent, changent de club
  - Le classement des buteurs évolue avec de vrais concurrents
  - Le Globe d'Or est disputé par des candidats crédibles
  - Les gros transferts apparaissent dans les NEWS
  - Un jeune de ton ancienne académie peut devenir une star
  - Les coachs changent (limogés si mauvais résultats)
  - Les clubs montent, descendent, deviennent riches ou pauvres

NEWS FEED (dans le téléphone, design glassmorphism) :
  "🔥 TRANSFERT : Marcos Silva (87) signe au Real Madrista pour 95M€"
  "📉 Relégation : Havre Athletic descend en Gallia Seconde"
  "🏆 Bayern Münich remporte la Coupe des Champions !"
  "⚡ Blessure : Le capitaine du Manchester Reds out 6 mois"
```

### 15.2 — Adaptation Culturelle

```
TU SIGNES DANS UN PAYS ÉTRANGER :

Mois 1-2 : CHOC CULTUREL
  - Barrière linguistique → -15% communication
  - Consignes mal comprises → -10% discipline tactique
  - Isolement → moral -10, pression +15
  - Fatigue +5 permanent

Mois 3-4 : ADAPTATION
  - Cours de langue (action : -5% malus/session)
  - Tu te fais des amis → isolement réduit
  - Tu t'habitues au style de jeu local

Mois 5+ : INTÉGRÉ
  - Plus de malus
  - Bonus "Joueur multiculturel" si 2+ pays (+3 adaptabilité)
  - Après 3 ans → bonus confort (+5 moral à domicile)

RACCOURCI : Compatriote dans le club → Adaptation 2x plus rapide
```

---

## 🏟️ ÉTAPE 16 — FANS, VESTIAIRE & CAPITANAT

> **Terminé quand** : Les fans chantent ton nom. Le vestiaire est vivant. Le capitaine a des responsabilités.

### 16.1 — Fans

```
COTE DE POPULARITÉ (0-100) :
  Pop > 80 → Les fans chantent ton nom, tifo à ton effigie
  Pop > 90 → Tu es une IDOLE. Maillot le plus vendu.
  Pop < 30 → Sifflé à domicile. Pression +15.
  Pop < 10 → Les fans demandent ton départ.

ACTIONS FAN :
  - Jeter ton maillot au public (+pop)
  - Aller vers les fans après victoire (+pop)
  - Applaudir les fans adverses (+image, +respect)
```

### 16.2 — Dynamique de Vestiaire

```
Le vestiaire est un ÉCOSYSTÈME :
  - Un vestiaire uni → bonus collectif (+3% perf équipe)
  - Un vestiaire divisé → malus (-5% perf, conflits)
  - Si tu es nouveau → tu dois gagner ta place socialement aussi
  Design : écran vestiaire glassmorphism avec portraits des joueurs et jauges de relation.
```

### 16.3 — Capitanat

```
Devenir capitaine : Leadership > 80 + ancienneté + rating top 3

RESPONSABILITÉS :
  🎤 Discours d'avant-match (choix glassmorphism) :
    → Motivant : +5% perf si victoire, -5% si défaite
    → Calme : stable
    → Agressif : +8% perf mais cartons +20%

  🤝 Gérer les conflits vestiaire
  🎙️ Représenter l'équipe en conférence de presse
  🏅 Toss d'avant-match
```

---

## 🎨 ÉTAPE 17 — MOTION DESIGN & IMMERSION

> **Le jeu RESPIRE. Chaque écran a une âme. Le jeu est CHAUD.**

### 17.1 — Le Jeu Ressent Ce Que Tu Vis

```
VICTOIRE EN FINALE :
  → Explosion de confettis dorés (particules)
  → Fond qui pulse en or
  → Trophée qui apparaît en rotation
  → Texte "CHAMPION" lettre par lettre, glow doré
  → +PA bonus animé avec feux d'artifice

BLESSURE GRAVE :
  → Écran vire au rouge (gradient animé)
  → Battement de cœur (pulsation de l'écran)
  → Diagnostic qui apparaît lettre par lettre en rouge
  → Fond qui devient gris progressivement

SUR LE BANC :
  → Couleurs désaturées, ambiance froide
  → Option "S'échauffer" avec barre de progression
  → Si tu entres : couleurs qui reviennent d'un coup

RELÉGATION :
  → Écran gris, effet de pluie (CSS animé)
  → Message sombre qui slide-in lentement

TRANSFERT GRAND CLUB :
  → Couleurs du nouveau club qui envahissent l'écran
  → Flash des photographes (flash blanc rapide)
  → Maillot qui apparaît avec ton nom
```

### 17.2 — Transitions & Micro-Interactions

```
TRANSITIONS :
  Dashboard → Match : Fade + zoom-in stade (500ms)
  Dashboard → Training : Slide-in + particules (300ms)
  Dashboard → Téléphone : Slide-up depuis le bas (250ms)
  Match terminé → Stats : Stabilité 3s puis cascade (stagger)
  Transfert → Nouveau club : Fondu noir → couleurs du nouveau club

MICRO-INTERACTIONS :
  Clic bouton : Ripple glassmorphism + scale 0.97→1.0 (100ms)
  Stat monte : Nombre animate + flash vert + particule
  Fatigue change : Barre smooth (600ms), vert→jaune→rouge
  Notification : Toast glassmorphism slide-in + glow (200ms)
  Nouveau record : Éclat doré + confettis mini
  Message téléphone : Badge pulse + notification sound
  PA gagné : "+2 PA ⚡" flotte vers le haut et disparaît (fade-out)
  PlayStyle débloqué : Case s'illumine + onde de choc + particles
```

---

## 📓 ÉTAPE 18 — JOURNAL DE CARRIÈRE & AUTOBIOGRAPHIE

> **UNIQUE — Ton histoire s'écrit toute seule.**
> **Terminé quand** : Chaque événement majeur est enregistré. Le joueur peut lire son histoire.

### 18.1 — Journal Automatique

```
Le jeu enregistre chaque moment important et génère un texte narratif :

"À l'âge de 15 ans, [Joueur] intègre le centre de formation du Racing Lensois.
Repéré lors d'un tournoi régional, le jeune [position] impressionne par
sa [qualité principale]."

"Saison 3, journée 28. Le derby contre le LOSC Lillois. [Joueur] entre
en jeu à la 72e minute. À la 89e, il frappe. 2-0. Le stade explose.
Sa note : 8.2. Les médias titrent : 'La révélation du derby.'"

ÉVÉNEMENTS ENREGISTRÉS :
  - Premier match pro | Premier but | Premier titre
  - Premier appel en sélection | Transferts majeurs
  - Blessures graves et retours | Rivalités marquantes
  - Récompenses | Moments clés (but en finale, etc.)
  - PlayStyles débloqués | Records personnels

Design : journal glassmorphism avec pages qu'on feuillette.
Chaque entrée a une date, un titre, et une illustration stylisée.
```

### 18.2 — Autobiographie de Fin

```
À la retraite, le joueur peut lire son AUTOBIOGRAPHIE COMPLÈTE.
Chapitres générés automatiquement :
  Ch. 1 : Les débuts (académie)
  Ch. 2 : La percée (premier club pro)
  Ch. 3-N : Les saisons marquantes
  Ch. dernier : L'héritage

Le joueur peut la partager (screenshot/export texte).
Design : livre numérique avec couverture personnalisée (couleurs du club + nom).
```

---

## 🏁 ÉTAPE 19 — RETRAITE, VIE APRÈS & HÉRITAGE

> **Terminé quand** : Retraite + post-carrière jouable + héritage cross-save.

### 19.1 — Retraite

```
VOLONTAIRE : À partir de 32 ans. Match d'adieu possible.
FORCÉE : Blessures récurrentes | Rating < 60 sans club | Âge > 38
BRISÉE : Sanctions | Scandale majeur | Faillite
```

### 19.2 — Score d'Héritage (0-100)

```
TROPHÉES (max 35) : Championnat +5 | Coupe +3 | Champions +8 |
  Europa +4 | Coupe du Monde +10 | Euro +7

STATS (max 25) : 200+ buts +10 | 100+ sélections +7 |
  Note moy > 7.5 +5 | 300+ buts +15

RÉCOMPENSES (max 25) : Globe d'Or +8/trophée |
  Buteur +3 | Joueur +3 | Soulier d'Or +4

PARCOURS (max 15) : 3+ championnats +3 | Capitaine club +2 |
  Capitaine sélection +5 | Fidélité 10+ ans +5
```

### 19.3 — Les 6 Fins

| Score | Fin | Description |
|-------|-----|-------------|
| 90-100 | 🏛️ **LÉGENDE VIVANTE** | Statue devant le stade. Ton nom est éternel. |
| 75-89 | ⭐ **ICÔNE** | Carrière exceptionnelle. Respecté par tous. |
| 60-74 | 🎖️ **SOLIDE** | Bon pro, respecté. Reconversion possible. |
| 40-59 | 📋 **MOYEN** | Sans éclat. Peu de souvenirs. |
| 20-39 | 😔 **GÂCHÉ** | Blessures ou mauvais choix. Le "et si..." |
| 0-19 | 💀 **BRISÉE** | Scandales, faillite. Ton nom = échec. |

### 19.4 — Vie Après le Football (JOUABLE)

```
🎙️ CONSULTANT TV (score > 40) :
  - Mini-jeu simplifié : choix de commentaires → popularité

⚽ ENTRAÎNEUR (score > 60, Leadership > 70) :
  - Version simplifiée de "Football Manager"
  - Tu peux croiser ton ancien club

🏢 DIRECTEUR SPORTIF (score > 70) :
  - Tu recrutes des joueurs, tu gères le budget

🏖️ RETRAITE PAISIBLE (tout score) :
  - Tu vis de tes investissements. Fin du jeu.

💰 FAILLITE (si dépenses > revenus trop longtemps) :
  - Pas de choix post-carrière. Fin sombre.
```

### 19.5 — Héritage Cross-Carrière

```
Quand tu recommences une NOUVELLE CARRIÈRE :
  - Ton ancien joueur EXISTE dans le monde du jeu (NPC)
  - Les commentateurs le mentionnent
  - Sa statue est devant un stade (si score > 90)
  - Ses records sont dans les livres
  - Tu peux le croiser (consultant TV, entraîneur)
```

---

## 📐 ÉTAPE 20 — STRUCTURE TECHNIQUE & DOSSIERS

```
src/app/client/fc-career/
├── types/
│   ├── game.ts              # Univers, saisons, calendrier
│   ├── player.ts            # Joueur, attributs, potentiel, PlayStyles, traits, PA
│   ├── club.ts              # Club, effectif, coach, académie
│   ├── match.ts             # Simulation, choix, notation, VAR, célébrations
│   ├── economy.ts           # Salaires, primes, impôts, marques, missions sponsors
│   ├── agent.ts             # 3 profils, négociations, commissions
│   ├── media.ts             # Médias, conférences, image
│   ├── injury.ts            # Blessures, rééducation, psychologie post-blessure
│   ├── mental.ts            # Pression, burnout, psychologue
│   ├── award.ts             # Globe d'Or, trophées, classements
│   ├── international.ts     # Sélection, compétitions
│   ├── phone.ts             # Messages, contacts, notifications
│   ├── relationship.ts      # Mentor, rival, ami, coach, fans
│   ├── adaptation.ts        # Adaptation culturelle, langue
│   ├── legacy.ts            # Score héritage, fins, post-carrière, journal
│   ├── sponsor.ts           # Missions sponsors, objectifs, récompenses PA
│   ├── playstyle.ts         # PlayStyles avec cases, déblocage, loadout
│   ├── attribute-points.ts  # Système de PA, sources, coûts, limites
│   └── ui.ts                # États UI, animations, design tokens
│
├── engine/
│   ├── player-generator.ts  # Création joueur + potentiel + traits + PlayStyles
│   ├── attribute-calculator.ts # Attributs + courbe âge + étoiles + PA
│   ├── match-engine.ts      # Simulation + choix + VAR + notation + PA post-match
│   ├── progression.ts       # Entraînement, forme, moral, fatigue, PA
│   ├── season-manager.ts    # Calendrier 5 pays + compétitions
│   ├── competition-engine.ts # Coupes, groupes, éliminations
│   ├── transfer-system.ts   # Sagas transfert, mercato, prêts
│   ├── agent-system.ts      # Agents, négociations, commissions
│   ├── economic-engine.ts   # Salaires, marques, endorsements
│   ├── sponsor-engine.ts    # Missions sponsors, vérification, récompenses PA
│   ├── playstyle-engine.ts  # Déblocage PlayStyles, cases, activation
│   ├── media-engine.ts      # Presse, conférences
│   ├── injury-engine.ts     # Blessures, rééducation, psychologie
│   ├── mental-engine.ts     # Pression, burnout, psychologue
│   ├── award-engine.ts      # Globe d'Or, votes, nominations
│   ├── international-engine.ts # Sélections, qualifications
│   ├── academy-engine.ts    # Parcours académie, promotions
│   ├── legacy-engine.ts     # Héritage, fins, autobiographie, post-carrière
│   ├── ai-coach.ts          # IA coach : titulaires, objectifs
│   ├── ai-world.ts          # Monde vivant : autres joueurs, transferts, news
│   ├── phone-system.ts      # Messages, notifications
│   ├── relationship-engine.ts # Mentor, rival, ami, vestiaire
│   ├── adaptation-engine.ts # Choc culturel, langue
│   ├── fan-engine.ts        # Popularité, chants, tifos
│   ├── ritual-engine.ts     # Rituels d'avant-match
│   ├── celebration-engine.ts # Célébrations personnalisées
│   └── journal-engine.ts    # Autobiographie automatique
│
├── constants/
│   ├── attributes.ts        # 51 attributs + coûts PA
│   ├── playstyles.ts        # PlayStyles, cases, seuils de déblocage
│   ├── traits.ts            # Traits de personnalité
│   ├── positions.ts         # Postes, formations
│   ├── clubs-gallia.ts      # Clubs Gallia (D1, D2, D3)
│   ├── clubs-albion.ts      # Clubs Albion (D1, D2, D3, D4)
│   ├── clubs-castilla.ts    # Clubs Castilla (D1, D2)
│   ├── clubs-germania.ts    # Clubs Germania (D1, D2)
│   ├── clubs-azzurria.ts    # Clubs Azzurria (D1, D2)
│   ├── leagues.ts           # Toutes les ligues
│   ├── competitions.ts      # Toutes les compétitions
│   ├── countries.ts         # Pays + confédérations
│   ├── awards.ts            # Récompenses
│   ├── brands.ts            # Marques fictives (Velox, Ironwall, Phantom...)
│   ├── sponsor-missions.ts  # Missions par marque + récompenses PA
│   ├── injuries.ts          # Types de blessures
│   ├── agents.ts            # Profils d'agents
│   ├── celebrations.ts      # Célébrations débloquables
│   ├── rituals.ts           # Rituels d'avant-match
│   └── scaling.ts           # Courbes progression, âge, PA multiplicateurs
│
├── components/
│   ├── GlassCard/           # Composant glass réutilisable (base de tout)
│   ├── AnimatedNumber/      # Compteur animé pour les stats/PA
│   ├── AttributeLocker/     # Casier d'attribut avec scroll horizontal
│   ├── PlayStyleGrid/       # Grille de PlayStyles avec cases débloquables
│   ├── ProgressBar/         # Barre glassmorphism animée (shimmer)
│   ├── Onboarding/          # Création joueur (5 étapes glassmorphism)
│   ├── Dashboard/           # Hub principal (glassmorphism, dual match buttons)
│   ├── Phone/               # Téléphone (slide-up, chat, contacts)
│   ├── Academy/             # Vue académie (U17, U19, Réserve)
│   ├── SeasonView/          # Calendrier glassmorphism
│   ├── MatchCenter/         # Pré-match (rituels), simulation (VAR), post (PA)
│   ├── TrainingCenter/      # Entraînement avec casiers défilants
│   ├── AttributeShop/       # Distribution des PA (casiers interactifs)
│   ├── SponsorHub/          # Missions sponsors avec progress bars
│   ├── ClubView/            # Club, effectif, vestiaire, coach
│   ├── TransferHub/         # Sagas transfert, timeline glassmorphism
│   ├── PlayerProfile/       # Stats, PlayStyles (cases), étoiles, journal
│   ├── MediaCenter/         # Presse, conférences
│   ├── MentalHealth/        # Pression, psychologue
│   ├── AwardCeremony/       # Globe d'Or (animation dorée)
│   ├── International/       # Sélection, matchs
│   ├── InjuryCenter/        # Blessures, rééducation
│   ├── FanZone/             # Popularité, chants, tifos
│   ├── LockerRoom/          # Vestiaire, discours, dynamique
│   ├── RetirementScreen/    # Fin, héritage (livre numérique)
│   ├── PostCareer/          # Entraîneur, consultant, DS
│   ├── NewsRoom/            # News du monde vivant
│   └── SharedUI/            # Badge, Tag, Modal, Toast, Skeleton glassmorphism
│
├── utils/
│   ├── storage.ts           # localStorage + backup + intégrité
│   ├── match-result.ts      # Logique unifiée post-match (PA inclus)
│   ├── formatters.ts        # Formatage (argent, dates, notes)
│   ├── session.ts           # PIN, session, auth
│   └── animations.ts        # Variants framer-motion réutilisables
│
├── hooks/
│   ├── useCareer.ts         # Hook principal état carrière
│   ├── useAttributePoints.ts # Hook PA (solde, dépenser, historique)
│   ├── usePlayStyles.ts     # Hook PlayStyles (cases, déblocage)
│   ├── useSponsorMissions.ts # Hook missions (actives, progression)
│   └── useGlassTheme.ts     # Hook couleurs dynamiques selon contexte
│
├── context/
│   ├── CareerContext.tsx     # État global carrière
│   └── ThemeContext.tsx      # Thème glassmorphism dynamique
│
├── page.tsx                  # PIN auth
├── layout.tsx
└── globals.css               # Design tokens + glassmorphism + animations
```

---

## 📊 COMPARAISON FC 27 vs CHIF-PAM ELITE v5

| Aspect | FC 27 | Chif-Pam Elite v5 | Avantage |
|--------|-------|-------------------|----------|
| **Design** | Standard, cartes plates | 🎨 **Glassmorphism complet**, animations 60fps, textes animés | 🏆 CPE |
| **Attributs** | Progression passive | 🎯 **Points d'Attributs (PA)** gagnés et distribués manuellement | 🏆 CPE |
| **PlayStyles** | Déblocage flou, invisible | 🔓 **Cases débloquables** visibles, 3 niveaux, loadout de 4 | 🏆 CPE |
| **Entraînement** | Liste statique | 🏋️ **Casiers défilants**, animations, barre shimmer, feedback visuel | 🏆 CPE |
| **Sponsors** | Revenus passifs | 📋 **Missions sponsors** → PA + argent, game loop complet | 🏆 CPE |
| **Univers** | Noms sous licence | Univers fictif immersif (5 pays, 100+ clubs) | ⚖️ Différent |
| **Pays jouables** | 30+ ligues | 5 grands pays avec pyramide complète (D1→D4) | ⚖️ Profondeur vs Quantité |
| **Académie** | Simplifié, souvent sauté | U17→U19→Réserve→Pro, strict et réaliste | 🏆 CPE |
| **Sortie académie** | Direct en D1 | D1, D2, D3 ou D4 selon performance | 🏆 CPE |
| **Traits personnalité** | Basiques | 15+ traits qui changent le gameplay | 🏆 CPE |
| **Relation coach** | Limitée | Confiance, conversations, suggestions, conflits | 🏆 CPE |
| **Téléphone** | Cutscenes scriptées | Vrai téléphone avec messages dynamiques de 9+ contacts | 🏆 CPE |
| **Rival** | Optionnel, peu développé | Rival avec messages, provocations, comparaisons médias | 🏆 CPE |
| **Mentor** | Absent | Vétéran mentor avec conseils et bonus | 🏆 CPE |
| **Saga transfert** | Offre → Accepter/Refuser | 2-3 semaines de saga (rumeurs, négo, deadline day) | 🏆 CPE |
| **Agents** | Inexistant en mode joueur | 3 profils avec personnalité et dialogues | 🏆 CPE |
| **Santé mentale** | Absente | Pression, anxiété, burnout, psychologue sportif | 🏆 CPE |
| **Psycho post-blessure** | Absent | Peur du contact, reconstruction mentale | 🏆 CPE |
| **VAR** | Absent en carrière | Moments VAR glassmorphism avec tension | 🏆 CPE |
| **Célébrations** | Fixes | Personnalisées, débloquables, signature | 🏆 CPE |
| **Rituels avant-match** | Absents | Choix avec bonus/malus de superstition | 🏆 CPE |
| **Fans** | Passifs | Cote de popularité, chants, tifos, interactions | 🏆 CPE |
| **Capitanat** | Brassard cosmétique | Discours vestiaire, gestion conflits | 🏆 CPE |
| **Vestiaire** | Absent | Dynamique de groupe, cliques, impact perf | 🏆 CPE |
| **Marques** | Licences réelles | 5+ marques fictives avec missions et personnalité | 🏆 CPE |
| **Adaptation culturelle** | Absente | Choc culturel, cours de langue, intégration | 🏆 CPE |
| **Monde vivant** | Statique | Transferts, retraites, news dynamiques | 🏆 CPE |
| **Journal/Autobio** | Absent | Autobiographie générée, livre numérique | 🏆 CPE |
| **Post-carrière** | Absente | Jouable : entraîneur, consultant TV, DS | 🏆 CPE |
| **Cross-carrière** | Absent | Ancien joueur = légende NPC | 🏆 CPE |
| **Feedback visuel** | Minimal | Animations partout, PA visibles, progress bars | 🏆 CPE |
| **Chaleur du jeu** | Froid, mécanique | CHAUD : émotions, confettis, animations contextuelles | 🏆 CPE |

### Leçons tirées de FC 27 (appliquées dans v5) :

```
CE QUE FC 27 FAIT BIEN ET QU'ON REPREND EN MIEUX :
  ✅ PlayStyles visibles → On ajoute les CASES débloquables (FC 27 les a mais mal)
  ✅ Progression par le jeu → On ajoute les PA comme récompense directe
  ✅ Sponsors → On ajoute les MISSIONS (FC 27 = juste un contrat passif)
  ✅ Feeling de progression → On ajoute les animations et feedbacks visuels
  ✅ Match day experience → On garde les 2 modes (simuler + jouer)

CE QUE FC 27 FAIT MAL ET QU'ON CORRIGE :
  ❌ Design plat et froid → Glassmorphism + animations + textes animés
  ❌ Progression invisible → PA + casiers d'attributs visuels
  ❌ Sponsors ennuyeux → Missions avec récompenses PA
  ❌ PlayStyles flous → Cases avec niveaux et déblocage visible
  ❌ Pas de choix réels → Chaque décision a un impact mesurable
  ❌ Pas de chaleur → Confettis, sons, glow, particules, émotions visuelles
```

---

> **Ce document est la BIBLE du projet v5.**
> Chaque étape est indépendante. On ne passe à la suivante que quand la précédente est **terminée et testée**.
>
> **ORDRE DE PRIORITÉ :**
> 1. **Étape 0** (Design System) — C'est la fondation visuelle de TOUT
> 2. **Étape 2** (Bugs + Stabilité) — RIEN ne marche si ça crash
> 3. **Étapes 4-5** (PA + PlayStyles + Entraînement) — Le cœur de la NOUVELLE progression
> 4. **Étape 8** (Match + PA) — Le match doit récompenser
> 5. **Étape 10** (Missions Sponsors) — Le game loop secondaire
> 6. **Le reste** dans l'ordre
>
> Le jeu ne doit plus être FROID. Il doit être CHAUD, VIVANT, BEAU.
> Chaque pixel compte. Chaque animation compte. Chaque feedback compte.
> C'est ça, une Masterclass.

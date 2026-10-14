# FC-CAREER — ARCHITECTURE v5 MASTERCLASS

> **Vision** : Tu vis la vie d'un footballeur. Chaque décision compte. Du centre de formation jusqu'au Globe d'Or — ou la chute.
> **v5** : Le jeu doit être CHAUD, VIVANT, BEAU. Pas une feuille Excel.

---

## ⚠️ ÉTAT ACTUEL (diagnostic honnête)

```
✅ CE QUI FONCTIONNE :
  - Moteur de match (simuler + jouer interactif)
  - Système de saison + calendrier
  - Économie (wallet, salaire, bonus)
  - Académie (stages U17 → Pro)
  - Persistance localStorage fiable
  - Navigation + layout

❌ CE QUI MANQUE VRAIMENT :
  - Points d'Attributs (PA) → zéro implémenté
  - Missions Sponsor → brands.ts est vide
  - PlayStyles visuels avec cases déblocables → juste du texte
  - Glassmorphism → aucune classe .glass-card dans le CSS
  - Animations → tout apparaît d'un coup, froid
  - Casiers d'attributs défilants → pas de scroll horizontal
  - Page entraînement sans profondeur → timer basique
  - Dashboard froid → pas d'identité visuelle
```

**Plan de correction en 6 phases dans l'ordre d'impact.**

---

## 📋 ORDRE D'IMPLÉMENTATION

| Phase | Quoi | Impact | Risque |
|-------|------|--------|--------|
| **A** | Glassmorphism CSS global | Visuel immédiat sur TOUT | Faible |
| **B** | Points d'Attributs (types + moteur) | Gameplay fondation | Moyen |
| **C** | PlayStyles visuels avec cases | Progression visible | Moyen |
| **D** | Casiers défilants entraînement | UX entraînement | Faible |
| **E** | Missions Sponsor (brands + engine) | Game loop | Moyen |
| **F** | Animations + polish général | Finition | Faible |

---

## 🎨 PHASE A — GLASSMORPHISM CSS

> **1 seul fichier à modifier : `fc-career.css`**
> **Terminé quand** : Chaque carte a du blur, du glass, de la profondeur.

### A.1 — Variables à ajouter dans `.fcl { }`

```css
/* Glassmorphism */
--glass-bg: rgba(255, 255, 255, 0.04);
--glass-bg-accent: rgba(16, 185, 129, 0.06);
--glass-border: rgba(255, 255, 255, 0.08);
--glass-border-accent: rgba(16, 185, 129, 0.15);
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06);
--glass-shadow-accent: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(16, 185, 129, 0.06);
--gradient-hero: linear-gradient(135deg, var(--primary), oklch(0.7 0.15 195));
--gradient-card: linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.03));
```

### A.2 — Classes à ajouter dans fc-career.css

```css
/* === GLASS CARDS === */
.fcl .glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow: var(--glass-shadow);
  transition: transform 0.2s var(--motion), box-shadow 0.2s var(--motion);
}
.fcl .glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.08);
}
.fcl .glass-card-accent {
  background: var(--glass-bg-accent);
  backdrop-filter: blur(20px) saturate(200%);
  -webkit-backdrop-filter: blur(20px) saturate(200%);
  border: 1px solid var(--glass-border-accent);
  border-radius: 24px;
  box-shadow: var(--glass-shadow-accent);
}

/* === BOUTON CAREER (glow vert) === */
.fcl .fcl-career {
  background: var(--gradient-hero);
  color: oklch(0.15 0.02 160);
  font-family: 'Barlow', sans-serif;
  font-weight: 700;
  font-style: italic;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 14px;
  box-shadow: 0 0 20px oklch(0.7 0.18 160 / 0.3);
  border: 0;
}
.fcl .fcl-career:hover {
  box-shadow: 0 0 32px oklch(0.7 0.18 160 / 0.5);
  transform: scale(1.03);
}
.fcl .fcl-career:active { transform: scale(0.97); }

/* === BOUTON ACTION (vert semi-transparent) === */
.fcl .fcl-action {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: var(--primary);
  border-radius: 14px;
}
.fcl .fcl-action:hover {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.4);
}

/* === FOND VIVANT (derrière le glass) === */
.fcl .living-bg {
  position: relative;
}
.fcl .living-bg::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(ellipse 80% 60% at 20% 20%, oklch(0.2 0.08 160 / 0.15) 0%, transparent 60%),
    radial-gradient(ellipse 60% 80% at 80% 80%, oklch(0.15 0.06 200 / 0.1) 0%, transparent 60%),
    var(--background);
  pointer-events: none;
}

/* === PROGRESS BAR GLASS === */
.fcl .glass-progress {
  height: 6px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  overflow: hidden;
}
.fcl .glass-progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s var(--motion);
  box-shadow: 0 0 8px currentColor;
}

/* === BADGE / TAG === */
.fcl .badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.fcl .badge-green { background: rgba(16,185,129,0.15); color: var(--primary); border: 1px solid rgba(16,185,129,0.25); }
.fcl .badge-red { background: rgba(239,68,68,0.12); color: var(--coral); border: 1px solid rgba(239,68,68,0.2); }
.fcl .badge-gold { background: rgba(234,179,8,0.12); color: oklch(0.8 0.15 85); border: 1px solid rgba(234,179,8,0.2); }
.fcl .badge-blue { background: rgba(99,102,241,0.12); color: var(--blue); border: 1px solid rgba(99,102,241,0.2); }

/* === TOAST GLASS === */
.fcl .toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(20, 20, 35, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border-accent);
  border-radius: 14px;
  font-size: 12px;
  box-shadow: var(--glass-shadow-accent);
  animation: fcl-slide-in 0.25s var(--motion) both;
}
@keyframes fcl-slide-in {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* === MODAL GLASS === */
.fcl .fcl-dialog {
  background: rgba(15, 15, 25, 0.9) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 20px !important;
}

/* === ANIMATIONS ENTRÉE === */
@keyframes fcl-reveal {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fcl .anim-reveal { animation: fcl-reveal 0.5s var(--motion) both; }
.fcl .anim-reveal-1 { animation: fcl-reveal 0.5s 0.05s var(--motion) both; }
.fcl .anim-reveal-2 { animation: fcl-reveal 0.5s 0.1s var(--motion) both; }
.fcl .anim-reveal-3 { animation: fcl-reveal 0.5s 0.15s var(--motion) both; }
.fcl .anim-reveal-4 { animation: fcl-reveal 0.5s 0.2s var(--motion) both; }
.fcl .anim-reveal-5 { animation: fcl-reveal 0.5s 0.25s var(--motion) both; }
```

### A.3 — Comment utiliser dans les pages

Remplacer `background: 'var(--card)', border: '1px solid var(--border)'` par `className="glass-card"` sur chaque `<section>`.

Exemple dashboard :
```tsx
// AVANT
<section className="player-card">

// APRÈS
<section className="player-card glass-card">
```

---

## 🔵 PHASE B — POINTS D'ATTRIBUTS (PA)

> **Fondation de la progression active. Sans ça, le joueur est passif.**

### B.1 — Types à modifier

**`types/player.ts`** — Ajouter dans `Player` :
```typescript
// Points d'Attributs (PA)
attributePoints: number;           // stock actuel
attributePointsTotal: number;      // total gagné (pour stats)
attributePointsSpent: AttributePointSpend[]; // historique
```

**Nouveau type** à ajouter en bas de `types/player.ts` :
```typescript
export interface AttributePointSpend {
  date: string;
  attributeId: string;
  pointsSpent: number;
  oldValue: number;
  newValue: number;
}
```

### B.2 — Moteur PA

**Nouveau fichier `engine/attribute-points-engine.ts`** :

```typescript
/**
 * Moteur des Points d'Attributs (PA).
 * Calculé après match, entraînement, ou missions sponsor.
 */
import type { Player } from "../types/player";
import type { SimulatedMatch } from "../types/match";

/** Calcule les PA gagnés après un match. */
export function computeMatchPA(sim: SimulatedMatch): number {
  const rating = sim.userRating.rating;
  if (rating >= 9) return 3;
  if (rating >= 8) return 2;
  if (rating >= 7) return 1;
  return 0;
}

/** Calcule les PA gagnés après une session d'entraînement. */
export function computeTrainingPA(quality: "great" | "good" | "average"): number {
  if (quality === "great") return 2;
  if (quality === "good") return 1;
  return 0;
}

/** Coût en PA pour améliorer un attribut d'1 point. */
export function paCoût(currentValue: number): number {
  if (currentValue >= 90) return 3;
  if (currentValue >= 80) return 2;
  return 1;
}

/** Applique un spend de PA — retourne le joueur mis à jour ou null si impossible. */
export function spendAttributePoint(
  player: Player,
  attributeId: string
): Player | null {
  const currentVal = player.attributes[attributeId] ?? 0;
  if (currentVal >= 99) return null;

  const coût = paCoût(currentVal);
  if (player.attributePoints < coût) return null;

  // Vérifier le cap saisonnier (max +5 par attribut par saison)
  const currentSeason = player.seasonStats[0]?.seasonYear ?? 0;
  const spentThisSeason = player.attributePointsSpent.filter(
    s => s.attributeId === attributeId &&
    new Date(s.date).getFullYear() === currentSeason
  ).reduce((sum, s) => sum + (s.newValue - s.oldValue), 0);
  if (spentThisSeason >= 5) return null;

  const newVal = currentVal + 1;
  const spend = {
    date: new Date().toISOString(),
    attributeId,
    pointsSpent: coût,
    oldValue: currentVal,
    newValue: newVal,
  };

  return {
    ...player,
    attributes: { ...player.attributes, [attributeId]: newVal },
    attributePoints: player.attributePoints - coût,
    attributePointsTotal: player.attributePointsTotal,
    attributePointsSpent: [spend, ...player.attributePointsSpent],
  };
}
```

### B.3 — Intégration dans match-result.ts

Dans `buildPostMatchState()`, après le calcul de `updatedPlayer`, ajouter :
```typescript
import { computeMatchPA } from "../engine/attribute-points-engine";

// Après le calcul de updatedPlayer :
const paGained = computeMatchPA(sim);
const updatedPlayerWithPA: Player = {
  ...updatedPlayer,
  attributePoints: (updatedPlayer.attributePoints ?? 0) + paGained,
  attributePointsTotal: (updatedPlayer.attributePointsTotal ?? 0) + paGained,
};
```

### B.4 — Valeur par défaut dans player-generator.ts

Ajouter `attributePoints: 3, attributePointsTotal: 3, attributePointsSpent: []` dans le joueur créé.

---

## 🎭 PHASE C — PLAYSTYLES VISUELS AVEC CASES

> **Le cœur de la progression visible. Le joueur doit VOIR ses PlayStyles.**

### C.1 — Modifier constants/playstyles.ts

Remplacer le système `threshold / thresholdPlus` par **3 cases** :

```typescript
export interface PlayStyleCase {
  level: 1 | 2 | 3;          // 1=Normal, 2=Avancé, 3=Plus
  label: string;
  requiredAvgAttr: number;    // seuil attribut moyen
  description: string;
  bonus: string;              // bonus gameplay en texte
}

export interface PlayStyleDef {
  id: string;
  label: string;
  category: PlayStyleCategory;
  icon: string;
  requiredAttributes: string[];
  cases: [PlayStyleCase, PlayStyleCase, PlayStyleCase]; // toujours 3
}
```

Exemple pour "finesse" :
```typescript
{
  id: "finesse",
  label: "Finesse",
  category: "attack",
  icon: "🎯",
  requiredAttributes: ["finishing"],
  cases: [
    { level: 1, label: "Finesse", requiredAvgAttr: 75, description: "Tirs enroulés précis", bonus: "+5% précision tir" },
    { level: 2, label: "Finesse ★★", requiredAvgAttr: 85, description: "Finesse maîtrisée", bonus: "+10% précision, courbe augmentée" },
    { level: 3, label: "Finesse+", requiredAvgAttr: 92, description: "Elite — Tirs impossibles", bonus: "+20% précision, tirs hors surface améliorés" },
  ],
}
```

### C.2 — Nouvelle page Joueur — Section PlayStyles

Dans `joueur/page.tsx`, remplacer le rendu texte des PlayStyles par :

```tsx
{/* PlayStyles avec cases */}
<div className="playstyles-section">
  <h3>PlayStyles</h3>
  <div className="playstyles-grid">
    {PLAYSTYLE_DEFS
      .filter(ps => /* filtrer par position */)
      .map(ps => {
        const avgAttr = /* moyenne des attributs requis */;
        const unlockedCase = ps.cases.filter(c => avgAttr >= c.requiredAvgAttr).length;
        return (
          <div key={ps.id} className={`ps-card glass-card ${unlockedCase > 0 ? 'unlocked' : 'locked'}`}>
            <div className="ps-icon">{ps.icon}</div>
            <div className="ps-name">{ps.label}</div>
            <div className="ps-cases">
              {ps.cases.map((c, i) => (
                <div
                  key={i}
                  className={`ps-case ${i < unlockedCase ? 'active' : 'inactive'}`}
                  title={c.description}
                />
              ))}
            </div>
            {unlockedCase === 0 && (
              <div className="ps-lock-info">
                Requis : {ps.cases[0].requiredAvgAttr} en {ps.requiredAttributes.join(', ')}
              </div>
            )}
            {unlockedCase > 0 && (
              <div className="ps-bonus">{ps.cases[unlockedCase - 1].bonus}</div>
            )}
          </div>
        );
      })}
  </div>
</div>
```

### C.3 — CSS PlayStyles dans fc-career.css

```css
.fcl .playstyles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.fcl .ps-card {
  padding: 14px;
  text-align: center;
  cursor: default;
}
.fcl .ps-card.locked { opacity: 0.45; filter: grayscale(0.8); }
.fcl .ps-card.unlocked { border-color: rgba(16,185,129,0.25); }
.fcl .ps-icon { font-size: 24px; margin-bottom: 6px; }
.fcl .ps-name { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.fcl .ps-cases {
  display: flex;
  gap: 4px;
  justify-content: center;
  margin: 8px 0;
}
.fcl .ps-case {
  width: 20px;
  height: 5px;
  border-radius: 999px;
  background: rgba(255,255,255,0.1);
  transition: background 0.3s var(--motion), box-shadow 0.3s;
}
.fcl .ps-case.active {
  background: var(--primary);
  box-shadow: 0 0 6px var(--primary);
}
.fcl .ps-bonus { font-size: 9px; color: var(--primary); margin-top: 4px; }
.fcl .ps-lock-info { font-size: 9px; color: var(--muted-foreground); margin-top: 4px; }
```

---

## 🏋️ PHASE D — CASIERS DÉFILANTS ENTRAÎNEMENT

> **Rendre l'entraînement visuel et ciblé.**

### D.1 — Composant AttributeLocker

Dans `entrainement/page.tsx`, après le choix de session, ajouter une section scrollable :

```tsx
{/* Casiers d'attributs — scroll horizontal par catégorie */}
<div className="casiers-section">
  <div className="casiers-header">
    <h3>Attributs ciblés par cet entraînement</h3>
    <span className="badge badge-green">{SESSION_TARGETS[session]?.length ?? 0} attributs</span>
  </div>
  <div className="casiers-scroll">
    {SESSION_TARGETS[session]?.map(attrId => {
      const attr = getAttributeDef(attrId);
      const val = player.attributes[attrId] ?? 0;
      return (
        <div key={attrId} className="casier glass-card">
          <div className="casier-val">{Math.round(val)}</div>
          <div className="casier-bar">
            <div className="casier-fill" style={{ height: `${val}%`, background: val >= 80 ? 'var(--primary)' : val >= 60 ? 'oklch(0.75 0.18 85)' : 'var(--coral)' }} />
          </div>
          <div className="casier-name">{attr?.shortLabel ?? attrId}</div>
        </div>
      );
    })}
  </div>
</div>
```

### D.2 — Mapping SESSION_TARGETS

```typescript
// Dans entrainement/page.tsx
const SESSION_TARGETS: Record<string, string[]> = {
  balanced:      ["pace", "dribble", "shortPass", "positioning"],
  speed:         ["acceleration", "sprintStamina", "agility", "balance"],
  technique:     ["dribble", "ballControl", "freeKick", "crossing"],
  defense:       ["standingTackle", "defensiveAwareness", "interceptions", "strength"],
  finishing:     ["finishing", "positioning", "composure", "volley"],
  mental:        ["vision", "composure", "aggression", "reactions"],
  "skill-moves": ["dribble", "agility", "ballControl", "balance"],
  goalkeeper:    ["gReflexes", "gPositioning", "gKicking", "gHandling"],
  "active-rest": ["stamina", "balance"],
  "full-rest":   [],
};
```

### D.3 — CSS Casiers dans fc-career.css

```css
.fcl .casiers-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 12px 0 8px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.fcl .casiers-scroll::-webkit-scrollbar { display: none; }
.fcl .casier {
  flex: 0 0 72px;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 6px;
  scroll-snap-align: start;
  border-radius: 14px !important;
}
.fcl .casier-val {
  font-size: 15px;
  font-weight: 700;
  font-family: 'Barlow', sans-serif;
  margin-bottom: 6px;
}
.fcl .casier-bar {
  width: 8px;
  height: 48px;
  background: rgba(255,255,255,0.06);
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
}
.fcl .casier-fill {
  width: 100%;
  border-radius: 999px;
  transition: height 0.6s var(--motion);
  min-height: 3px;
}
.fcl .casier-name {
  font-size: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  margin-top: 6px;
  text-align: center;
}
```

---

## 💼 PHASE E — MISSIONS SPONSOR

> **Transformer les sponsors en game loop actif.**

### E.1 — Remplir brands.ts

```typescript
/**
 * FC CAREER — Marques fictives + missions
 */

export type BrandCategory = "sportswear" | "equipment" | "nutrition" | "lifestyle";

export interface SponsorMission {
  id: string;
  label: string;
  description: string;
  condition: "goals" | "assists" | "rating" | "training" | "matches";
  target: number;          // ex: 2 buts, 7.5 de note
  rewardPA: number;        // Points d'Attributs
  rewardMoney: number;     // €
  durationDays: number;    // fenêtre pour accomplir
}

export interface BrandDef {
  id: string;
  name: string;
  category: BrandCategory;
  color: string;           // oklch
  logo: string;            // emoji ou initiales
  description: string;
  weeklyFee: number;       // € par semaine de base
  missions: SponsorMission[];
}

export const BRANDS: BrandDef[] = [
  {
    id: "velox",
    name: "VELOX",
    category: "sportswear",
    color: "oklch(0.7 0.2 145)",
    logo: "VX",
    description: "Équipementier vitesse — chaussures, maillots d'entraînement.",
    weeklyFee: 800,
    missions: [
      { id: "velox-sprint", label: "Sprint Décisif", description: "Score ou donne 2 buts/passes en 3 matchs", condition: "goals", target: 2, rewardPA: 2, rewardMoney: 500, durationDays: 21 },
      { id: "velox-form", label: "Forme Exemplaire", description: "Maintien une note ≥7.5 sur 5 matchs", condition: "rating", target: 7.5, rewardPA: 3, rewardMoney: 1000, durationDays: 35 },
    ],
  },
  {
    id: "ironcore",
    name: "IRONCORE",
    category: "nutrition",
    color: "oklch(0.65 0.18 30)",
    logo: "IC",
    description: "Nutrition sportive — récupération et performance.",
    weeklyFee: 500,
    missions: [
      { id: "iron-train", label: "Régularité Fer", description: "5 entraînements consécutifs sans repos", condition: "training", target: 5, rewardPA: 2, rewardMoney: 400, durationDays: 7 },
      { id: "iron-match", label: "10 Matchs", description: "Joue 10 matchs ce mois", condition: "matches", target: 10, rewardPA: 4, rewardMoney: 2000, durationDays: 30 },
    ],
  },
  {
    id: "aurora",
    name: "AURORA",
    category: "lifestyle",
    color: "oklch(0.7 0.15 280)",
    logo: "AU",
    description: "Mode de vie — montres, parfums, lifestyle.",
    weeklyFee: 1200,
    missions: [
      { id: "aurora-assist", label: "Maestro", description: "3 passes décisives en 4 matchs", condition: "assists", target: 3, rewardPA: 2, rewardMoney: 800, durationDays: 28 },
    ],
  },
  {
    id: "titan",
    name: "TITAN",
    category: "equipment",
    color: "oklch(0.6 0.1 220)",
    logo: "TT",
    description: "Équipement premium — gants, protège-tibias, sacs.",
    weeklyFee: 600,
    missions: [
      { id: "titan-goal", label: "Buteur", description: "Marque 3 buts en 5 matchs", condition: "goals", target: 3, rewardPA: 3, rewardMoney: 750, durationDays: 35 },
    ],
  },
];

export function getBrand(id: string): BrandDef | undefined {
  return BRANDS.find(b => b.id === id);
}
```

### E.2 — Types sponsor dans types/game.ts

Ajouter dans `GameSave` :
```typescript
// Phase E — Missions Sponsor
sponsorMissions: ActiveSponsorMission[] | null;
```

Nouveau fichier `types/sponsor.ts` :
```typescript
export interface ActiveSponsorMission {
  brandId: string;
  missionId: string;
  startDate: string;
  endDate: string;
  currentProgress: number;
  completed: boolean;
  rewardClaimed: boolean;
}
```

### E.3 — Engine simplifié

Nouveau fichier `engine/sponsor-engine.ts` :
```typescript
import type { Player } from "../types/player";
import type { SimulatedMatch } from "../types/match";
import type { ActiveSponsorMission } from "../types/sponsor";
import { getBrand } from "../constants/brands";

/** Met à jour la progression d'une mission après un match. */
export function updateMissionsAfterMatch(
  missions: ActiveSponsorMission[],
  sim: SimulatedMatch,
  now = new Date()
): { missions: ActiveSponsorMission[]; justCompleted: ActiveSponsorMission[] } {
  const justCompleted: ActiveSponsorMission[] = [];

  const updated = missions.map(m => {
    if (m.completed || new Date(m.endDate) < now) return m;
    const brand = getBrand(m.brandId);
    const missionDef = brand?.missions.find(x => x.id === m.missionId);
    if (!missionDef) return m;

    let progress = m.currentProgress;
    if (missionDef.condition === "goals") progress += sim.userRating.goals;
    if (missionDef.condition === "assists") progress += sim.userRating.assists;
    if (missionDef.condition === "rating" && sim.userRating.rating >= missionDef.target) progress += 1;
    if (missionDef.condition === "matches") progress += 1;

    const completed = progress >= missionDef.target;
    if (completed && !m.completed) justCompleted.push({ ...m, currentProgress: progress, completed: true });

    return { ...m, currentProgress: progress, completed };
  });

  return { missions: updated, justCompleted };
}

/** Génère les missions d'un sponsor pour ce mois. */
export function generateMonthlyMissions(
  brandId: string,
  startDate: string
): ActiveSponsorMission[] {
  const brand = getBrand(brandId);
  if (!brand) return [];
  return brand.missions.map(m => ({
    brandId,
    missionId: m.id,
    startDate,
    endDate: new Date(new Date(startDate).getTime() + m.durationDays * 86400000).toISOString(),
    currentProgress: 0,
    completed: false,
    rewardClaimed: false,
  }));
}
```

---

## ✨ PHASE F — ANIMATIONS & POLISH

> **Ajouter de la vie sans tout réécrire.**

### F.1 — AnimatedNumber — Composant global

Créer `lib/AnimatedNumber.tsx` :
```tsx
"use client";
import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({ value, duration = 800, suffix = "" }: {
  value: number;
  duration?: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    const start = prev.current;
    const end = value;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
      else prev.current = value;
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{display}{suffix}</span>;
}
```

### F.2 — Utilisation dans Dashboard

Remplacer `{seasonStats?.goals ?? 0}` par `<AnimatedNumber value={seasonStats?.goals ?? 0} />`.

Remplacer `{player.overall}` par `<AnimatedNumber value={player.overall} />`.

### F.3 — Page titre avec stagger

Créer `lib/PageTitleAnimated.tsx` :
```tsx
"use client";
import { useEffect, useState } from "react";

export function PageTitleAnimated({ title, ...rest }: { title: string; [key: string]: any }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);
  const words = title.split(" ");
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3em' }}>
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: `opacity 0.4s ${i * 0.06}s var(--motion), transform 0.4s ${i * 0.06}s var(--motion)`,
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}
```

---

## 📁 FICHIERS À CRÉER / MODIFIER

### Nouveaux fichiers
```
engine/attribute-points-engine.ts    ← Phase B
engine/sponsor-engine.ts             ← Phase E
types/sponsor.ts                     ← Phase E
lib/AnimatedNumber.tsx               ← Phase F
lib/PageTitleAnimated.tsx            ← Phase F
```

### Fichiers à modifier
```
fc-career.css                        ← Phase A (glassmorphism)
types/player.ts                      ← Phase B (attributePoints)
types/game.ts                        ← Phase E (sponsorMissions)
constants/playstyles.ts              ← Phase C (3 cases)
constants/brands.ts                  ← Phase E (contenu réel)
utils/match-result.ts                ← Phase B (intégrer computeMatchPA)
engine/progression.ts                ← Phase D (SESSION_TARGETS)
joueur/page.tsx                      ← Phase C (PlayStyles visuels)
entrainement/page.tsx                ← Phase D (casiers défilants)
dashboard/page.tsx                   ← Phase A+F (glass-card + AnimatedNumber)
```

### Fichiers à NE PAS toucher
```
engine/match-engine.ts
engine/season-manager.ts
engine/economic-engine.ts
utils/storage.ts
utils/session.ts
constants/clubs*.ts
```

---

## 🏟️ UNIVERS FICTIF (résumé — inchangé)

5 pays complets déjà dans le code : **Gallia** (France), **Albion** (Angleterre), **Castilla** (Espagne), **Germania** (Allemagne), **Azzurria** (Italie).
Clubs, ligues, divisions, coupes — tout existe dans `constants/clubs*.ts`.

---

## ⚖️ FC-CAREER vs FC 27 — où on doit gagner

| Axe | FC 27 | FC Career CIBLE |
|-----|-------|-----------------|
| PlayStyles | Visuels, cases, animations | **Cases en 3 niveaux avec bonus texte et glow** |
| Progression | Automatique, passive | **PA actifs — le joueur choisit où progresser** |
| Sponsor | Revenus passifs | **Missions mensuelles, PA en récompense, badges** |
| Design | Plat, générique | **Glassmorphism, animations, fond vivant** |
| Entraînement | Menu texte | **Casiers défilants, ciblage visuel** |
| Match | Résultat texte | **Score animé, note animée, timeline événements** |
| Chaleur | Froid | **Chaque action a une réaction visuelle + sonore** |

---

## 🚦 CHECKLIST D'IMPLÉMENTATION

```
Phase A — Glassmorphism CSS
  [ ] Variables --glass-* dans .fcl {}
  [ ] .glass-card et .glass-card-accent
  [ ] .fcl-career glow vert
  [ ] .fcl-action semi-transparent
  [ ] .living-bg gradient background
  [ ] Classes .anim-reveal-0 à -5
  [ ] Appliquer glass-card sur dashboard, joueur, entrainement

Phase B — Points d'Attributs
  [ ] Player.attributePoints + attributePointsSpent
  [ ] engine/attribute-points-engine.ts
  [ ] buildPostMatchState() intègre computeMatchPA()
  [ ] Afficher PA restants dans dashboard et joueur

Phase C — PlayStyles Visuels
  [ ] PlayStyleDef avec 3 cases
  [ ] Refaire joueur/page.tsx section PlayStyles
  [ ] CSS .ps-card, .ps-cases, .ps-case
  [ ] Section "Investir des PA" si PA > 0

Phase D — Casiers Entraînement
  [ ] SESSION_TARGETS mapping
  [ ] Scroll horizontal casiers dans entrainement/page.tsx
  [ ] CSS .casiers-scroll, .casier, .casier-bar

Phase E — Missions Sponsor
  [ ] brands.ts rempli (4 marques, missions)
  [ ] types/sponsor.ts
  [ ] engine/sponsor-engine.ts
  [ ] Intégrer updateMissionsAfterMatch dans buildPostMatchState()
  [ ] Page sponsor (lifestyle ou nouveau /sponsor)

Phase F — Animations
  [ ] lib/AnimatedNumber.tsx
  [ ] lib/PageTitleAnimated.tsx
  [ ] Appliquer AnimatedNumber dans StatCards
  [ ] Toast animation slide-in
```

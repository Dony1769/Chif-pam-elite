"use client";

/**
 * FC CAREER — Création du joueur (identité, morpho, poste, style, club)
 * Route: /client/fc-career/create-player
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Footprints,
  Ruler,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { createInitialPlayer } from "../engine";
import { loadGame, saveGame } from "../utils/storage";
import type { AcademyLevel, PlayerPosition, PreferredFoot, PlayerCareerState } from "../types";
import type { PlayingStyleId } from "../constants/positions";
import { PLAYING_STYLES } from "../constants/positions";
import { STARTING_CLUB_IDS, getClub } from "../constants/clubs";
import type { Morphology } from "../types/player";

const POSITION_GROUPS: Record<string, string[]> = {
  Gardien: ["GK"],
  Défense: ["RB", "RCB", "LCB", "LB"],
  Milieu: ["CDM", "CM", "CAM"],
  Attaque: ["RW", "LW", "ST", "CF"],
};

const MORPHOLOGIES: { value: Morphology; label: string; hint: string }[] = [
  { value: "fin", label: "Fin & vif", hint: "Agilité, équilibre" },
  { value: "normal", label: "Équilibré", hint: "Polyvalent" },
  { value: "costaud", label: "Costaud", hint: "Force physique" },
  { value: "grand", label: "Grand", hint: "Duels aériens" },
  { value: "petit", label: "Petit & nerveux", hint: "Dribble, vivacité" },
];

const ACADEMIES: { value: AcademyLevel; label: string; hint: string }[] = [
  { value: "amateur", label: "Club amateur", hint: "Départ plus dur, gros potentiel brut" },
  { value: "regional", label: "Centre régional", hint: "+1 aux attributs" },
  { value: "national", label: "Académie nationale (INF)", hint: "+3 aux attributs" },
  { value: "prestige", label: "Académie de prestige", hint: "+5 aux attributs" },
];

export default function CreatePlayerPage() {
  const router = useRouter();

  // Étape 1 — identité
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState(18);
  const [heightCm, setHeightCm] = useState(178);
  const [weightKg, setWeightKg] = useState(72);
  const [morphology, setMorphology] = useState<Morphology>("normal");

  // Étape 2 — footballe
  const [position, setPosition] = useState<PlayerPosition>("CM");
  const [style, setStyle] = useState<PlayingStyleId>("complete");
  const [foot, setFoot] = useState<PreferredFoot>("right");
  const [academy, setAcademy] = useState<AcademyLevel>("regional");
  const [clubId, setClubId] = useState<string>(STARTING_CLUB_IDS[0]);

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const canProceedStep1 = firstName.trim().length >= 2 && lastName.trim().length >= 2;

  function handleGenerate() {
    setError(null);
    try {
      const player = createInitialPlayer({
        firstName,
        lastName,
        age,
        position,
        style,
        morphology,
        heightCm,
        weightKg,
        foot,
        academy,
        clubId,
      });

      const existing = loadGame();
      const state: PlayerCareerState = {
        meta:
          existing?.meta ?? {
            version: 1,
            createdAt: new Date().toISOString(),
            lastPlayedAt: new Date().toISOString(),
            pinHash: null,
            phase: "hub",
            season: null,
            clubId,
          },
        player,
        wallet: existing?.wallet ?? null,
      };
      state.meta.phase = "hub";
      state.meta.clubId = clubId;

      saveGame({ meta: state.meta, player: state.player, wallet: state.wallet });
      router.push("/client/fc-career/dashboard");
    } catch (e) {
      setError((e as Error).message || "Impossible de générer le joueur.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8">
      {/* En-tête */}
      <header className="flex items-center justify-between">
        <Link
          href="/client/fc-career"
          className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100"
        >
          <ArrowLeft size={16} /> Retour
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest opacity-60">
          <span className={step === 1 ? "text-emerald-400" : ""}>1. Identité</span>
          <span>—</span>
          <span className={step === 2 ? "text-emerald-400" : ""}>2. Profil</span>
        </div>
      </header>

      <h1 className="text-2xl font-bold">Crée ton joueur</h1>

      {step === 1 ? (
        <section className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-5">
          <Field icon={<UserRound size={16} />} label="Prénom">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Kylian"
              className="fc-input"
            />
          </Field>
          <Field icon={<UserRound size={16} />} label="Nom">
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Lumina"
              className="fc-input"
            />
          </Field>

          <Field icon={<Activity size={16} />} label={`Âge au départ : ${age} ans`}>
            <input
              type="range"
              min={16}
              max={30}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field icon={<Ruler size={16} />} label={`Taille : ${heightCm} cm`}>
              <input
                type="range"
                min={155}
                max={205}
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </Field>
            <Field icon={<Ruler size={16} />} label={`Poids : ${weightKg} kg`}>
              <input
                type="range"
                min={50}
                max={100}
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </Field>
          </div>

          <Field icon={<Footprints size={16} />} label="Morphologie">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MORPHOLOGIES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMorphology(m.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    morphology === m.value
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="text-sm font-semibold">{m.label}</div>
                  <div className="text-xs opacity-60">{m.hint}</div>
                </button>
              ))}
            </div>
          </Field>

          <button
            type="button"
            disabled={!canProceedStep1}
            onClick={() => {
              if (canProceedStep1) setStep(2);
            }}
            className="fc-btn-primary mt-2"
          >
            Continuer <ArrowRight size={16} />
          </button>
          {!canProceedStep1 && (
            <p className="text-center text-xs opacity-50">
              Prénom et nom requis (2 lettres minimum).
            </p>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-5">
          <Field icon={<Shield size={16} />} label="Poste principal">
            <div className="flex flex-col gap-3">
              {Object.entries(POSITION_GROUPS).map(([group, ids]) => (
                <div key={group}>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-50">
                    {group}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ids.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPosition(id as PlayerPosition)}
                        className={`fc-chip ${position === id ? "fc-chip-active" : ""}`}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Field>

          <Field icon={<Sparkles size={16} />} label="Style de jeu">
            <div className="grid grid-cols-2 gap-2">
              {PLAYING_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    style === s.id
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-xs opacity-60">{s.description}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field icon={<Footprints size={16} />} label="Pied fort">
            <div className="flex gap-2">
              {(["left", "right", "both"] as PreferredFoot[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFoot(f)}
                  className={`fc-chip ${foot === f ? "fc-chip-active" : ""}`}
                >
                  {f === "left" ? "Gaucher" : f === "right" ? "Droitier" : "Les deux"}
                </button>
              ))}
            </div>
          </Field>

          <Field icon={<Shield size={16} />} label="Formation (académie)">
            <div className="grid grid-cols-2 gap-2">
              {ACADEMIES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAcademy(a.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    academy === a.value
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="text-sm font-semibold">{a.label}</div>
                  <div className="text-xs opacity-60">{a.hint}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field icon={<Shield size={16} />} label="Club de départ">
            <select
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
              className="fc-input"
            >
              {STARTING_CLUB_IDS.map((id) => {
                const c = getClub(id);
                return c ? (
                  <option key={id} value={id}>
                    {c.name} — {c.division}
                  </option>
                ) : null;
              })}
            </select>
          </Field>

          {error && (
            <p className="rounded-lg bg-red-500/15 p-3 text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="fc-btn-secondary">
              <ArrowLeft size={16} /> Retour
            </button>
            <button type="button" onClick={handleGenerate} className="fc-btn-primary flex-1">
              <Check size={16} /> Générer mon joueur
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-sm font-semibold opacity-80">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, ArrowRight, Check, Footprints, Ruler, Shield, Sparkles, UserRound } from "lucide-react";
import { createInitialPlayer } from "../engine";
import { loadGame, saveGame } from "../utils/storage";
import type { AcademyLevel, PlayerArchetype, PlayerPosition, PreferredFoot, PlayerCareerState } from "../types";

const POSITIONS: { value: PlayerPosition; label: string; group: string }[] = [
{ value: "GB", label: "Gardien", group: "Défense" },
{ value: "DD", label: "Arrière droit", group: "Défense" },
{ value: "DC", label: "Défenseur central", group: "Défense" },
{ value: "DG", label: "Arrière gauche", group: "Défense" },
{ value: "MDC", label: "Milieu défensif", group: "Milieu" },
{ value: "MC", label: "Milieu central", group: "Milieu" },
{ value: "MOC", label: "Milieu offensif", group: "Milieu" },
{ value: "AD", label: "Ailier droit", group: "Attaque" },
{ value: "AG", label: "Ailier gauche", group: "Attaque" },
{ value: "BU", label: "Buteur", group: "Attaque" },
];

const ARCHETYPES: { value: PlayerArchetype; label: string; description: string }[] = [
{ value: "technicien", label: "Technicien", description: "Contrôle, dribbles et précision" },
{ value: "sprinteur", label: "Sprinteur", description: "Vitesse et accélération" },
{ value: "physique", label: "Puissant", description: "Force et duels physiques" },
{ value: "createur", label: "Créateur", description: "Vision et passes décisives" },
{ value: "finisseur", label: "Finisseur", description: "Tirs et efficacité devant le but" },
{ value: "defenseur", label: "Défenseur", description: "Interceptions et solidité" },
{ value: "gardien", label: "Gardien", description: "Réflexes et arrêts" },
{ value: "polyvalent", label: "Polyvalent", description: "Profil équilibré" },
];

const ACADEMIES: { value: AcademyLevel; label: string; description: string }[] = [
{ value: "local", label: "Locale", description: "Début modeste, progression à construire" },
{ value: "regional", label: "Régionale", description: "Davantage de concurrence" },
{ value: "national", label: "Nationale", description: "Formation exigeante" },
{ value: "elite", label: "Élite", description: "Très forte concurrence dès le départ" },
];

const inputClass =
"w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3 text-white outline-none transition focus:border-emerald-400";

const labelClass = "mb-2 block text-sm font-medium text-slate-300";

export default function CreatePlayerPage() {
const router = useRouter();

const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");
const [age, setAge] = useState(15);
const [heightCm, setHeightCm] = useState(170);
const [weightKg, setWeightKg] = useState(60);
const [preferredFoot, setPreferredFoot] = useState<PreferredFoot>("droit");
const [primaryPosition, setPrimaryPosition] = useState<PlayerPosition>("MC");
const [archetype, setArchetype] = useState<PlayerArchetype>("polyvalent");
const [academyLevel, setAcademyLevel] = useState<AcademyLevel>("local");
const [secondaryPosition, setSecondaryPosition] = useState<PlayerPosition>("MOC");
const [step, setStep] = useState(1);
const [error, setError] = useState("");
const [ready, setReady] = useState(false);

useEffect(() => {
if (typeof window === "undefined") return;

if (sessionStorage.getItem("fc_career_unlocked") !== "true") {
router.replace("/client/fc-career");
return;
}

if (loadGame()) {
router.replace("/client/fc-career/dashboard");
return;
}

setReady(true);
}, [router]);

function handleCreatePlayer() {
const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

if (!firstName.trim() || !lastName.trim()) {
setError("Entre ton prénom et ton nom avant de continuer.");
setStep(1);
return;
}

if (age < 13 || age > 18) {
setError("L'âge doit être compris entre 13 et 18 ans.");
setStep(1);
return;
}

if (heightCm < 140 || heightCm > 210 || weightKg < 35 || weightKg > 120) {
setError("Vérifie la taille et le poids renseignés.");
setStep(2);
return;
}

try {

const base = createInitialPlayer({
  playerName: fullName,
  age,
  heightCm,
  weightKg,
  preferredFoot,
  primaryPosition,
  secondaryPositions:
    secondaryPosition === primaryPosition ? [] : [secondaryPosition],
  archetype,
  academyLevel,
});

const player: PlayerCareerState = {
...base,
playerName: fullName,
age,
heightCm,
weightKg,
careerStage: "academie",
physicalProfile: {
...base.physicalProfile,
heightCm,
weightKg,
preferredFoot,
primaryPosition,
secondaryPositions:
secondaryPosition === primaryPosition ? [] : [secondaryPosition],
archetype,
},
academy: base.academy
? {
...base.academy,
academyLevel,
academyName: {
local: "Académie de quartier",
regional: "Centre régional de formation",
national: "Académie nationale",
elite: "Centre d'élite",
}[academyLevel],
}
: base.academy,
};

const saved = saveGame(player);

if (!saved) {
setError("La sauvegarde a échoué. Vérifie que le navigateur autorise le stockage local.");
return;
}

router.replace("/client/fc-career/dashboard");
} catch {
setError("Impossible de créer le joueur. Réessaie.");
}
}

if (!ready) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#060b14] text-slate-300">
Chargement de ta carrière...
</main>
);
}

return (
<main className="min-h-screen bg-[#060b14] px-4 py-8 text-white sm:px-6">
<div className="mx-auto max-w-2xl">
<button
type="button"
onClick={() => router.push("/client/fc-career")}
className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
>
<ArrowLeft size={17} />
Retour
</button>

<header className="mb-8">
<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
<Activity size={25} />
</div>
<p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
FC CAREER 27 · NOUVELLE CARRIÈRE
</p>
<h1 className="text-3xl font-black tracking-tight sm:text-4xl">
Ton histoire commence ici.
</h1>
<p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
Crée ton jeune joueur et commence en académie. Ton profil physique,
ton poste et ton style feront partie de ton parcours.
</p>
</header>

<div className="mb-8 flex gap-2">
{[1, 2, 3].map((item) => (
<div
key={item}
className={`h-1.5 flex-1 rounded-full ${
step >= item ? "bg-emerald-400" : "bg-white/10"
}`}
/>
))}
</div>

<section className="rounded-3xl border border-white/10 bg-[#0c1422] p-5 shadow-2xl sm:p-8">
{step === 1 && (
<div>
<div className="mb-6 flex items-center gap-3">
<UserRound className="text-emerald-300" size={22} />
<div>
<h2 className="text-xl font-bold">Identité du joueur</h2>
<p className="text-sm text-slate-400">Qui es-tu sur le terrain ?</p>
</div>
</div>

<div className="grid gap-5 sm:grid-cols-2">
<label>
<span className={labelClass}>Prénom</span>
<input
className={inputClass}
value={firstName}
onChange={(event) => setFirstName(event.target.value)}
placeholder="Ton prénom"
maxLength={30}
autoComplete="given-name"
/>
</label>

<label>
<span className={labelClass}>Nom</span>
<input
className={inputClass}
value={lastName}
onChange={(event) => setLastName(event.target.value)}
placeholder="Ton nom"
maxLength={30}
autoComplete="family-name"
/>
</label>

<label className="sm:col-span-2">
<span className={labelClass}>Âge au début de la carrière</span>
<select
className={inputClass}
value={age}
onChange={(event) => setAge(Number(event.target.value))}
>
{[13, 14, 15, 16, 17, 18].map((value) => (
<option key={value} value={value}>
{value} ans
</option>
))}
</select>
</label>
</div>
</div>
)}

{step === 2 && (
<div>
<div className="mb-6 flex items-center gap-3">
<Ruler className="text-emerald-300" size={22} />
<div>
<h2 className="text-xl font-bold">Profil physique</h2>
<p className="text-sm text-slate-400">Définis ton profil de départ.</p>
</div>
</div>

<div className="grid gap-5 sm:grid-cols-2">
<label>
<span className={labelClass}>Taille (cm)</span>
<input
className={inputClass}
type="number"
min={140}
max={210}
value={heightCm}
onChange={(event) => setHeightCm(Number(event.target.value))}
/>
</label>

<label>
<span className={labelClass}>Poids (kg)</span>
<input
className={inputClass}
type="number"
min={35}
max={120}
value={weightKg}
onChange={(event) => setWeightKg(Number(event.target.value))}
/>
</label>

<label className="sm:col-span-2">
<span className={labelClass}>Pied préféré</span>
<div className="grid grid-cols-3 gap-2">
{([
["droit", "Droit"],
["gauche", "Gauche"],
["ambidextre", "Ambidextre"],
] as [PreferredFoot, string][]).map(([value, label]) => (
<button
key={value}
type="button"
onClick={() => setPreferredFoot(value)}
className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
preferredFoot === value
? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
: "border-white/10 bg-[#101827] text-slate-400"
}`}
>
{label}
</button>
))}
</div>
</label>
</div>
</div>
)}

{step === 3 && (
<div>
<div className="mb-6 flex items-center gap-3">
<Shield className="text-emerald-300" size={22} />
<div>
<h2 className="text-xl font-bold">Profil footballistique</h2>
<p className="text-sm text-slate-400">Choisis ton rôle et ton point de départ.</p>
</div>
</div>

<div className="mb-5">
<span className={labelClass}>Poste principal</span>
<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
{POSITIONS.map((position) => (
<button
key={position.value}
type="button"
onClick={() => {
setPrimaryPosition(position.value);
if (position.value === secondaryPosition) {
setSecondaryPosition(primaryPosition);
}
}}
className={`rounded-xl border p-3 text-left transition ${
primaryPosition === position.value
? "border-emerald-400 bg-emerald-400/10"
: "border-white/10 bg-[#101827] hover:border-white/20"
}`}
>
<span className="block text-xs text-slate-500">{position.group}</span>
<span className="mt-1 block text-sm font-bold">{position.value}</span>
<span className="mt-1 block text-xs text-slate-400">{position.label}</span>
</button>
))}
</div>
</div>

<label className="mb-5 block">
<span className={labelClass}>Poste secondaire</span>
<select
className={inputClass}
value={secondaryPosition}
onChange={(event) => setSecondaryPosition(event.target.value as PlayerPosition)}
>
{POSITIONS.map((position) => (
<option key={position.value} value={position.value}>
{position.value} — {position.label}
</option>
))}
</select>
</label>

<div className="mb-5">
<span className={labelClass}>Style de jeu</span>
<div className="grid gap-2 sm:grid-cols-2">
{ARCHETYPES.map((item) => (
<button
key={item.value}
type="button"
onClick={() => setArchetype(item.value)}
className={`rounded-xl border p-3 text-left transition ${
archetype === item.value
? "border-emerald-400 bg-emerald-400/10"
: "border-white/10 bg-[#101827] hover:border-white/20"
}`}
>
<span className="block text-sm font-bold">{item.label}</span>
<span className="mt-1 block text-xs text-slate-400">{item.description}</span>
</button>
))}
</div>
</div>

<div>
<span className={labelClass}>Niveau de l'académie</span>
<div className="grid gap-2 sm:grid-cols-2">
{ACADEMIES.map((item) => (
<button
key={item.value}
type="button"
onClick={() => setAcademyLevel(item.value)}
className={`rounded-xl border p-3 text-left transition ${
academyLevel === item.value
? "border-emerald-400 bg-emerald-400/10"
: "border-white/10 bg-[#101827] hover:border-white/20"
}`}
>
<span className="block text-sm font-bold">{item.label}</span>
<span className="mt-1 block text-xs text-slate-400">{item.description}</span>
</button>
))}
</div>
</div>
</div>
)}

{error && (
<p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
{error}
</p>
)}

<div className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
{step > 1 ? (
<button
type="button"
onClick={() => {
setError("");
setStep((current) => current - 1);
}}
className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300"
>
<ArrowLeft size={16} />
Précédent
</button>
) : (
<span className="text-xs text-slate-500">Étape 1 sur 3</span>
)}

{step < 3 ? (
<button
type="button"
onClick={() => {
setError("");
if (step === 1 && (!firstName.trim() || !lastName.trim())) {
setError("Entre ton prénom et ton nom pour continuer.");
return;
}
setStep((current) => current + 1);
}}
className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-[#06110d] transition hover:bg-emerald-300"
>
Continuer
<ArrowRight size={16} />
</button>
) : (
<button
type="button"
onClick={handleCreatePlayer}
className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-[#06110d] transition hover:bg-emerald-300"
>
<Check size={17} />
Créer mon joueur
<Sparkles size={16} />
</button>
)}
</div>
</section>

<p className="mt-5 text-center text-xs leading-5 text-slate-500">
Ta carrière commence en académie. Les contrats professionnels devront se gagner sur le terrain.
</p>
</div>
</main>
);
    }

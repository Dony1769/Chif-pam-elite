"use client";

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

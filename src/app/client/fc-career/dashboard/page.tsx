"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
Activity,
Award,
BookOpen,
CalendarDays,
ChevronRight,
Dumbbell,
GraduationCap,
Heart,
Home,
MessageCircle,
Shield,
Sparkles,
Star,
Target,
TrendingUp,
Trophy,
User,
Users,
Zap,
} from "lucide-react";

import {
calculatePositionRating,
createInitialPlayer,
evaluatePlayerRole,
getAttributeCap,
TRAINING_FOCUS,
trainWeek,
} from "../engine";

import { evaluateCompetition } from "../competition";
import type { CompetitionStatus } from "../competition";

import { ALL_51_ATTRIBUTES } from "../constants";
import type { PlayerCareerState, TrainingFocus } from "../types";

import {
clearAllSaves,
loadGame,
saveGame,
} from "../utils/storage";

type DashboardTab =
| "accueil"
| "equipe"
| "attributs"
| "entrainement"
| "academie"
| "messages"
| "carriere";

type WeeklyEvent = NonNullable<PlayerCareerState["pendingEvent"]>;

const NAV_ITEMS: {
id: DashboardTab;
label: string;
icon: typeof Home;
}[] = [
{ id: "accueil", label: "Accueil", icon: Home },
{ id: "equipe", label: "Équipe", icon: Users },
{ id: "attributs", label: "Attributs", icon: Activity },
{ id: "entrainement", label: "Entraînement", icon: Dumbbell },
{ id: "academie", label: "Académie", icon: GraduationCap },
{ id: "messages", label: "Messages", icon: MessageCircle },
{ id: "carriere", label: "Carrière", icon: Trophy },
];

function getRatingColor(rating: number): string {
if (rating >= 75) return "text-emerald-400";
if (rating >= 60) return "text-cyan-400";
if (rating >= 45) return "text-yellow-400";
return "text-orange-400";
}

function getStageLabel(stage: PlayerCareerState["careerStage"]): string {
const labels: Record<PlayerCareerState["careerStage"], string> = {
academie: "Académie",
jeunes: "Équipe de jeunes",
reserve: "Équipe réserve",
professionnel: "Professionnel",
retraite: "Retraité",
};

return labels[stage];
}

function getPositionLabel(position: string): string {
const labels: Record<string, string> = {
GB: "Gardien",
DD: "Arrière droit",
DC: "Défenseur central",
DG: "Arrière gauche",
MDC: "Milieu défensif",
MC: "Milieu central",
MOC: "Milieu offensif",
AD: "Ailier droit",
AG: "Ailier gauche",
BU: "Buteur",
};

return labels[position] ?? position;
}

function getPotentialLabel(potential: number): string {
if (potential >= 90) return "Talent exceptionnel";
if (potential >= 80) return "Grand potentiel";
if (potential >= 70) return "Potentiel intéressant";
if (potential >= 60) return "Progression possible";
return "Potentiel à développer";
}

function getCompetitionStatusLabel(status: CompetitionStatus): string {
const labels: Record<CompetitionStatus, string> = {
titulaire: "Titulaire",
concurrent: "Concurrent direct",
remplacant: "Remplaçant",
hors_groupe: "Hors groupe",
};

return labels[status];
}

function getCompetitionStatusStyle(status: CompetitionStatus): string {
const styles: Record<CompetitionStatus, string> = {
titulaire:
"border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
concurrent:
"border-amber-400/30 bg-amber-400/10 text-amber-300",
remplacant:
"border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
hors_groupe:
"border-red-400/30 bg-red-400/10 text-red-300",
};

return styles[status];
}

function getCompetitionStatusDescription(status: CompetitionStatus): string {
const descriptions: Record<CompetitionStatus, string> = {
titulaire:
"Tu occupes actuellement la première place dans le classement de concurrence simulé. Maintiens ton niveau pour conserver ta place.",
concurrent:
"Tu es proche du onze. Une bonne séance, une meilleure forme et une relation solide avec le coach peuvent te faire gagner une place.",
remplacant:
"Tu es dans la rotation. Continue à progresser pour te rapprocher des titulaires.",
hors_groupe:
"Tu dois améliorer ton niveau et ta condition pour remonter dans la hiérarchie.",
};

return descriptions[status];
}

function clamp(value: number, min: number, max: number): number {
return Math.max(min, Math.min(max, value));
}

function createWeeklyEvent(
season: number,
week: number,
): WeeklyEvent {
const eventType = Math.floor(Math.random() * 3);
const suffix = `${season}-${week}`;

if (eventType === 0) {
return {
id: `coach-feedback-${suffix}`,
from: "coach",
title: "Discussion avec l’entraîneur",
body:
"Après l’entraînement, ton entraîneur te demande de venir discuter. Il estime que tu as du potentiel, mais il veut voir davantage de sérieux et de régularité. Comment réagis-tu ?",
choices: [
{
id: "accept",
label: "Accepter les critiques et travailler davantage",
},
{
id: "explain",
label: "Expliquer calmement ton point de vue",
},
{
id: "challenge",
label: "Lui demander de te faire confiance",
},
],
};
}

if (eventType === 1) {
return {
id: `teammate-challenge-${suffix}`,
from: "coach",
title: "La concurrence s’intensifie",
body:
"Un joueur de ton poste vient de réaliser plusieurs bons entraînements. L’entraîneur envisage de lui donner davantage de temps de jeu. Tu dois choisir comment réagir à cette concurrence.",
choices: [
{
id: "work",
label: "Montrer ton sérieux et redoubler d’efforts",
},
{
id: "teamwork",
label: "Aider ton coéquipier et renforcer l’esprit d’équipe",
},
{
id: "pressure",
label: "Demander immédiatement une occasion de jouer",
},
],
};
}

return {
id: `academy-opportunity-${suffix}`,
from: "coach",
title: "Une occasion de te distinguer",
body:
"L’académie prépare une évaluation des jeunes joueurs. Les entraîneurs remarqueront aussi bien les performances que l’attitude, la discipline et l’implication dans le groupe. Quelle est ta priorité ?",
choices: [
{
id: "discipline",
label: "Faire preuve d’une discipline exemplaire",
},
{
id: "ambition",
label: "Montrer ton ambition et prendre des initiatives",
},
{
id: "balance",
label: "Garder ton calme et miser sur la régularité",
},
],
};
}

function ProgressBar({
value,
color = "bg-emerald-400",
}: {
value: number;
color?: string;
}) {
const safeValue = clamp(value, 0, 100);

return (
<div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
<div
className={`h-full rounded-full transition-all duration-500 ${color}`}
style={{ width: `${safeValue}%` }}
/>
</div>
);
}

function StatCard({
label,
value,
detail,
icon: Icon,
}: {
label: string;
value: string | number;
detail: string;
icon: typeof Activity;
}) {
return (
<div className="rounded-2xl border border-white/10 bg-[#111b29] p-4">
<div className="mb-3 flex items-center justify-between">
<span className="text-xs text-slate-400">{label}</span>
<Icon size={17} className="text-emerald-400" />
</div>
<div className="text-2xl font-black text-white">{value}</div>
<div className="mt-1 text-xs text-slate-500">{detail}</div>
</div>
);
}

export default function CareerDashboardPage() {
const router = useRouter();

const [player, setPlayer] = useState<PlayerCareerState | null>(null);
const [activeTab, setActiveTab] = useState<DashboardTab>("accueil");
const [selectedFocus, setSelectedFocus] =
useState<TrainingFocus>("technique");
const [selectedCategory, setSelectedCategory] = useState("Attaque");
const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
null,
);
const [ready, setReady] = useState(false);
const [notice, setNotice] = useState("");

useEffect(() => {
if (typeof window === "undefined") return;

if (window.sessionStorage.getItem("fc_career_unlocked") !== "true") {
router.replace("/client/fc-career");
return;
}

const savedPlayer = loadGame();
const initialPlayer = savedPlayer ?? createInitialPlayer();

setPlayer(initialPlayer);
setReady(true);
}, [router]);

useEffect(() => {
if (!ready || !player) return;
saveGame(player);
}, [player, ready]);

const positionRating = useMemo(() => {
if (!player) return 0;

return calculatePositionRating(
player.physicalProfile.primaryPosition,
player.attributes,
);
}, [player]);

const roleEvaluation = useMemo(() => {
if (!player) return null;

return evaluatePlayerRole(player.attributes, player.coach);
}, [player]);

const competitionEvaluation = useMemo(() => {
if (!player) return null;

return evaluateCompetition(player);
}, [player]);

const rankedRivals = useMemo(() => {
if (!competitionEvaluation) return [];

return [...competitionEvaluation.rivals].sort(
(a, b) => b.selectionScore - a.selectionScore,
);
}, [competitionEvaluation]);

const unreadCount = useMemo(() => {
if (!player) return 0;

return player.inbox.filter((message) => !message.read).length;
}, [player]);

const groupedAttributes = useMemo(() => {
return ALL_51_ATTRIBUTES.filter(
(attribute) => attribute.category === selectedCategory,
);
}, [selectedCategory]);

const notify = useCallback((message: string) => {
setNotice(message);
window.setTimeout(() => setNotice(""), 2800);
}, []);

const handleTraining = useCallback(() => {
if (!player) return;

if (player.pendingEvent) {
notify("Réponds d’abord à l’événement en cours.");
setActiveTab("accueil");
return;
}

if (player.trainedThisWeek) {
notify("Tu as déjà effectué ta séance cette semaine.");
return;
}

const updated = trainWeek(player, selectedFocus);

setPlayer(updated);
notify(updated.lastTrainingNote ?? "Séance terminée.");
}, [player, selectedFocus, notify]);

const handleUpgrade = useCallback(
(attributeId: string) => {
if (!player) return;

if (player.pendingEvent) {
notify("Réponds d’abord à l’événement en cours.");
setActiveTab("accueil");
return;
}

if (player.skillPointsAvailable <= 0) {
notify("Tu n’as pas assez de points de progression.");
return;
}

const currentValue = player.attributes[attributeId] ?? 1;
const potential =
player.potential.attributePotentials[attributeId] ?? 99;

const cap = getAttributeCap(
attributeId,
player.heightCm,
player.weightKg,
);

const maximum = Math.min(potential, cap);

if (currentValue >= maximum) {
notify("Cet attribut a atteint sa limite actuelle.");
return;
}

setPlayer({
...player,
attributes: {
...player.attributes,
[attributeId]: currentValue + 1,
},
skillPointsAvailable: player.skillPointsAvailable - 1,
});

notify("Attribut amélioré de 1 point.");
},
[player, notify],
);

const handleEventChoice = useCallback(
(choiceId: string) => {
if (!player?.pendingEvent) return;

const event = player.pendingEvent;
const eventId = event.id;

let relationChange = 0;
let moralChange = 0;
let formChange = 0;
let imageChange = 0;
let followersChange = 0;
let fatigueChange = 0;
let result = "";

if (eventId.startsWith("coach-feedback-")) {
if (choiceId === "accept") {
relationChange = 8;
moralChange = 4;
formChange = 2;
result =
"Tu acceptes les remarques du coach. Il apprécie ton attitude et ta volonté de progresser.";
} else if (choiceId === "explain") {
relationChange = 3;
moralChange = 2;
result =
"Tu expliques ton point de vue calmement. Le coach respecte ton honnêteté, mais attend des résultats.";
} else {
relationChange = -5;
moralChange = 5;
formChange = 1;
result =
"Tu réclames davantage de confiance. Tu affiches ton ambition, mais le coach attend maintenant des preuves sur le terrain.";
}
} else if (eventId.startsWith("teammate-challenge-")) {
if (choiceId === "work") {
relationChange = 5;
moralChange = 3;
fatigueChange = 5;
result =
"Tu choisis le travail. Le coach remarque ton engagement, même si cette période demande davantage d’énergie.";
} else if (choiceId === "teamwork") {
relationChange = 4;
moralChange = 5;
imageChange = 2;
result =
"Tu aides ton coéquipier. Ton attitude renforce l’esprit d’équipe et améliore ton image au sein de l’académie.";
} else {
relationChange = -3;
moralChange = 2;
formChange = 2;
result =
"Tu demandes une occasion de jouer. Le coach comprend ton ambition, mais veut que tu confirmes ton niveau à l’entraînement.";
}
} else if (eventId.startsWith("academy-opportunity-")) {
if (choiceId === "discipline") {
relationChange = 5;
moralChange = 3;
imageChange = 3;
result =
"Ta discipline est remarquée. Tu renforces la confiance du coach et ton image dans l’académie.";
} else if (choiceId === "ambition") {
relationChange = 2;
moralChange = 5;
imageChange = 2;
followersChange = 5;
result =
"Tu prends des initiatives. Ton ambition est remarquée et ta réputation progresse légèrement.";
} else {
relationChange = 3;
moralChange = 4;
formChange = 2;
result =
"Tu restes concentré sur tes objectifs. Ta régularité rassure le coach et renforce ta confiance.";
}
} else {
result = "Tu as pris ta décision. La carrière continue.";
}

const updatedPlayer: PlayerCareerState = {
...player,
coach: {
...player.coach,
relation: clamp(player.coach.relation + relationChange, 0, 100),
},
reputation: {
...player.reputation,
moral: clamp(player.reputation.moral + moralChange, 0, 100),
image: clamp(player.reputation.image + imageChange, 0, 100),
followers: Math.max(
0,
player.reputation.followers + followersChange,
),
},
form: clamp(player.form + formChange, 0, 100),
fatigue: clamp(player.fatigue + fatigueChange, 0, 100),
pendingEvent: null,
inbox: [
{
id: `event-result-${event.id}-${choiceId}`,
from: event.from,
season: player.season,
week: player.week,
title: `Décision : ${event.title}`,
body: `${result}\n\nConséquences : relation coach ${relationChange >= 0 ? "+" : ""}${relationChange}, moral ${moralChange >= 0 ? "+" : ""}${moralChange}${formChange ? `, forme ${formChange > 0 ? "+" : ""}${formChange}` : ""}${fatigueChange ? `, fatigue ${fatigueChange > 0 ? "+" : ""}${fatigueChange}` : ""}${imageChange ? `, image ${imageChange > 0 ? "+" : ""}${imageChange}` : ""}${followersChange ? `, abonnés ${followersChange > 0 ? "+" : ""}${followersChange}` : ""}.`,
read: false,
},
...player.inbox,
],
};

setPlayer(updatedPlayer);
notify(result);
},
[player, notify],
);

const handleNextWeek = useCallback(() => {
if (!player) return;

if (player.pendingEvent) {
notify(
"Résous l’événement en cours avant de passer à la semaine suivante.",
);
setActiveTab("accueil");
return;
}

if (!player.trainedThisWeek) {
notify(
"Effectue ton entraînement ou choisis le repos avant de passer à la semaine suivante.",
);
setActiveTab("entrainement");
return;
}

const nextWeek = player.week >= 52 ? 1 : player.week + 1;
const nextSeason =
player.week >= 52 ? player.season + 1 : player.season;

const currentAcademy = player.academy;
const trainingSessions =
currentAcademy?.trainingSessionsCompleted ?? 0;

const evaluationScore = currentAcademy
? clamp(
Math.round(
positionRating * 0.65 +
player.coach.relation * 0.15 +
player.form * 0.1 +
Math.min(trainingSessions, 10),
),
0,
100,
)
: 0;

const promotionEligible = currentAcademy
? evaluationScore >= 75 && trainingSessions >= 10
: false;

const nextPlayer: PlayerCareerState = {
...player,
season: nextSeason,
week: nextWeek,
trainedThisWeek: false,
fatigue: Math.max(0, player.fatigue - 15),
form: clamp(player.form + 2, 0, 100),
injuryWeeks: Math.max(0, player.injuryWeeks - 1),
skillPointsAvailable: player.skillPointsAvailable + 1,
lastTrainingNote:
"Nouvelle semaine. Tu disposes d’un point de progression.",
academy: currentAcademy
? {
...currentAcademy,
evaluationScore,
promotionEligible,
}
: null,
inbox: [
{
id: `week-${nextSeason}-${nextWeek}-${Date.now()}`,
from: "systeme",
season: nextSeason,
week: nextWeek,
title: "Nouvelle semaine",
body: promotionEligible
? "Ton évaluation atteint le seuil requis et tu as terminé suffisamment de séances. Ton dossier est admissible à la promotion. La décision de promotion sera gérée par le système de carrière."
: "Une nouvelle semaine commence. Ta fatigue diminue et tu reçois un point de progression. Continue à t’entraîner pour améliorer ton évaluation.",
read: false,
},
...player.inbox,
],
};

// Un événement apparaît toutes les trois semaines.
// Un événement déjà en attente n'est jamais remplacé.
if (!nextPlayer.pendingEvent && nextWeek % 3 === 0) {
nextPlayer.pendingEvent = createWeeklyEvent(nextSeason, nextWeek);
}

setPlayer(nextPlayer);
setActiveTab("accueil");

notify(
nextPlayer.pendingEvent
? `Semaine ${nextWeek} : un événement demande ta décision.`
: `Semaine ${nextWeek} : tu reçois 1 point de progression.`,
);
}, [player, positionRating, notify]);

const handleMarkMessageRead = useCallback(
(messageId: string) => {
if (!player) return;

setPlayer({
...player,
inbox: player.inbox.map((message) =>
message.id === messageId
? { ...message, read: true }
: message,
),
});

setSelectedMessageId(messageId);
},
[player],
);

const handleResetCareer = useCallback(() => {
const confirmed = window.confirm(
"Attention : cette action effacera ta carrière sauvegardée. Continuer ?",
);

if (!confirmed) return;

clearAllSaves();

const freshPlayer = createInitialPlayer();

setPlayer(freshPlayer);
setActiveTab("accueil");
setSelectedMessageId(null);
notify("Nouvelle carrière créée.");
}, [notify]);

if (!ready || !player) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#080e17] text-white">
<div className="text-center">
<div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
<p className="text-sm text-slate-400">
Chargement de ta carrière...
</p>
</div>
</main>
);
}

const playerName = player.playerName || "Nouveau joueur";

const selectedMessage = player.inbox.find(
(message) => message.id === selectedMessageId,
);

return (
<main className="min-h-screen bg-[#080e17] pb-24 text-white">
<header className="sticky top-0 z-30 border-b border-white/10 bg-[#080e17]/95 backdrop-blur-xl">
<div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
<button
onClick={() => setActiveTab("accueil")}
className="flex items-center gap-2 text-left"
>
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-black">
<Trophy size={22} />
</div>
<div>
<div className="text-sm font-black tracking-wide">
FC CAREER <span className="text-emerald-400">27</span>
</div>
<div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
Deviens une légende
</div>
</div>
</button>

<div className="flex items-center gap-3">
<div className="hidden text-right sm:block">
<div className="text-xs font-bold">{playerName}</div>
<div className="text-[10px] text-slate-500">
Saison {player.season} · Semaine {player.week}
</div>
</div>
<button
onClick={() => setActiveTab("messages")}
className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5"
aria-label="Ouvrir les messages"
>
<MessageCircle size={19} />
{unreadCount > 0 && (
<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-black text-black">
{unreadCount}
</span>
)}
</button>
</div>
</div>
</header>

<div className="mx-auto max-w-6xl px-4 py-5">
{notice && (
<div
role="status"
aria-live="polite"
className="fixed left-1/2 top-20 z-50 w-[calc(100%-32px)] max-w-sm -translate-x-1/2 rounded-xl border border-emerald-400/30 bg-[#13271f] px-4 py-3 text-sm text-emerald-200 shadow-2xl"
>
{notice}
</div>
)}

{player.pendingEvent && (
<section className="mb-6 overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-[#302719] to-[#171b25] p-5 shadow-xl">
<div className="flex items-start gap-3">
<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
<Sparkles size={23} />
</div>
<div className="min-w-0 flex-1">
<div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
Événement de carrière · Décision requise
</div>
<h2 className="mt-2 text-xl font-black">
{player.pendingEvent.title}
</h2>
<p className="mt-3 text-sm leading-6 text-slate-300">
{player.pendingEvent.body}
</p>
</div>
</div>

<div className="mt-5 space-y-2">
{player.pendingEvent.choices.map((choice) => (
<button
key={choice.id}
onClick={() => handleEventChoice(choice.id)}
className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm font-bold transition hover:border-amber-300/50 hover:bg-amber-400/10"
>
<span>{choice.label}</span>
<ChevronRight
size={17}
className="shrink-0 text-amber-300"
/>
</button>
))}
</div>

<p className="mt-4 text-xs leading-5 text-slate-500">
Ta décision aura un effet sur ton parcours. Tu dois répondre à
cet événement avant de continuer.
</p>
</section>
)}

<div className="mb-5 flex items-center justify-between gap-3">
<div>
<p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
Saison {player.season} · Semaine {player.week}
</p>
<h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
{activeTab === "accueil" && "Ton parcours commence"}
{activeTab === "equipe" && "La concurrence dans ton équipe"}
{activeTab === "attributs" && "Tes attributs"}
{activeTab === "entrainement" && "Centre d’entraînement"}
{activeTab === "academie" && "Ton académie"}
{activeTab === "messages" && "Boîte de réception"}
{activeTab === "carriere" && "Dossier de carrière"}
</h1>
</div>
<div className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right sm:block">
<div className="text-[10px] uppercase tracking-wider text-slate-500">
Statut
</div>
<div className="text-sm font-bold text-emerald-300">
{getStageLabel(player.careerStage)}
</div>
</div>
</div>

{activeTab === "accueil" && (
<div className="space-y-5">
<section className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-[#143629] via-[#10231f] to-[#101724] p-5 sm:p-7">
<div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border-[28px] border-emerald-400/5" />
<div className="pointer-events-none absolute -bottom-20 right-24 h-56 w-56 rounded-full border border-white/5" />

<div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
<div>
<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
<Sparkles size={13} />
Jeune talent · Académie
</div>
<h2 className="max-w-xl text-3xl font-black leading-tight sm:text-4xl">
Chaque légende a
<span className="block text-emerald-400">un début.</span>
</h2>
<p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
Travaille tes qualités, gagne la confiance de ton entraîneur
et fais-toi une place dans le football.
</p>

<div className="mt-5 flex flex-wrap gap-2">
<button
onClick={() => setActiveTab("entrainement")}
className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
>
<Dumbbell size={17} />
S’entraîner
</button>
<button
onClick={() => setActiveTab("academie")}
className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
>
Voir l’académie
<ChevronRight size={16} />
</button>
</div>
</div>

<div className="mx-auto flex h-36 w-36 flex-col items-center justify-center rounded-full border-8 border-emerald-400/20 bg-black/20 sm:h-40 sm:w-40">
<div className={`text-5xl font-black ${getRatingColor(positionRating)}`}>
{positionRating}
</div>
<div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
Note au poste
</div>
<div className="mt-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
{player.physicalProfile.primaryPosition}
</div>
</div>
</div>
</section>

<section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
<StatCard
label="Potentiel"
value={player.potential.overallPotential}
detail={getPotentialLabel(player.potential.overallPotential)}
icon={Star}
/>
<StatCard
label="Points disponibles"
value={player.skillPointsAvailable}
detail="Pour améliorer tes attributs"
icon={Zap}
/>
<StatCard
label="Fatigue"
value={`${player.fatigue}%`}
detail={player.fatigue >= 70 ? "Récupération conseillée" : "État physique"}
icon={Activity}
/>
<StatCard
label="Moral"
value={`${player.reputation.moral}%`}
detail="Confiance et motivation"
icon={Heart}
/>
</section>

<section className="grid gap-5 lg:grid-cols-2">
<div className="rounded-2xl border border-white/10 bg-[#111b29] p-5">
<div className="mb-4 flex items-center justify-between">
<h3 className="font-black">Profil du joueur</h3>
<User size={19} className="text-emerald-400" />
</div>

<div className="flex items-center gap-4">
<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
<User size={30} />
</div>
<div className="min-w-0">
<div className="truncate text-lg font-black">{playerName}</div>
<div className="mt-1 text-sm text-slate-400">
{player.age} ans · {getPositionLabel(player.physicalProfile.primaryPosition)}
</div>
<div className="mt-1 text-xs text-slate-500">
Pied {player.physicalProfile.preferredFoot}
</div>
</div>
</div>

<div className="my-5 h-px bg-white/10" />

<div className="grid grid-cols-2 gap-4">
<div>
<div className="text-xs text-slate-500">Taille</div>
<div className="mt-1 font-bold">{player.heightCm} cm</div>
</div>
<div>
<div className="text-xs text-slate-500">Poids</div>
<div className="mt-1 font-bold">{player.weightKg} kg</div>
</div>
<div>
<div className="text-xs text-slate-500">Club actuel</div>
<div className="mt-1 font-bold">{player.clubName}</div>
</div>
<div>
<div className="text-xs text-slate-500">Compétition</div>
<div className="mt-1 text-sm font-bold">{player.division}</div>
</div>
</div>
</div>

<div className="rounded-2xl border border-white/10 bg-[#111b29] p-5">
<div className="mb-4 flex items-center justify-between">
<h3 className="font-black">Évaluation de l’entraîneur</h3>
<Shield size={19} className="text-emerald-400" />
</div>

<div className="mb-4">
<div className="text-lg font-black">{player.coach.name}</div>
<div className="mt-1 text-xs text-slate-500">
{player.coach.preferredFormation} · {player.coach.tacticalStyle}
</div>
</div>

<div className="space-y-4">
<div>
<div className="mb-2 flex justify-between text-xs">
<span className="text-slate-400">Relation avec le coach</span>
<span className="font-bold">{player.coach.relation}/100</span>
</div>
<ProgressBar value={player.coach.relation} />
</div>
<div>
<div className="mb-2 flex justify-between text-xs">
<span className="text-slate-400">Niveau au poste</span>
<span className="font-bold">{positionRating}/100</span>
</div>
<ProgressBar value={positionRating} color="bg-cyan-400" />
</div>
<div className="rounded-xl bg-white/5 p-3 text-sm leading-5 text-slate-300">
{roleEvaluation?.isStarter
? "Ton niveau peut te permettre de viser une place importante dans l’équipe."
: "Continue de progresser à l’entraînement pour gagner la confiance du coach."}
</div>
<button
onClick={() => setActiveTab("equipe")}
className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
>
Voir ta place dans l’équipe
<ChevronRight size={17} className="text-emerald-300" />
</button>
</div>
</div>
</section>

<section className="rounded-2xl border border-white/10 bg-[#111b29] p-5">
<div className="mb-4 flex items-center justify-between">
<h3 className="font-black">Progression rapide</h3>
<button
onClick={() => setActiveTab("attributs")}
className="text-xs font-bold text-emerald-400"
>
Tous les attributs →
</button>
</div>

<div className="grid gap-4 sm:grid-cols-2">
{ALL_51_ATTRIBUTES.slice(0, 6).map((attribute) => {
const value = player.attributes[attribute.id] ?? 1;
const potential =
player.potential.attributePotentials[attribute.id] ?? 99;

const cap = getAttributeCap(
attribute.id,
player.heightCm,
player.weightKg,
);

const maximum = Math.min(potential, cap);

return (
<div key={attribute.id}>
<div className="mb-2 flex items-center justify-between gap-3">
<span className="text-sm text-slate-300">
{attribute.name}
</span>
<span className={`text-sm font-black ${getRatingColor(value)}`}>
{value}
</span>
</div>
<ProgressBar value={value} />
<div className="mt-1 text-right text-[10px] text-slate-500">
Maximum actuel : {maximum}
</div>
</div>
);
})}
</div>
</section>

<section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
<div>
<div className="flex items-center gap-2 font-black">
<CalendarDays size={18} className="text-emerald-400" />
Passer à la semaine suivante
</div>
<p className="mt-1 text-sm text-slate-400">
Termine ta séance ou choisis le repos avant de valider la semaine.
</p>
<p className="mt-1 text-xs text-slate-500">
Récompense : 1 point de progression par semaine.
</p>
</div>
<button
onClick={handleNextWeek}
disabled={Boolean(player.pendingEvent)}
className="shrink-0 rounded-xl bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
>
Semaine suivante →
</button>
</div>
</section>
</div>
)}

{activeTab === "equipe" && competitionEvaluation && (
<div className="space-y-5">
<section className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-[#143629] via-[#10231f] to-[#101724] p-5 sm:p-7">
<div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
<div className="max-w-xl">
<div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
<Users size={13} />
Hiérarchie de l’équipe
</div>
<h2 className="mt-3 text-2xl font-black sm:text-3xl">
Gagne ta place dans le onze
</h2>
<p className="mt-3 text-sm leading-6 text-slate-300">
Ton classement dépend de ton niveau au poste, de ta forme,
de ta fatigue, de ta relation avec le coach et de ta séance
hebdomadaire. Les résultats évoluent avec ta carrière.
</p>
</div>

<div className="flex h-36 w-36 shrink-0 flex-col items-center justify-center self-center rounded-full border-8 border-emerald-400/20 bg-black/20">
<div className="text-4xl font-black text-emerald-300">
{competitionEvaluation.rank}
<span className="text-lg text-slate-500">
/{competitionEvaluation.totalPlayers}
</span>
</div>
<div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
Classement
</div>
</div>
</div>
</section>

<section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
<StatCard
label="Statut actuel"
value={getCompetitionStatusLabel(competitionEvaluation.status)}
detail="Dans la hiérarchie"
icon={Award}
/>
<StatCard
label="Note de sélection"
value={competitionEvaluation.playerScore}
detail="Niveau estimé pour le coach"
icon={Target}
/>
<StatCard
label="Chance de débuter"
value={`${competitionEvaluation.chanceOfStarting}%`}
detail="Estimation de sélection"
icon={TrendingUp}
/>
<StatCard
label="Concurrents"
value={competitionEvaluation.rivals.length}
detail="Joueurs simulés"
icon={Users}
/>
</section>

<section className="rounded-2xl border border-white/10 bg-[#111b29] p-5">
<div className="flex flex-wrap items-start justify-between gap-3">
<div>
<h3 className="text-lg font-black">Ton statut dans l’équipe</h3>
<p className="mt-1 text-sm text-slate-400">
Poste : {getPositionLabel(player.physicalProfile.primaryPosition)}
</p>
</div>
<span
className={`rounded-full border px-3 py-1.5 text-xs font-black ${getCompetitionStatusStyle(competitionEvaluation.status)}`}
>
{getCompetitionStatusLabel(competitionEvaluation.status)}
</span>
</div>

<p className="mt-4 text-sm leading-6 text-slate-300">
{player.injuryWeeks > 0
? `Tu es blessé pour encore ${player.injuryWeeks} semaine(s). Tu ne peux pas être sélectionné tant que tu n’es pas rétabli.`
: competitionEvaluation.explanation}
</p>

<div className="mt-5">
<div className="mb-2 flex items-center justify-between text-xs">
<span className="text-slate-400">Estimation de sélection</span>
<span className="font-bold">
{competitionEvaluation.chanceOfStarting}%
</span>
</div>
<ProgressBar
value={competitionEvaluation.chanceOfStarting}
color={
competitionEvaluation.chanceOfStarting >= 70
? "bg-emerald-400"
: competitionEvaluation.chanceOfStarting >= 40
? "bg-amber-400"
: "bg-red-400"
}
/>
</div>

<div className="mt-5 rounded-xl bg-white/5 p-4 text-sm leading-6 text-slate-300">
{getCompetitionStatusDescription(competitionEvaluation.status)}
</div>

<div className="mt-4 grid gap-3 sm:grid-cols-2">
<div className="rounded-xl border border-white/10 bg-black/10 p-4">
<div className="text-xs text-slate-500">Forme actuelle</div>
<div className="mt-2 text-xl font-black">
{player.form}
<span className="text-sm text-slate-500">/100</span>
</div>
<div className="mt-3">
<ProgressBar
value={player.form}
color="bg-cyan-400"
/>
</div>
</div>
<div className="rounded-xl border border-white/10 bg-black/10 p-4">
<div className="text-xs text-slate-500">Fatigue actuelle</div>
<div className="mt-2 text-xl font-black">
{player.fatigue}
<span className="text-sm text-slate-500">/100</span>
</div>
<div className="mt-3">
<ProgressBar
value={player.fatigue}
color={player.fatigue >= 70 ? "bg-red-400" : "bg-amber-400"}
/>
</div>
</div>
</div>

<div className="mt-4 flex flex-col gap-2 sm:flex-row">
<button
onClick={() => setActiveTab("entrainement")}
className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
>
<Dumbbell size={17} />
Préparer ma séance
</button>
<button
onClick={() => setActiveTab("attributs")}
className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
>
<TrendingUp size={17} />
Améliorer mes attributs
</button>
</div>
</section>

<section className="rounded-2xl border border-white/10 bg-[#111b29] p-5">
<div className="mb-4">
<h3 className="text-lg font-black">Les joueurs qui te concurrencent</h3>
<p className="mt-1 text-sm leading-5 text-slate-400">
Classement simulé des joueurs de l’équipe. Leur niveau,
leur forme et leur fatigue influencent leur score.
</p>
</div>

<div className="space-y-3">
<div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4">
<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-sm font-black text-black">
{competitionEvaluation.rank}
</div>
<div className="min-w-0 flex-1">
<div className="truncate font-black">{playerName} (toi)</div>
<div className="mt-1 text-xs text-slate-400">
{getPositionLabel(player.physicalProfile.primaryPosition)}
{" · "}Note au poste {positionRating}
</div>
</div>
<div className="text-right">
<div className="text-xl font-black text-emerald-300">
{competitionEvaluation.playerScore}
</div>
<div className="text-[10px] text-slate-500">Score</div>
</div>
</div>

{rankedRivals.map((rival, index) => (
<div
key={rival.id}
className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-4"
>
<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm font-black text-slate-300">
{index + 1 + (index >= competitionEvaluation.rank - 1 ? 1 : 0)}
</div>
<div className="min-w-0 flex-1">
<div className="truncate font-bold">{rival.name}</div>
<div className="mt-1 text-xs text-slate-400">
{getPositionLabel(rival.position)}
{" · "}Forme {rival.form}
{" · "}Fatigue {rival.fatigue}
</div>
<span
className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${getCompetitionStatusStyle(rival.status)}`}
>
{getCompetitionStatusLabel(rival.status)}
</span>
</div>
<div className="text-right">
<div className={`text-xl font-black ${getRatingColor(rival.overallRating)}`}>
{rival.overallRating}
</div>
<div className="text-[10px] text-slate-500">Note</div>
<div className="mt-1 text-xs text-slate-400">
Score {rival.selectionScore}
</div>
</div>
</div>
))}
</div>
</section>

<section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
<div className="flex items-start gap-3">
<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
<Sparkles size={21} />
</div>
<div>
<h3 className="font-black">Comment gagner des places ?</h3>
<ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
<li>• Entraîne-toi chaque semaine pour améliorer ton niveau.</li>
<li>• Choisis le repos si ta fatigue est trop élevée.</li>
<li>• Entretiens une bonne relation avec ton entraîneur.</li>
<li>• Améliore les attributs qui comptent pour ton poste.</li>
<li>• Récupère complètement avant de chercher une sélection si tu es blessé.</li>
</ul>
</div>
</div>
</section>
</div>
)}

{activeTab === "attributs" && (
<div className="space-y-5">
<section className="rounded-2xl border border-white/10 bg-[#111b29] p-5">
<div className="flex flex-wrap items-center justify-between gap-3">
<div>
<h2 className="text-lg font-black">Développement du joueur</h2>
<p className="mt-1 text-sm text-slate-400">
Chaque attribut possède sa propre valeur et une limite de progression.
</p>
</div>
<div className="rounded-xl bg-emerald-400/10 px-4 py-3 text-center">
<div className="text-2xl font-black text-emerald-300">
{player.skillPointsAvailable}
</div>
<div className="text-[10px] uppercase tracking-wider text-slate-400">
Points disponibles
</div>
</div>
</div>
</section>

<div className="flex gap-2 overflow-x-auto pb-2">
{Array.from(
new Set(ALL_51_ATTRIBUTES.map((attribute) => attribute.category)),
).map((category) => (
<button
key={category}
onClick={() => setSelectedCategory(category)}
className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition ${
selectedCategory === category
? "border-emerald-400 bg-emerald-400 text-black"
: "border-white/10 bg-white/5 text-slate-300"
}`}
>
{category}
</button>
))}
</div>

<section className="grid gap-3 sm:grid-cols-2">
{groupedAttributes.map((attribute) => {
const value = player.attributes[attribute.id] ?? 1;
const potential =
player.potential.attributePotentials[attribute.id] ?? 99;

const cap = getAttributeCap(
attribute.id,
player.heightCm,
player.weightKg,
);

const maximum = Math.min(potential, cap);
const reachedLimit = value >= maximum;

return (
<div
key={attribute.id}
className="rounded-2xl border border-white/10 bg-[#111b29] p-4"
>
<div className="flex items-start justify-between gap-3">
<div>
<div className="font-bold">{attribute.name}</div>
<div className="mt-1 text-xs leading-5 text-slate-500">
{attribute.description}
</div>
</div>
<div className={`text-2xl font-black ${getRatingColor(value)}`}>
{value}
</div>
</div>

<div className="mt-4">
<ProgressBar value={value} />
</div>

<div className="mt-3 flex flex-wrap items-center justify-between gap-2">
<span className="text-[10px] leading-5 text-slate-500">
Potentiel : {potential} · Limite physique : {cap} · Maximum actuel : {maximum}
</span>
<button
onClick={() => handleUpgrade(attribute.id)}
disabled={
reachedLimit ||
player.skillPointsAvailable <= 0 ||
Boolean(player.pendingEvent)
}
className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
>
{reachedLimit ? "Maximum" : "+1"}
</button>
</div>
</div>
);
})}
</section>
</div>
)}

{activeTab === "entrainement" && (
<div className="space-y-5">
<section className="rounded-2xl border border-white/10 bg-[#111b29] p-5">
<div className="flex items-center gap-3">
<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
<Dumbbell size={24} />
</div>
<div>
<h2 className="font-black">Séance hebdomadaire</h2>
<p className="text-sm text-slate-400">
Choisis une spécialité pour orienter ta progression.
</p>
</div>
</div>

<div className="mt-5 grid gap-3 sm:grid-cols-2">
{(Object.keys(TRAINING_FOCUS) as TrainingFocus[]).map((focus) => {
const training = TRAINING_FOCUS[focus];
const selected = selectedFocus === focus;

return (
<button
key={focus}
onClick={() => setSelectedFocus(focus)}
disabled={player.trainedThisWeek || Boolean(player.pendingEvent)}
className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
selected
? "border-emerald-400 bg-emerald-400/10"
: "border-white/10 bg-white/[0.02] hover:bg-white/5"
}`}
>
<div className="flex items-center justify-between gap-2">
<span className="font-black">{training.label}</span>
{selected && (
<span className="text-xs text-emerald-300">
Sélectionné
</span>
)}
</div>
<p className="mt-2 text-sm leading-5 text-slate-400">
{training.description}
</p>
<div className="mt-3 text-xs text-slate-500">
{focus === "repos"
? "Récupération de la fatigue"
: `Fatigue estimée : +${training.fatigue}%`}
</div>
</button>
);
})}
</div>

<div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
<div className="mb-2 flex items-center justify-between text-sm">
<span className="text-slate-400">Fatigue actuelle</span>
<span className="font-bold">{player.fatigue}%</span>
</div>
<ProgressBar
value={player.fatigue}
color={player.fatigue >= 70 ? "bg-orange-400" : "bg-cyan-400"}
/>
<p className="mt-3 text-xs leading-5 text-slate-500">
Les séances physiques augmentent davantage la fatigue.
Le repos favorise la récupération.
</p>
</div>

{player.pendingEvent ? (
<div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
<div className="font-bold text-amber-300">
Événement en attente
</div>
<p className="mt-1 text-sm text-slate-400">
Réponds à l’événement affiché en haut de l’écran avant de reprendre l’entraînement.
</p>
<button
onClick={() => setActiveTab("accueil")}
className="mt-4 w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-black"
>
Voir l’événement
</button>
</div>
) : player.trainedThisWeek ? (
<div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
<div className="font-bold text-emerald-300">
Séance de cette semaine terminée
</div>
<p className="mt-1 text-sm text-slate-400">
{player.lastTrainingNote}
</p>
<button
onClick={handleNextWeek}
className="mt-4 w-full rounded-xl bg-emerald-400 px-4 py-3 font-black text-black"
>
Passer à la semaine suivante
</button>
</div>
) : (
<button
onClick={handleTraining}
className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-black text-black transition hover:bg-emerald-300"
>
<Zap size={18} />
Confirmer la séance
</button>
)}
</section>
</div>
)}

{activeTab === "academie" && (
<div className="space-y-5">
<section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#142b27] to-[#111b29] p-5 sm:p-7">
<div className="flex items-start gap-4">
<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
<GraduationCap size={30} />
</div>
<div>
<div className="text-xs font-bold uppercase tracking-widest text-emerald-300">
Centre de formation
</div>
<h2 className="mt-2 text-2xl font-black">
{player.academy?.academyName ?? player.clubName}
</h2>
<p className="mt-2 text-sm leading-6 text-slate-400">
Construis tes bases, accumule de l’expérience et démontre que tu es prêt pour le niveau supérieur.
</p>
</div>
</div>
</section>

<section className="grid grid-cols-2 gap-3">
<StatCard
label="Niveau"
value={player.academy?.academyLevel ?? "local"}
detail="Catégorie de l’académie"
icon={Award}
/>
<StatCard
label="Évaluation"
value={`${player.academy?.evaluationScore ?? 0}/100`}
detail="Appréciation actuelle"
icon={Target}
/>
<StatCard
label="Séances effectuées"
value={player.academy?.trainingSessionsCompleted ?? 0}
detail="Entraînements terminés"
icon={Dumbbell}
/>
<StatCard
label="Matchs de jeunes"
value={player.academy?.youthMatchesPlayed ?? 0}
detail="Expérience en compétition"
icon={Users}
/>
</section>

<section className="rounded-2xl border border-white/10 bg-[#111b29] p-5">
<h3 className="mb-4 font-black">Objectifs de formation</h3>
<div className="space-y-4">
<div>
<div className="mb-2 flex justify-between text-sm">
<span className="text-slate-300">Séances d’entraînement</span>
<span className="text-slate-400">
{player.academy?.trainingSessionsCompleted ?? 0}/10
</span>
</div>
<ProgressBar
value={(player.academy?.trainingSessionsCompleted ?? 0) * 10}
/>
</div>
<div>
<div className="mb-2 flex justify-between text-sm">
<span className="text-slate-300">Évaluation de l’académie</span>
<span className="text-slate-400">
{player.academy?.evaluationScore ?? 0}/100
</span>
</div>
<ProgressBar
value={player.academy?.evaluationScore ?? 0}
color="bg-cyan-400"
/>
</div>
</div>

<div className="mt-5 rounded-xl bg-white/5 p-4 text-sm leading-6 text-slate-300">
{player.academy?.promotionEligible
? "Ton évaluation atteint le seuil requis et tu as terminé suffisamment de séances. Ton dossier est admissible à la promotion. Le changement réel d’équipe sera ajouté à l’étape dédiée à la promotion."
: "Améliore ton niveau, entretiens ta relation avec le coach et termine au moins 10 séances. Une évaluation de 75/100 est nécessaire pour être admissible à la promotion."}
</div>
</section>
</div>
)}

{activeTab === "messages" && (
<div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
<section className="space-y-2">
{player.inbox.length === 0 && (
<div className="rounded-2xl border border-white/10 bg-[#111b29] p-6 text-center text-sm text-slate-400">
Aucun message pour le moment.
</div>
)}

{player.inbox.map((message) => (
<button
key={message.id}
onClick={() => handleMarkMessageRead(message.id)}
className={`w-full rounded-2xl border p-4 text-left transition ${
selectedMessageId === message.id
? "border-emerald-400/50 bg-emerald-400/5"
: "border-white/10 bg-[#111b29] hover:bg-white/5"
}`}
>
<div className="flex items-start gap-3">
<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-emerald-300">
<MessageCircle size={19} />
</div>
<div className="min-w-0 flex-1">
<div className="flex items-center justify-between gap-2">
<span className="truncate text-sm font-black">
{message.title}
</span>
{!message.read && (
<span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
)}
</div>
<div className="mt-1 text-xs capitalize text-slate-500">
{message.from} · Saison {message.season}, semaine {message.week}
</div>
<p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
{message.body}
</p>
</div>
</div>
</button>
))}
</section>

<section className="min-h-56 rounded-2xl border border-white/10 bg-[#111b29] p-5">
{selectedMessage ? (
<>
<div className="text-xs uppercase tracking-widest text-emerald-300">
Message · {selectedMessage.from}
</div>
<h2 className="mt-3 text-xl font-black">
{selectedMessage.title}
</h2>
<p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">
{selectedMessage.body}
</p>
<div className="mt-6 border-t border-white/10 pt-4 text-xs text-slate-500">
Saison {selectedMessage.season} · Semaine {selectedMessage.week}
</div>
</>
) : (
<div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
<BookOpen size={30} className="text-slate-600" />
<p className="mt-3 text-sm text-slate-400">
Sélectionne un message pour le lire.
</p>
</div>
)}
</section>
</div>
)}

{activeTab === "carriere" && (
<div className="space-y-5">
<section className="rounded-2xl border border-white/10 bg-[#111b29] p-5">
<div className="flex items-center gap-3">
<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
<Trophy size={24} />
</div>
<div>
<h2 className="text-lg font-black">Dossier de carrière</h2>
<p className="text-sm text-slate-400">
L’historique de ton parcours footballistique.
</p>
</div>
</div>

<div className="my-5 h-px bg-white/10" />

<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
<StatCard
label="Âge"
value={`${player.age} ans`}
detail={getStageLabel(player.careerStage)}
icon={User}
/>
<StatCard
label="Matchs"
value={player.careerStats.matches}
detail="Carrière entière"
icon={Activity}
/>
<StatCard
label="Buts"
value={player.careerStats.goals}
detail="Carrière entière"
icon={Target}
/>
<StatCard
label="Passes décisives"
value={player.careerStats.assists}
detail="Carrière entière"
icon={TrendingUp}
/>
<StatCard
label="Réputation"
value={player.reputation.niveau}
detail="Niveau actuel"
icon={Star}
/>
<StatCard
label="Abonnés"
value={player.reputation.followers}
detail="Popularité"
icon={Users}
/>
</div>
</section>

<section className="rounded-2xl border border-white/10 bg-[#111b29] p-5">
<h3 className="font-black">Informations du contrat</h3>
{player.contract ? (
<div className="mt-4 space-y-2 text-sm text-slate-300">
<p>Club : {player.contract.clubName}</p>
<p>Type : {player.contract.type}</p>
<p>Début : saison {player.contract.startSeason}</p>
<p>Durée : {player.contract.durationSeasons} saison(s)</p>
<p>Salaire hebdomadaire : {player.contract.weeklySalary}</p>
</div>
) : (
<p className="mt-3 text-sm leading-6 text-slate-400">
Tu commences ton parcours à l’académie. Les contrats, les agents,
les transferts et les négociations seront ajoutés dans les prochaines étapes.
</p>
)}
</section>

<section className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
<h3 className="font-black text-red-300">Gestion de la sauvegarde</h3>
<p className="mt-2 text-sm leading-6 text-slate-400">
Réinitialiser la carrière efface la progression sauvegardée sur ce navigateur.
Cette action ne peut pas être annulée.
</p>
<button
onClick={handleResetCareer}
className="mt-4 rounded-xl border border-red-400/30 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400/10"
>
Réinitialiser la carrière
</button>
</section>
</div>
)}
</div>

<nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#080e17]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
<div className="mx-auto flex max-w-3xl items-stretch justify-around px-1 py-2">
{NAV_ITEMS.map((item) => {
const Icon = item.icon;
const active = activeTab === item.id;

return (
<button
key={item.id}
onClick={() => setActiveTab(item.id)}
className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition ${
active
? "text-emerald-300"
: "text-slate-500 hover:text-slate-300"
}`}
>
<div className="relative">
<Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
{item.id === "messages" && unreadCount > 0 && (
<span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-emerald-400" />
)}
</div>
<span className="max-w-full truncate text-[9px] font-bold sm:text-[10px]">
{item.label}
</span>
{active && (
<span className="absolute bottom-0 h-0.5 w-6 rounded-full bg-emerald-400" />
)}
</button>
);
})}
</div>
</nav>
</main>
);
  }

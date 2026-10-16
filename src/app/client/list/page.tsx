"use client";

import React, {
memo,
useCallback,
useEffect,
useMemo,
useState,
} from "react";
import { useRouter } from "next/navigation";
import {
Search,
Heart,
Zap,
Layers,
Target,
Grid,
Fingerprint,
Brain,
Lock,
ChevronLeft,
Star,
Users,
ShoppingBag,
Sparkles,
Play,
X,
Flame,
Dices,
Filter,
type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";

// ==========================================
// 1. TYPES ET INTERFACES
// ==========================================

export interface GameConfig {
id: string;
name: string;
desc: string;
path: string;
icon: LucideIcon;
iconColor: string;
color: string;
players: string;
category: string;
isHot?: boolean;
isNew?: boolean;
}

// ==========================================
// 2. CONFIGURATION DES JEUX
// ==========================================

const GAMES: GameConfig[] = [
{
id: "crash",
name: "Signal Growth",
desc: "Lecture de tendance & timing",
path: "/client/crash",
icon: Zap,
iconColor: "text-amber-400",
color: "from-amber-500/20 via-amber-500/5",
players: "1,248",
category: "Analyse",
isHot: true,
},
{
id: "squidglass",
name: "Squid Glass",
desc: "Décision séquentielle",
path: "/client/squidglass",
icon: Layers,
iconColor: "text-rose-500",
color: "from-rose-500/20 via-rose-500/5",
players: "942",
category: "Agilité",
},
{
id: "plinko",
name: "Plinko Matrix",
desc: "Simulation dynamique",
path: "/client/plinko",
icon: Target,
iconColor: "text-blue-400",
color: "from-blue-500/20 via-blue-500/5",
players: "1,105",
category: "Exploration",
},
{
id: "mines",
name: "Mines Grid",
desc: "Choix progressifs à risque",
path: "/client/mines",
icon: Grid,
iconColor: "text-emerald-500",
color: "from-emerald-500/20 via-emerald-500/5",
players: "856",
category: "Stratégie",
isHot: true,
},
{
id: "biometric",
name: "Biometric Lab",
desc: "Agilité visuelle extrême",
path: "/client/biometric-hack",
icon: Fingerprint,
iconColor: "text-cyan-400",
color: "from-cyan-500/20 via-cyan-500/5",
players: "652",
category: "Réflexes",
isNew: true,
},
{
id: "quiz",
name: "Quiz Insights",
desc: "Connaissance active & rapidité",
path: "/client/quiz",
icon: Brain,
iconColor: "text-purple-400",
color: "from-purple-500/20 via-purple-500/5",
players: "3,012",
category: "Savoir",
isHot: true,
},
{
id: "laser",
name: "Laser Vault",
desc: "Précision adaptative",
path: "/client/laser-vault",
icon: Lock,
iconColor: "text-orange-500",
color: "from-orange-500/20 via-orange-500/5",
players: "2,094",
category: "Précision",
isNew: true,
},
{
id: "uno",
name: "UNO Live",
desc: "Cartes, stratégie et pot CP",
path: "/client/uno",
icon: Dices,
iconColor: "text-fuchsia-400",
color: "from-fuchsia-500/20 via-fuchsia-500/5",
players: "Live",
category: "Stratégie",
isNew: true,
},

];

// ==========================================
// 3. CATÉGORIES ET CONSTANTES
// ==========================================

const CATEGORIES = [
"Tous",
"Favoris",
"Stratégie",
"Réflexes",
"Analyse",
"Savoir",
"Précision",
];

const STORAGE_FAV_KEY = "fav_games";

// ==========================================
// 4. COMPOSANT PRINCIPAL
// ==========================================

export default function GameListPage() {
const router = useRouter();

const [search, setSearch] = useState("");
const [selectedCategory, setSelectedCategory] = useState("Tous");
const [favorites, setFavorites] = useState<string[]>([]);
const [isHydrated, setIsHydrated] = useState(false);

// ------------------------------------------
// Chargement des favoris
// ------------------------------------------

useEffect(() => {
try {
const saved = window.localStorage.getItem(STORAGE_FAV_KEY);

  if (saved) {
    const parsed: unknown = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      const validIds = new Set(GAMES.map((game) => game.id));

      const validFavorites = parsed.filter(
        (item): item is string =>
          typeof item === "string" && validIds.has(item)
      );

      setFavorites([...new Set(validFavorites)]);
    }
  }
} catch (error) {
  console.error(
    "Impossible de charger les favoris :",
    error
  );
} finally {
  setIsHydrated(true);
}

}, []);

// ------------------------------------------
// Sauvegarde des favoris
// ------------------------------------------

const toggleFavorite = useCallback(
(event: React.MouseEvent<HTMLButtonElement>, id: string) => {
event.stopPropagation();

  setFavorites((previousFavorites) => {
    const updatedFavorites = previousFavorites.includes(id)
      ? previousFavorites.filter((favoriteId) => favoriteId !== id)
      : [...previousFavorites, id];

    try {
      window.localStorage.setItem(
        STORAGE_FAV_KEY,
        JSON.stringify(updatedFavorites)
      );
    } catch (error) {
      console.error(
        "Impossible de sauvegarder les favoris :",
        error
      );
    }

    return updatedFavorites;
  });
},
[]

);

// ------------------------------------------
// Recherche et filtrage
// ------------------------------------------

const filteredGames = useMemo(() => {
const normalizedSearch = search.trim().toLocaleLowerCase();

return GAMES.filter((game) => {
  const matchesSearch =
    normalizedSearch === "" ||
    game.name.toLocaleLowerCase().includes(normalizedSearch) ||
    game.category.toLocaleLowerCase().includes(normalizedSearch) ||
    game.desc.toLocaleLowerCase().includes(normalizedSearch);

  if (!matchesSearch) {
    return false;
  }

  if (selectedCategory === "Tous") {
    return true;
  }

  if (selectedCategory === "Favoris") {
    return favorites.includes(game.id);
  }

  return (
    game.category.toLocaleLowerCase() ===
    selectedCategory.toLocaleLowerCase()
  );
});

}, [search, selectedCategory, favorites]);

// ------------------------------------------
// Navigation
// ------------------------------------------

const handleRandomPlay = useCallback(() => {
// Respecte les filtres et la recherche.
// Si aucun jeu ne correspond, ne redirige pas
// vers un jeu qui ne correspond pas aux critères.
if (filteredGames.length === 0) {
return;
}

const randomIndex = Math.floor(
  Math.random() * filteredGames.length
);

router.push(filteredGames[randomIndex].path);

}, [filteredGames, router]);

const resetFilters = useCallback(() => {
setSearch("");
setSelectedCategory("Tous");
}, []);

// ------------------------------------------
// Rendu
// ------------------------------------------

return (
<div className="min-h-screen bg-[#020617] pb-36 font-sans text-white selection:bg-emerald-500 selection:text-black">
{/* LUMIÈRES DE FOND */}
<div
className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
aria-hidden="true"
>
<div className="absolute -top-40 left-1/2 h-[350px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[120px]" />

    <div className="absolute -right-20 top-1/3 h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-[100px]" />
  </div>

  {/* EN-TÊTE FIXE */}
  <header className="sticky top-0 z-40 border-b border-white/10 bg-[#020617]/85 px-5 py-3.5 backdrop-blur-2xl transition-all">
    <div className="mx-auto flex max-w-6xl items-center justify-between">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-white/10 active:scale-95"
        aria-label="Retourner à la page précédente"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.35em] text-emerald-400">
          Game Center
        </p>

        <h1 className="text-xl font-black uppercase italic tracking-tight text-white">
          Chif{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            Play
          </span>
        </h1>
      </div>

      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
        <Star
          size={18}
          className="fill-emerald-400/20 text-emerald-400"
        />
      </div>
    </div>
  </header>

  {/* CONTENU PRINCIPAL */}
  <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-6 sm:px-6">
    {/* BANNIÈRE PRINCIPALE */}
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-emerald-950/40 p-6 shadow-2xl backdrop-blur-md"
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
            <Sparkles size={12} className="text-emerald-400" />
            Arène officielle
          </div>

          <h2 className="text-2xl font-black uppercase italic leading-none tracking-tight text-white sm:text-3xl">
            Prêt à relever le défi ?
          </h2>

          <p className="mt-2.5 text-xs font-normal leading-relaxed text-slate-300/90 sm:text-sm">
            Choisissez un module, perfectionnez votre stratégie et
            accumulez des points d'expérience.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRandomPlay}
          disabled={filteredGames.length === 0}
          className="group relative flex shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-4 font-black uppercase italic tracking-wider text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          <Dices
            size={20}
            className="transition-transform duration-500 group-hover:rotate-180"
          />

          <span className="text-xs">Jeu aléatoire</span>
        </button>
      </div>
    </motion.section>

    {/* BARRE DE RECHERCHE */}
    <div className="group relative">
      <div className="absolute -inset-0.5 rounded-[24px] bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 opacity-0 blur transition-all duration-300 group-focus-within:opacity-100" />

      <div className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-4 text-slate-500 transition-colors group-focus-within:text-emerald-400"
          size={18}
        />

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="RECHERCHER UN JEU OU UNE CATÉGORIE..."
          aria-label="Rechercher un jeu ou une catégorie"
          className="w-full rounded-[22px] border border-white/10 bg-slate-900/80 py-4 pl-12 pr-10 text-xs font-bold tracking-wider text-white outline-none backdrop-blur-xl transition-all placeholder:text-slate-500 focus:border-emerald-500/50"
        />

        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3.5 rounded-full p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Effacer la recherche"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>

    {/* FILTRES */}
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <Filter
        size={14}
        className="mr-1 shrink-0 text-slate-500"
      />

      {CATEGORIES.map((category) => {
        const isActive = selectedCategory === category;

        return (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            aria-pressed={isActive}
            className={`shrink-0 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
              isActive
                ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "border border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {category}

            {category === "Favoris" &&
              isHydrated &&
              favorites.length > 0 &&
              ` (${favorites.length})`}
          </button>
        );
      })}
    </div>

    {/* GRILLE DES JEUX */}
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
          {selectedCategory === "Tous"
            ? "Tous les jeux disponibles"
            : `Catégorie : ${selectedCategory}`}{" "}
          ({filteredGames.length})
        </h3>

        <button
          type="button"
          onClick={() => router.push("/live")}
          className="shrink-0 text-[10px] font-black uppercase tracking-widest text-fuchsia-300 transition hover:text-fuchsia-200"
        >
          Jeux Live →
        </button>
      </div>

      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              isFavorite={favorites.includes(game.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-12 text-center text-slate-400 backdrop-blur-md">
          <Search
            size={32}
            className="mx-auto mb-4 text-slate-600"
          />

          <p className="text-sm font-bold uppercase tracking-wider">
            Aucun jeu ne correspond à vos critères.
          </p>

          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 text-xs font-black uppercase text-emerald-400 underline underline-offset-4 transition-colors hover:text-emerald-300"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </section>
  </main>
</div>

);
}

// ==========================================
// 5. CARTE DE JEU
// ==========================================

interface GameCardProps {
game: GameConfig;
isFavorite: boolean;
onToggleFavorite: (
event: React.MouseEvent<HTMLButtonElement>,
id: string
) => void;
}

const GameCard = memo(function GameCard({
game,
isFavorite,
onToggleFavorite,
}: GameCardProps) {
const router = useRouter();

const handleOpenGame = useCallback(() => {
router.push(game.path);
}, [router, game.path]);

const handleCardKeyDown = useCallback(
(event: React.KeyboardEvent<HTMLElement>) => {
if (
event.target !== event.currentTarget ||
(event.key !== "Enter" && event.key !== " ")
) {
return;
}

  event.preventDefault();
  handleOpenGame();
},
[handleOpenGame]

);

return (
<motion.article
role="link"
tabIndex={0}
aria-label={"Lancer ${game.name}"}
onClick={handleOpenGame}
onKeyDown={handleCardKeyDown}
whileHover={{ y: -4 }}
whileTap={{ scale: 0.98 }}
className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-[26px] border border-white/10 bg-slate-900/70 p-5 transition-all duration-300 hover:border-emerald-500/40 hover:bg-slate-900/90 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
>
{/* EFFET LUMINEUX */}
<div
className={"pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br ${game.color} opacity-20 blur-2xl transition-opacity group-hover:opacity-40"}
aria-hidden="true"
/>

  <div>
    {/* EN-TÊTE */}
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 shadow-inner transition-colors group-hover:border-emerald-500/30">
        <game.icon
          size={22}
          className={game.iconColor}
          aria-hidden="true"
        />
      </div>

      <div className="flex items-center gap-2">
        {game.isHot && (
          <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase text-amber-400">
            <Flame size={10} aria-hidden="true" />
            HOT
          </span>
        )}

        {game.isNew && (
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase text-cyan-300">
            NOUVEAU
          </span>
        )}

        <button
          type="button"
          onClick={(event) => onToggleFavorite(event, game.id)}
          className="relative z-10 rounded-full border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10 active:scale-90"
          aria-label={
            isFavorite
              ? `Retirer ${game.name} des favoris`
              : `Ajouter ${game.name} aux favoris`
          }
          aria-pressed={isFavorite}
        >
          <Heart
            size={14}
            className={
              isFavorite
                ? "fill-rose-500 text-rose-500"
                : "text-slate-400"
            }
          />
        </button>
      </div>
    </div>

    {/* INFORMATIONS */}
    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">
      {game.category}
    </p>

    <h4 className="mt-1 text-base font-black uppercase italic tracking-tight text-white transition-colors group-hover:text-emerald-300">
      {game.name}
    </h4>

    <p className="mt-1.5 line-clamp-2 text-xs font-normal leading-relaxed text-slate-400">
      {game.desc}
    </p>
  </div>

  {/* PIED DE CARTE */}
  <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-3">
    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
      <Users
        size={12}
        className="text-emerald-400"
        aria-hidden="true"
      />

      {game.players}
    </div>

    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 transition-transform group-hover:translate-x-1">
      LANCER
      <Play
        size={10}
        className="fill-emerald-400"
        aria-hidden="true"
      />
    </div>
  </div>
</motion.article>

);
});

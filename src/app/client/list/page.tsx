"use client";

import React, { useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Heart, Zap, Layers, Target, Grid,
  Fingerprint, Brain, Lock, ChevronLeft, Star,
  Home, Gamepad2, MessageSquare, User,
  Users, LucideIcon, ShoppingBag, Sparkles,
  Trophy, Clock3, Crown, Play, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- INTERFACES & TYPES ---
interface GameConfig {
  id: string;
  name: string;
  desc: string;
  path: string;
  icon: LucideIcon;
  iconColor: string;
  color: string;
  players: string;
  category: string;
}

// --- DONNÉES DE CONFIGURATION ---
const GAMES: GameConfig[] = [
  { id: 'crash', name: 'Signal Growth', desc: 'Lecture de tendance', path: '/client/crash', icon: Zap, iconColor: 'text-amber-400', color: 'from-amber-500/20 via-amber-500/5', players: '1,248', category: 'Analyse' },
  { id: 'squidglass', name: 'Squid Glass', desc: 'Décision séquentielle', path: '/client/squidglass', icon: Layers, iconColor: 'text-rose-500', color: 'from-rose-500/20 via-rose-500/5', players: '942', category: 'Agilité' },
  { id: 'plinko', name: 'Plinko Matrix', desc: 'Simulation dynamique', path: '/client/plinko', icon: Target, iconColor: 'text-blue-400', color: 'from-blue-500/20 via-blue-500/5', players: '1,105', category: 'Exploration' },
  { id: 'mines', name: 'Mines Grid', desc: 'Choix progressifs', path: '/client/mines', icon: Grid, iconColor: 'text-emerald-500', color: 'from-emerald-500/20 via-emerald-500/5', players: '856', category: 'Stratégie' },
  { id: 'biometric', name: 'Biometric Lab', desc: 'Agilité visuelle', path: '/client/biometric-hack', icon: Fingerprint, iconColor: 'text-cyan-400', color: 'from-cyan-500/20 via-cyan-500/5', players: '652', category: 'Réflexes' },
  { id: 'quiz', name: 'Quiz Insights', desc: 'Connaissance active', path: '/client/quiz', icon: Brain, iconColor: 'text-purple-400', color: 'from-purple-500/20 via-purple-500/5', players: '3,012', category: 'Savoir' },
  { id: 'laser', name: 'Laser Vault', desc: 'Précision adaptative', path: '/client/laser-vault', icon: Lock, iconColor: 'text-orange-500', color: 'from-orange-500/20 via-orange-500/5', players: '2,094', category: 'Précision' }
];

const SECTION_CONFIG = [
  { title: 'Jeux populaires', subtitle: 'Les expériences les plus jouées', ids: ['quiz', 'crash', 'plinko'] },
  { title: 'Chance', subtitle: 'Tension, timing et gros moments', ids: ['plinko', 'mines', 'crash'] },
  { title: 'Réflexes', subtitle: 'Réponses rapides et précision', ids: ['biometric', 'laser', 'squidglass'] },
  { title: 'Mémoire', subtitle: 'Focus, observation et rythme', ids: ['squidglass', 'mines', 'biometric'] },
  { title: 'Intelligence', subtitle: 'Logique, stratégie et savoir', ids: ['quiz', 'crash', 'laser'] },
  { title: 'Tournois', subtitle: 'Présence forte et classements', ids: ['laser', 'quiz', 'mines'] },
  { title: 'Nouveautés', subtitle: 'Nouveaux formats de jeu', ids: ['biometric', 'laser', 'squidglass'] },
  { title: 'Premium', subtitle: 'Expériences valorisées', ids: ['laser', 'quiz', 'crash'] }
];

export default function GameListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState('');

  // Initialisation sécurisée du state localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem('fav_games');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Erreur de lecture des favoris:', error);
      return [];
    }
  });

  const toggleFavorite = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    const nextFavorites = favorites.includes(id)
      ? favorites.filter((favId) => favId !== id)
      : [...favorites, id];
    setFavorites(nextFavorites);
    localStorage.setItem('fav_games', JSON.stringify(nextFavorites));
  };

  // Filtrage par recherche
  const filteredGames = useMemo(() =>
    GAMES.filter((game) => 
      game.name.toLowerCase().includes(search.toLowerCase()) ||
      game.category.toLowerCase().includes(search.toLowerCase())
    ),
    [search]
  );

  const favoriteGames = useMemo(() =>
    GAMES.filter((game) => favorites.includes(game.id)),
    [favorites]
  );

  const continueGames = favoriteGames.length > 0 ? favoriteGames : GAMES.slice(0, 3);

  const sectionGames = useMemo(() =>
    SECTION_CONFIG.map((section) => ({
      ...section,
      games: section.ids
        .map((id) => GAMES.find((game) => game.id === id))
        .filter((game): game is GameConfig => Boolean(game))
    })),
    []
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020617] text-white selection:bg-emerald-500 selection:text-black pb-36">
      
      {/* EFFET DE LUMIÈRE D'ARRIÈRE-PLAN */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/15 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 -right-20 w-[300px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full" />
      </div>

      {/* EN-TÊTE FIXE */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#020617]/80 px-5 py-3.5 backdrop-blur-2xl transition-all">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-all duration-200 hover:bg-white/10 active:scale-95"
            aria-label="Retour"
          >
            <ChevronLeft size={20} className="text-slate-300" />
          </button>

          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-emerald-400/80">Game Center</p>
            <h1 className="text-xl font-black uppercase italic tracking-tight text-white">
              Chif <span className="bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">Play</span>
            </h1>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Star size={18} className="text-emerald-400 fill-emerald-400/20" />
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-6 sm:px-6">
        
        {/* BANNIÈRE HERO / PROMO */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-emerald-950/30 p-6 backdrop-blur-md shadow-2xl"
        >
          <div className="absolute top-0 right-0 -mt-12 -mr-12 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
          
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300 shadow-sm">
                <Sparkles size={12} className="text-emerald-400" /> Premium Hub
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight text-white sm:text-3xl leading-none">
                Votre prochaine expérience commence ici
              </h2>
              <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-300/90">
                Explorez des modules interactifs, affûtez vos réflexes et découvrez de nouveaux défis stratégiques.
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 backdrop-blur-md">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  <Trophy size={13} className="text-amber-400" /> Saison Active
                </div>
                <p className="mt-1 text-xl font-black tracking-tight text-white">+32% engagement</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* BARRE DE RECHERCHE */}
        <div className="relative group">
          <div className="absolute -inset-0.5 rounded-[24px] bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 opacity-0 blur transition-all duration-300 group-focus-within:opacity-100" />
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-4 text-slate-500 transition-colors group-focus-within:text-emerald-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="RECHERCHER UN JEU OU UNE CATÉGORIE..."
              className="w-full rounded-[22px] border border-white/10 bg-slate-900/80 py-4 pl-12 pr-10 text-xs font-bold tracking-wider text-white placeholder:text-slate-500 outline-none transition-all focus:border-emerald-500/50 backdrop-blur-xl"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* AFFICHAGE DES RÉSULTATS DE RECHERCHE (Si recherche active) */}
        {search.trim() !== '' ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">
                Résultats pour &quot;{search}&quot; ({filteredGames.length})
              </h3>
            </div>
            
            {filteredGames.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {filteredGames.map((game) => (
                  <GameCard key={game.id} game={game} isFavorite={favorites.includes(game.id)} onToggleFavorite={toggleFavorite} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-8 text-center text-slate-400">
                Aucun jeu ne correspond à votre recherche.
              </div>
            )}
          </section>
        ) : (
          /* SECTIONS STANDARD (Si pas de recherche) */
          <>
            {/* SECTION: CONTINUER À JOUER */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Continuer à jouer</p>
                  <h3 className="text-base font-black uppercase italic tracking-tight text-white">Reprendre l&apos;aventure</h3>
                </div>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-300">
                  {continueGames.length} récents
                </span>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none">
                {continueGames.map((game) => (
                  <motion.button
                    key={game.id}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => router.push(game.path)}
                    className={`relative min-w-[200px] flex-1 rounded-[24px] border border-white/10 bg-gradient-to-br ${game.color} to-slate-900/90 p-4 text-left backdrop-blur-xl shadow-lg transition-all hover:border-white/20`}
                  >
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 shadow-inner">
                      <game.icon size={20} className={game.iconColor} />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{game.category}</p>
                    <h4 className="mt-0.5 text-base font-black uppercase italic tracking-tight text-white">{game.name}</h4>
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      <Play size={12} className="fill-emerald-400" /> Reprendre
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>

            {/* SECTIONS THÉMATIQUES */}
            {sectionGames.map((section) => (
              <section key={section.title} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{section.subtitle}</p>
                    <h3 className="text-base font-black uppercase italic tracking-tight text-white">{section.title}</h3>
                  </div>
                  <button className="text-[10px] font-black uppercase tracking-wider text-slate-400 transition-colors hover:text-white">
                    Voir tout
                  </button>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none">
                  {section.games.map((game) => (
                    <div key={game.id} className="min-w-[160px] max-w-[160px]">
                      <GameCard game={game} isFavorite={favorites.includes(game.id)} onToggleFavorite={toggleFavorite} />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* SECTION EN MISE EN AVANT */}
            <section className="rounded-[28px] border border-white/10 bg-slate-900/40 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Découvrez aussi</p>
                  <h3 className="text-base font-black uppercase italic tracking-tight text-white">Les tendances du moment</h3>
                </div>
                <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Clock3 size={12} /> En Direct
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="group relative overflow-hidden rounded-[22px] border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-slate-900/60 p-4 transition-all hover:border-cyan-500/40">
                  <div className="flex items-center gap-2 text-cyan-300">
                    <Crown size={15} /> 
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Classement</span>
                  </div>
                  <p className="mt-2 text-sm font-black uppercase italic text-white">Quiz Insights domine le plateau ce mois-ci</p>
                </div>

                <div className="group relative overflow-hidden rounded-[22px] border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-slate-900/60 p-4 transition-all hover:border-emerald-500/40">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <Sparkles size={15} /> 
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mise à jour</span>
                  </div>
                  <p className="mt-2 text-sm font-black uppercase italic text-white">Biometric Lab passe au niveau supérieur</p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* NAVIGATION INFERIEURE / BARRE DE MENU */}
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-[#020617]/90 px-6 py-3 pb-7 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <NavIcon href="/client/home" icon={<Home size={20} />} label="ACCUEIL" active={pathname === '/client/home'} />
          <NavIcon href="/client/list" icon={<Gamepad2 size={20} />} label="EXPLORER" active={pathname === '/client/list'} />
          <NavIcon href="/client/market" icon={<ShoppingBag size={20} />} label="OFFRES" active={pathname === '/client/market'} />
          <NavIcon href="/client/chat" icon={<MessageSquare size={20} />} label="COMMUNAUTÉ" active={pathname === '/client/chat'} />
          <NavIcon href="/client/profile" icon={<User size={20} />} label="PROFIL" active={pathname === '/client/profile'} />
        </div>
      </nav>

    </div>
  );
}

// --- SOUS-COMPOSANTS REUTILISABLES ---

interface GameCardProps {
  game: GameConfig;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
}

function GameCard({ game, isFavorite, onToggleFavorite }: GameCardProps) {
  const router = useRouter();

  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => router.push(game.path)}
      className="group relative flex h-full cursor-pointer flex-col justify-between rounded-[22px] border border-white/10 bg-slate-900/60 p-3.5 transition-all duration-200 hover:border-white/20 hover:bg-slate-900/90 hover:shadow-xl"
    >
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 shadow-inner group-hover:border-white/20">
            <game.icon size={18} className={game.iconColor} />
          </div>
          <button 
            onClick={(e) => onToggleFavorite(e, game.id)} 
            className="rounded-full border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10 active:scale-90"
            aria-label="Ajouter aux favoris"
          >
            <Heart size={13} className={isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} />
          </button>
        </div>

        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{game.category}</p>
        <h4 className="mt-0.5 text-sm font-black uppercase italic tracking-tight text-white group-hover:text-emerald-400 transition-colors">
          {game.name}
        </h4>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
        <Users size={11} className="text-emerald-400" /> {game.players}
      </div>
    </motion.div>
  );
}

interface NavIconProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

function NavIcon({ href, icon, label, active = false }: NavIconProps) {
  return (
    <Link 
      href={href} 
      className={`relative flex flex-col items-center gap-1 transition-all duration-200 ${
        active ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      <div className={`relative p-1 transition-all ${active ? 'scale-110' : ''}`}>
        {icon}
        {active && (
          <motion.div 
            layoutId="activeGlow"
            className="absolute inset-0 -z-10 rounded-full bg-emerald-500/25 blur-md" 
          />
        )}
      </div>
      <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
      {active && (
        <span className="absolute -bottom-1.5 h-1 w-1 rounded-full bg-emerald-400" />
      )}
    </Link>
  );
}

"use client";

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Heart, Zap, Layers, Target, Grid,
  Fingerprint, Brain, Lock, ChevronLeft, Star,
  Home, Gamepad2, MessageSquare, User,
  Users, LucideIcon, ShoppingBag, Sparkles,
  Play, X, Flame, Dices, Filter
} from 'lucide-react';
import { motion } from 'framer-motion';

// ==========================================
// 1. TYPES & INTERFACES (TypeScript Strict)
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
// 2. DONNÉES ET CONFIGURATION DES JEUX
// ==========================================
const GAMES: GameConfig[] = [
  { id: 'crash', name: 'Signal Growth', desc: 'Lecture de tendance & timing', path: '/client/crash', icon: Zap, iconColor: 'text-amber-400', color: 'from-amber-500/20 via-amber-500/5', players: '1,248', category: 'Analyse', isHot: true },
  { id: 'squidglass', name: 'Squid Glass', desc: 'Décision séquentielle', path: '/client/squidglass', icon: Layers, iconColor: 'text-rose-500', color: 'from-rose-500/20 via-rose-500/5', players: '942', category: 'Agilité' },
  { id: 'plinko', name: 'Plinko Matrix', desc: 'Simulation dynamique', path: '/client/plinko', icon: Target, iconColor: 'text-blue-400', color: 'from-blue-500/20 via-blue-500/5', players: '1,105', category: 'Exploration' },
  { id: 'mines', name: 'Mines Grid', desc: 'Choix progressifs à risque', path: '/client/mines', icon: Grid, iconColor: 'text-emerald-500', color: 'from-emerald-500/20 via-emerald-500/5', players: '856', category: 'Stratégie', isHot: true },
  { id: 'biometric', name: 'Biometric Lab', desc: 'Agilité visuelle extrême', path: '/client/biometric-hack', icon: Fingerprint, iconColor: 'text-cyan-400', color: 'from-cyan-500/20 via-cyan-500/5', players: '652', category: 'Réflexes', isNew: true },
  { id: 'quiz', name: 'Quiz Insights', desc: 'Connaissance active & rapidité', path: '/client/quiz', icon: Brain, iconColor: 'text-purple-400', color: 'from-purple-500/20 via-purple-500/5', players: '3,012', category: 'Savoir', isHot: true },
  { id: 'laser', name: 'Laser Vault', desc: 'Précision adaptative', path: '/client/laser-vault', icon: Lock, iconColor: 'text-orange-500', color: 'from-orange-500/20 via-orange-500/5', players: '2,094', category: 'Précision', isNew: true }
];

const CATEGORIES = ['Tous', 'Favoris', 'Stratégie', 'Réflexes', 'Analyse', 'Savoir', 'Précision'];
const STORAGE_FAV_KEY = 'fav_games';

// ==========================================
// 3. COMPOSANT PRINCIPAL DE LA PAGE
// ==========================================
export default function GameListPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  // États de filtrage et recherche
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');

  // Gestion des favoris sécurisée avec validation
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Charger les favoris au montage client de manière sécurisée
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FAV_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setFavorites(parsed.filter((item): item is string => typeof item === 'string'));
        }
      }
    } catch (e) {
      console.error('Impossible d\'accéder au localStorage favoris:', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Inverser l'état favori d'un jeu
  const toggleFavorite = useCallback((event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    setFavorites((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((favId) => favId !== id)
        : [...prev, id];
      
      try {
        localStorage.setItem(STORAGE_FAV_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Erreur lors de la sauvegarde dans localStorage:', e);
      }
      return updated;
    });
  }, []);

  // 1. Filtrage combiné (Recherche + Catégorie) -> Déclaré en premier
  const filteredGames = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    
    return GAMES.filter((game) => {
      const matchesSearch = searchLower === '' ||
        game.name.toLowerCase().includes(searchLower) ||
        game.category.toLowerCase().includes(searchLower) ||
        game.desc.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (selectedCategory === 'Tous') return true;
      if (selectedCategory === 'Favoris') return favorites.includes(game.id);
      return game.category.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [search, selectedCategory, favorites]);

  // 2. Sélection aléatoire sécurisée d'un jeu -> Utilise `filteredGames` une fois déclaré
  const handleRandomPlay = useCallback(() => {
    const listToPick = filteredGames.length > 0 ? filteredGames : GAMES;
    if (listToPick.length === 0) return;
    const randomIndex = Math.floor(Math.random() * listToPick.length);
    router.push(listToPick[randomIndex].path);
  }, [filteredGames, router]);

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-emerald-500 selection:text-black pb-36 font-sans">
      
      {/* LUMIÈRES DE FOND DYNAMIQUES */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/15 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 -right-20 w-[300px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full" />
      </div>

      {/* EN-TÊTE FIXE */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#020617]/85 px-5 py-3.5 backdrop-blur-2xl transition-all">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-white/10 active:scale-95"
            aria-label="Retourner à la page précédente"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-emerald-400">Game Center</p>
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
        
        {/* BANNIÈRE HERO */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-emerald-950/40 p-6 backdrop-blur-md shadow-2xl"
        >
          <div className="absolute top-0 right-0 -mt-12 -mr-12 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" aria-hidden="true" />
          
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
                <Sparkles size={12} className="text-emerald-400" /> Arène officielle
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight text-white sm:text-3xl leading-none">
                Prêt à relever le défi ?
              </h2>
              <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-300/90 font-normal">
                Choisissez un module, perfectionnez votre stratégie et accumulez des points d'expérience.
              </p>
            </div>

            {/* BOUTON JOUER AU HASARD */}
            <button
              onClick={handleRandomPlay}
              className="group relative flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-4 font-black uppercase italic tracking-wider text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95 shrink-0"
            >
              <Dices size={20} className="transition-transform group-hover:rotate-180 duration-500" />
              <span className="text-xs">Jeu Aléatoire</span>
            </button>
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
                aria-label="Effacer la recherche"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* FILTRES PAR CATÉGORIES */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Filter size={14} className="text-slate-500 shrink-0 mr-1" />
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'border border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {cat} {cat === 'Favoris' && isHydrated && favorites.length > 0 && `(${favorites.length})`}
              </button>
            );
          })}
        </div>

        {/* GRILLE PRINCIPALE DE JEUX */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
              {selectedCategory === 'Tous' ? 'Tous les jeux disponibles' : `Catégorie : ${selectedCategory}`} ({filteredGames.length})
            </h3>
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
              <p className="text-sm font-bold uppercase tracking-wider">Aucun jeu ne correspond à vos critères.</p>
              <button 
                onClick={() => { setSearch(''); setSelectedCategory('Tous'); }}
                className="mt-4 text-xs font-black uppercase text-emerald-400 underline underline-offset-4 hover:text-emerald-300 transition-colors"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </section>

      </main>

      {/* BARRE DE NAVIGATION INFÉRIEURE */}
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

// ==========================================
// 4. SOUS-COMPOSANTS OPTIMISÉS
// ==========================================

interface GameCardProps {
  game: GameConfig;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
}

const GameCard = React.memo(({ game, isFavorite, onToggleFavorite }: GameCardProps) => {
  const router = useRouter();

  return (
    <motion.article
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(game.path)}
      className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-[26px] border border-white/10 bg-slate-900/70 p-5 transition-all duration-300 hover:border-emerald-500/40 hover:bg-slate-900/90 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
    >
      {/* EFFET DE SURVOL LUMINEUX */}
      <div 
        className={`absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-br ${game.color} opacity-20 blur-2xl transition-opacity group-hover:opacity-40 pointer-events-none`} 
        aria-hidden="true" 
      />

      <div>
        {/* EN-TÊTE DE LA CARTE */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 shadow-inner group-hover:border-emerald-500/30 transition-colors">
            <game.icon size={22} className={game.iconColor} />
          </div>

          <div className="flex items-center gap-2">
            {/* BADGES DYNAMIQUES */}
            {game.isHot && (
              <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase text-amber-400">
                <Flame size={10} /> HOT
              </span>
            )}
            {game.isNew && (
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase text-cyan-300">
                NOUVEAU
              </span>
            )}
            
            {/* BOUTON FAVORIS */}
            <button 
              onClick={(e) => onToggleFavorite(e, game.id)} 
              className="rounded-full border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10 active:scale-90"
              aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart size={14} className={isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} />
            </button>
          </div>
        </div>

        {/* DÉTAILS DU JEU */}
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">{game.category}</p>
        <h4 className="mt-1 text-base font-black uppercase italic tracking-tight text-white group-hover:text-emerald-300 transition-colors">
          {game.name}
        </h4>
        <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed font-normal">
          {game.desc}
        </p>
      </div>

      {/* PIED DE CARTE */}
      <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-3">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <Users size={12} className="text-emerald-400" /> {game.players}
        </div>

        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 group-hover:translate-x-1 transition-transform">
          LANCER <Play size={10} className="fill-emerald-400" />
        </div>
      </div>
    </motion.article>
  );
});
GameCard.displayName = 'GameCard';

interface NavIconProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const NavIcon = React.memo(({ href, icon, label, active = false }: NavIconProps) => (
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
          layoutId="activeGlowNav"
          className="absolute inset-0 -z-10 rounded-full bg-emerald-500/25 blur-md" 
        />
      )}
    </div>
    <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
    {active && (
      <span className="absolute -bottom-1.5 h-1 w-1 rounded-full bg-emerald-400" />
    )}
  </Link>
));
NavIcon.displayName = 'NavIcon';

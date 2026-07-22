"use client";

import React, { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, Heart, Zap, Layers, Target, Grid, 
  Fingerprint, Brain, Lock, ChevronLeft, Star,
  Home, Gamepad2, MessageSquare, User,
  Users, LucideIcon, ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- IMPORT DU NOUVEAU BANNER EXOCLICK ---

// --- TYPES ---
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

// --- CONFIGURATION DES JEUX ---
const GAMES: GameConfig[] = [
  { id: 'crash', name: "Signal Growth", desc: "Lecture de tendance", path: "/client/crash", icon: Zap, iconColor: "text-amber-400", color: "from-amber-500/20", players: "1,248", category: "Analyse" },
  { id: 'squidglass', name: "Squid Glass", desc: "Décision séquentielle", path: "/client/squidglass", icon: Layers, iconColor: "text-rose-500", color: "from-rose-500/20", players: "942", category: "Agilité" },
  { id: 'plinko', name: "Plinko Matrix", desc: "Simulation dynamique", path: "/client/plinko", icon: Target, iconColor: "text-blue-400", color: "from-blue-500/20", players: "1,105", category: "Exploration" },
  { id: 'mines', name: "Mines Grid", desc: "Choix progressifs", path: "/client/mines", icon: Grid, iconColor: "text-emerald-500", color: "from-emerald-500/20", players: "856", category: "Stratégie" },
  { id: 'biometric', name: "Biometric Lab", desc: "Agilité visuelle", path: "/client/biometric-hack", icon: Fingerprint, iconColor: "text-cyan-400", color: "from-cyan-500/20", players: "652", category: "Réflexes" },
  { id: 'quiz', name: "Quiz Insights", desc: "Connaissance active", path: "/client/quiz", icon: Brain, iconColor: "text-purple-400", color: "from-purple-500/20", players: "3,012", category: "Savoir" },
  { id: 'laser', name: "Laser Vault", desc: "Précision adaptative", path: "/client/laser-vault", icon: Lock, iconColor: "text-orange-500", color: "from-orange-500/20", players: "2,094", category: "Précision" }
];

export default function GameListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = window.localStorage.getItem('fav_games');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Erreur lecture favoris', e);
      return [];
    }
  });

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newFavs = favorites.includes(id) 
      ? favorites.filter(f => f !== id) 
      : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('fav_games', JSON.stringify(newFavs));
  };

  const filteredGames = useMemo(() => 
    GAMES.filter(g => g.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const favoriteGames = useMemo(() => 
    GAMES.filter(g => favorites.includes(g.id)),
    [favorites]
  );

  return (
    <div className="ds-page text-white font-sans select-none overflow-x-hidden pb-32 ds-fade-up">
      
      {/* Top Bar Fixe */}
      <div className="sticky top-0 z-40 bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between shadow-lg shadow-black/20">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all hover:bg-white/10"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <h1 className="text-lg font-black italic tracking-tighter uppercase">
          EXPERIENCE <span className="text-emerald-400">HUB</span>
        </h1>
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <Star size={18} className="text-emerald-500" />
        </div>
      </div>

      <main className="p-6 space-y-8">
        
        {/* Barre de Recherche */}
        <div className="relative group">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full"></div>
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="RECHERCHER UNE EXPÉRIENCE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 pl-14 pr-4 outline-none focus:border-emerald-500/50 transition-all text-xs font-bold tracking-widest uppercase text-white placeholder:text-slate-600 relative z-10"
          />
        </div>

        {/* Section Favoris */}
        <AnimatePresence>
          {favoriteGames.length > 0 && !search && (
            <motion.section 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <h2 className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase flex items-center gap-2 pl-2">
                <Heart size={12} className="fill-rose-500 text-rose-500" /> Vos sélections
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 no-scrollbar snap-x">
                {favoriteGames.map(game => (
                  <motion.div 
                    key={`fav-${game.id}`}
                    onClick={() => router.push(game.path)}
                    className="min-w-40 snap-center bg-linear-to-br from-slate-800 to-slate-900 border border-white/10 p-5 rounded-4xl relative active:scale-95 transition-transform shadow-lg"
                  >
                    <div className={`mb-4 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 border border-white/5`}>
                      <game.icon size={20} className={game.iconColor} />
                    </div>
                    <p className="text-[10px] font-black truncate uppercase tracking-wider mb-1">{game.name}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase">{game.category}</p>
                    
                    <button 
                      onClick={(e) => toggleFavorite(e, game.id)}
                      className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-rose-500/20 transition-colors"
                    >
                      <Heart size={14} className="fill-rose-500 text-rose-500" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Grille de tous les jeux */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase pl-2">
            {search ? `Résultats (${filteredGames.length})` : "Catalogue d'expériences"}
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {filteredGames.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(game.path)}
                className="group relative bg-[#0f172a]/60 border border-white/5 rounded-4xl p-4 flex items-center gap-5 active:scale-[0.98] transition-all overflow-hidden hover:border-emerald-500/30 hover:bg-[#0f172a]"
              >
                <div className={`absolute inset-0 bg-linear-to-r ${game.color} to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                
                <div className="w-16 h-16 rounded-3xl bg-black border border-white/10 flex items-center justify-center shrink-0 z-10 shadow-lg group-hover:scale-105 transition-transform">
                  <game.icon size={28} className={game.iconColor} />
                </div>
                
                <div className="flex-1 min-w-0 z-10 space-y-1">
                  <h3 className="font-black text-sm tracking-tight uppercase truncate text-slate-200 group-hover:text-white transition-colors">{game.name}</h3>
                  <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">{game.desc}</p>
                  
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/10">
                        <Users size={10} className="text-emerald-500" />
                        <span className="text-[8px] text-emerald-500 font-black uppercase tracking-tighter">
                        {game.players}
                        </span>
                    </div>
                    <span className="text-[8px] text-slate-600 font-bold uppercase border border-white/5 px-2 py-0.5 rounded-md">{game.category}</span>
                  </div>
                </div>

                <button 
                  onClick={(e) => toggleFavorite(e, game.id)}
                  className="p-3 z-20 relative active:scale-90 transition-transform"
                >
                  <Heart 
                    size={22} 
                    className={`${favorites.includes(game.id) ? "fill-rose-500 text-rose-500" : "text-slate-700 hover:text-rose-400"} transition-colors`} 
                  />
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Barre de Navigation Basse */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#020617]/90 backdrop-blur-2xl border-t border-white/5 px-6 py-4 flex justify-between items-center z-50 pb-8 rounded-t-4xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <NavIcon href="/client/home" icon={<Home size={22} />} label="ACCUEIL" active={pathname === '/client/home'} />
        <NavIcon href="/client/list" icon={<Gamepad2 size={22} />} label="EXPLORER" active={pathname === '/client/list'} />
        <NavIcon href="/client/market" icon={<ShoppingBag size={22} />} label="OFFRES" active={pathname === '/client/market'} />
        <NavIcon href="/client/chat" icon={<MessageSquare size={22} />} label="COMMUNAUTÉ" active={pathname === '/client/chat'} />
        <NavIcon href="/client/profile" icon={<User size={22} />} label="PROFIL" active={pathname === '/client/profile'} />
      </nav>
    </div>
  );
}

function NavIcon({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-emerald-400 -translate-y-1' : 'text-slate-600 hover:text-slate-300'}`}>
      <div className={`${active ? 'drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]' : ''} transition-all`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black tracking-widest uppercase ${active ? 'text-emerald-400' : 'text-slate-600'}`}>{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-glow" 
          className="absolute -bottom-2 w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399]" 
        />
      )}
    </Link>
  );
}

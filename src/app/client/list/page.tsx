"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, Heart, Zap, Layers, Target, Grid, 
  Fingerprint, Brain, Lock, ChevronLeft, Star,
  Home, Gamepad2, Ticket, MessageSquare, User,
  Users, LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdsBanner from "@/components/ads/AdsBanner"; // <-- IMPORT PUB

// --- TYPES ---
interface GameConfig {
  id: string;
  name: string;
  desc: string;
  path: string;
  Icon: LucideIcon;
  iconColor: string;
  color: string;
  players: string;
  category: string;
}

// --- CONFIGURATION DES JEUX ---
const GAMES: GameConfig[] = [
  { id: 'crash', name: "CROISSANCE", desc: "Anticipez la courbe", path: "/client/crash", Icon: Zap, iconColor: "text-amber-400", color: "from-amber-500/20", players: "1,248", category: "Multiplicateur" },
  { id: 'squidglass', name: "SQUID GLASS", desc: "Le pont de la survie", path: "/client/squidglass", Icon: Layers, iconColor: "text-rose-500", color: "from-rose-500/20", players: "942", category: "Agilité" },
  { id: 'plinko', name: "PLINKO ELITE", desc: "Multiplicateurs en cascade", path: "/client/plinko", Icon: Target, iconColor: "text-blue-400", color: "from-blue-500/20", players: "1,105", category: "Hasard" },
  { id: 'mines', name: "MINES", desc: "Gestion du risque", path: "/client/mines", Icon: Grid, iconColor: "text-emerald-500", color: "from-emerald-500/20", players: "856", category: "Stratégie" },
  { id: 'biometric', name: "BIOMETRIC HACK", desc: "Agilité visuelle", path: "/client/biometric-hack", Icon: Fingerprint, iconColor: "text-cyan-400", color: "from-cyan-500/20", players: "652", category: "Réflexes" },
  { id: 'quiz', name: "CHIF QUIZ", desc: "Connaissances", path: "/client/quiz", Icon: Brain, iconColor: "text-purple-400", color: "from-purple-500/20", players: "3,012", category: "Savoir" },
  { id: 'laser', name: "LASER VAULT", desc: "Précision", path: "/client/laser-vault", Icon: Lock, iconColor: "text-orange-500", color: "from-orange-500/20", players: "2,094", category: "Précision" }
];

export default function GameListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('fav_games');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

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
    <div className="min-h-screen bg-[#050508] text-white font-sans select-none overflow-x-hidden">
      
      {/* Top Bar Fixe */}
      <div className="sticky top-0 z-50 bg-[#050508]/80 backdrop-blur-lg border-b border-white/5 px-5 py-4 flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <h1 className="text-lg font-black italic tracking-tighter uppercase">
          ELITE <span className="text-emerald-500">GAMES</span>
        </h1>
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <Star size={16} className="text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
        </div>
      </div>

      <main className="p-5 pb-32">
        {/* Barre de Recherche */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="RECHERCHER UN DÉFI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-emerald-500/50 transition-all text-xs font-bold tracking-widest uppercase text-white"
          />
        </div>

        {/* Section Favoris */}
        <AnimatePresence mode="popLayout">
          {favoriteGames.length > 0 && !search && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
              <h2 className="text-[10px] font-black text-slate-500 mb-4 tracking-[0.3em] uppercase flex items-center gap-2">
                <Heart size={10} className="fill-rose-500 text-rose-500" /> Vos Favoris
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {favoriteGames.map(game => (
                  <motion.div 
                    key={`fav-${game.id}`}
                    layoutId={`fav-${game.id}`}
                    onClick={() => router.push(game.path)}
                    className="min-w-[150px] bg-gradient-to-br from-white/5 to-transparent border border-white/10 p-5 rounded-[2rem] relative active:scale-95 transition-transform"
                  >
                    <div className="mb-4">
                      <game.Icon size={28} className={game.iconColor} />
                    </div>
                    <p className="text-[11px] font-black truncate uppercase">{game.name}</p>
                    <button 
                      onClick={(e) => toggleFavorite(e, game.id)}
                      className="absolute top-4 right-4 p-1"
                    >
                      <Heart size={14} className="fill-rose-500 text-rose-500" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* --- BANNIÈRE PUB --- */}
        <AdsBanner type="monetag" />

        {/* Grille de tous les jeux */}
        <section>
          <h2 className="text-[10px] font-black text-slate-500 mb-6 tracking-[0.3em] uppercase">
            {search ? `Résultats (${filteredGames.length})` : "Tous les Jeux"}
          </h2>
          
          <div className="flex flex-col gap-4">
            {filteredGames.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(game.path)}
                className="group relative bg-[#0a0a0f] border border-white/5 rounded-[1.8rem] p-4 flex items-center gap-4 active:scale-[0.98] transition-all overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${game.color} to-transparent opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 z-10">
                  <game.Icon size={26} className={game.iconColor} />
                </div>
                <div className="flex-1 min-w-0 z-10">
                  <h3 className="font-black text-sm tracking-tight uppercase truncate">{game.name}</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{game.desc}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Users size={10} className="text-emerald-500" />
                    <span className="text-[9px] text-emerald-500/80 font-black uppercase tracking-tighter">
                      {game.players} JOUEURS EN LIGNE
                    </span>
                  </div>
                </div>
                <button 
                  onClick={(e) => toggleFavorite(e, game.id)}
                  className="p-3 z-20 relative"
                >
                  <Heart 
                    size={20} 
                    className={favorites.includes(game.id) ? "fill-rose-500 text-rose-500" : "text-white/10 group-hover:text-white/30"} 
                  />
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Barre de Navigation Basse */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#050508]/90 backdrop-blur-2xl border-t border-white/5 px-6 py-4 flex justify-between items-center z-50">
        <NavIcon icon={<Home size={20} />} label="ACCUEIL" />
        <NavIcon icon={<Gamepad2 size={20} />} label="JEUX" active />
        <NavIcon icon={<Ticket size={20} />} label="SHOP" />
        <NavIcon icon={<MessageSquare size={20} />} label="CHAT" />
        <NavIcon icon={<User size={20} />} label="PROFIL" />
      </nav>
    </div>
  );
}

// Composant Interne pour la Navigation
function NavIcon({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 transition-colors ${active ? 'text-emerald-500' : 'text-slate-500'}`}>
      <div className={`${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''} transition-transform`}>
        {icon}
      </div>
      <span className="text-[7px] font-black tracking-widest uppercase">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-glow" 
          className="w-1 h-1 bg-emerald-500 rounded-full" 
        />
      )}
    </div>
  );
                             }

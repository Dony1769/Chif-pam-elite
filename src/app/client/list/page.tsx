"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, Heart, Zap, Layers, Target, Grid, 
  Fingerprint, Brain, Lock, ChevronRight, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Configuration des jeux
const GAMES = [
  {
    id: 'crash',
    name: "CROISSANCE",
    desc: "Anticipez la courbe avant le crash",
    path: "/client/crash",
    icon: <Zap className="text-amber-400" />,
    color: "from-amber-500/20 to-transparent",
    players: "1,248",
    category: "Multiplicateur"
  },
  {
    id: 'squidglass',
    name: "SQUID GLASS",
    desc: "Le pont de la survie",
    path: "/client/squidglass",
    icon: <Layers className="text-rose-500" />,
    color: "from-rose-500/20 to-transparent",
    players: "942",
    category: "Agilité"
  },
  {
    id: 'plinko',
    name: "PLINKO ELITE",
    desc: "Multiplicateurs en cascade",
    path: "/client/plinko",
    icon: <Target className="text-blue-400" />,
    color: "from-blue-500/20 to-transparent",
    players: "1,105",
    category: "Chance"
  },
  {
    id: 'mines',
    name: "MINES",
    desc: "Gestion du risque extrême",
    path: "/client/mines",
    icon: <Grid className="text-emerald-500" />,
    color: "from-emerald-500/20 to-transparent",
    players: "856",
    category: "Stratégie"
  },
  {
    id: 'biometric',
    name: "BIOMETRIC HACK",
    desc: "Agilité visuelle et réflexes",
    path: "/client/biometric-hack",
    icon: <Fingerprint className="text-cyan-400" />,
    color: "from-cyan-500/20 to-transparent",
    players: "652",
    category: "Réflexes"
  },
  {
    id: 'quiz',
    name: "CHIF QUIZ",
    desc: "Testez vos connaissances",
    path: "/client/quiz",
    icon: <Brain className="text-purple-400" />,
    color: "from-purple-500/20 to-transparent",
    players: "3,012",
    category: "Savoir"
  },
  {
    id: 'laser',
    name: "LASER VAULT",
    desc: "Précision chirurgicale",
    path: "/client/laser-vault",
    icon: <Lock className="text-orange-500" />,
    color: "from-orange-500/20 to-transparent",
    players: "2,094",
    category: "Précision"
  }
];

export default function GameList() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  // Charger les favoris au démarrage
  useEffect(() => {
    const saved = localStorage.getItem('fav_games');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  // Basculer un favori
  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newFavs = favorites.includes(id) 
      ? favorites.filter(f => f !== id) 
      : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('fav_games', JSON.stringify(newFavs));
  };

  const filteredGames = GAMES.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const favoriteGames = GAMES.filter(g => favorites.includes(g.id));

  return (
    <div className="min-h-screen bg-[#050508] text-white p-5 pb-24 font-sans select-none">
{/* Bouton Retour */}
<div className="absolute top-5 left-5 z-50">
  <button 
    onClick={() => router.back()}
    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 backdrop-blur-md active:scale-90 transition-all"
  >
    <ChevronRight size={24} className="rotate-180 text-white" />
  </button>
</div>

{/* Ajuste le header pour ne pas chevaucher le bouton */}
<header className="mb-8 mt-16 space-y-6"> 
  {/* ... reste du code du header ... */}
      
      {/* Header & Recherche */}
      <header className="mb-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black italic tracking-tighter text-emerald-500">
            ELITE <span className="text-white">GAMES</span>
          </h1>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Star size={18} className="text-emerald-500" />
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Rechercher un défi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all text-sm font-bold uppercase tracking-widest"
          />
        </div>
      </header>

      {/* Section Favoris (Apparaît seulement si il y en a) */}
      <AnimatePresence>
        {favoriteGames.length > 0 && !search && (
          <motion.section 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-8"
          >
            <h2 className="text-[10px] font-black text-slate-500 mb-4 tracking-[0.3em] uppercase">Vos Favoris</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {favoriteGames.map(game => (
                <motion.div 
                  key={game.id}
                  layoutId={game.id}
                  onClick={() => router.push(game.path)}
                  className="min-w-[140px] bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-4 rounded-3xl relative overflow-hidden"
                >
                  <div className="mb-3">{game.icon}</div>
                  <p className="text-xs font-black truncate">{game.name}</p>
                  <button 
                    onClick={(e) => toggleFavorite(e, game.id)}
                    className="absolute top-2 right-2 p-2"
                  >
                    <Heart size={14} className="fill-emerald-500 text-emerald-500" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Grille de tous les jeux */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-500 mb-4 tracking-[0.3em] uppercase">
          {search ? `Résultats (${filteredGames.length})` : "Tous les jeux populaires"}
        </h2>
        
        <div className="grid gap-3">
          {filteredGames.map((game, index) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={game.id}
              onClick={() => router.push(game.path)}
              className="group relative bg-[#0a0a0f] border border-white/5 rounded-[2rem] p-5 flex items-center gap-5 active:scale-[0.98] transition-all overflow-hidden"
            >
              {/* Effet de brillance au hover */}
              <div className={`absolute inset-0 bg-gradient-to-r ${game.color} opacity-0 group-hover:opacity-100 transition-opacity`} />

              {/* Icon Container */}
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 z-10">
                {React.cloneElement(game.icon as React.ReactElement, { size: 32 })}
              </div>

              {/* Text Info */}
              <div className="flex-1 z-10">
                <div className="flex items-center gap-2">
                   <h3 className="font-black text-lg tracking-tight leading-none uppercase">{game.name}</h3>
                   <span className="text-[8px] bg-white/10 px-2 py-0.5 rounded-full text-slate-400 font-bold uppercase">{game.category}</span>
                </div>
                <p className="text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-wider">{game.desc}</p>
                
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex -space-x-1">
                    {[1,2,3].map(i => <div key={i} className="w-3 h-3 rounded-full border border-black bg-slate-700" />)}
                  </div>
                  <span className="text-[9px] text-emerald-500 font-black tracking-widest">{game.players} JOUEURS</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-3 z-10">
                <button 
                  onClick={(e) => toggleFavorite(e, game.id)}
                  className="p-2 hover:scale-110 transition-transform"
                >
                  <Heart 
                    size={20} 
                    className={favorites.includes(game.id) ? "fill-rose-500 text-rose-500" : "text-slate-700"} 
                  />
                </button>
                <ChevronRight className="text-slate-700 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Message si aucun résultat */}
      {filteredGames.length === 0 && (
        <div className="text-center py-20">
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Aucun jeu trouvé</p>
        </div>
      )}

    </div>
  );
}


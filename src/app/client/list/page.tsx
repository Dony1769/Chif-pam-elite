"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, Heart, Zap, Layers, Target, Grid, 
  Fingerprint, Brain, Lock, ChevronLeft, Star,
  Home, Gamepad2, Ticket, MessageSquare, User,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONFIGURATION DES JEUX ---
const GAMES = [
  {
    id: 'crash',
    name: "CROISSANCE",
    desc: "Anticipez la courbe",
    path: "/client/crash",
    icon: <Zap className="text-amber-400" />,
    color: "from-amber-500/20",
    players: "1,248",
    category: "Multiplicateur"
  },
  {
    id: 'squidglass',
    name: "SQUID GLASS",
    desc: "Le pont de la survie",
    path: "/client/squidglass",
    icon: <Layers className="text-rose-500" />,
    color: "from-rose-500/20",
    players: "942",
    category: "Agilité"
  },
  {
    id: 'plinko',
    name: "PLINKO ELITE",
    desc: "Multiplicateurs en cascade",
    path: "/client/plinko",
    icon: <Target className="text-blue-400" />,
    color: "from-blue-500/20",
    players: "1,105",
    category: "Hasard"
  },
  {
    id: 'mines',
    name: "MINES",
    desc: "Gestion du risque",
    path: "/client/mines",
    icon: <Grid className="text-emerald-500" />,
    color: "from-emerald-500/20",
    players: "856",
    category: "Stratégie"
  },
  {
    id: 'biometric',
    name: "BIOMETRIC HACK",
    desc: "Agilité visuelle",
    path: "/client/biometric-hack",
    icon: <Fingerprint className="text-cyan-400" />,
    color: "from-cyan-500/20",
    players: "652",
    category: "Réflexes"
  },
  {
    id: 'quiz',
    name: "CHIF QUIZ",
    desc: "Connaissances",
    path: "/client/quiz",
    icon: <Brain className="text-purple-400" />,
    color: "from-purple-500/20",
    players: "3,012",
    category: "Savoir"
  },
  {
    id: 'laser',
    name: "LASER VAULT",
    desc: "Précision",
    path: "/client/laser-vault",
    icon: <Lock className="text-orange-500" />,
    color: "from-orange-500/20",
    players: "2,094",
    category: "Précision"
  }
];

export default function GameListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  // Chargement des favoris
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
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-black italic tracking-tighter">
          QUIZ <span className="text-emerald-500">ELITE</span>
        </h1>
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <Star size={16} className="text-emerald-500" />
        </div>
      </div>

      <main className="p-5 pb-32">
        {/* Recherche */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="RECHERCHER UN JEU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-emerald-500/50 transition-all text-xs font-bold tracking-widest uppercase"
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
                    layoutId={game.id}
                    onClick={() => router.push(game.path)}
                    className="min-w-[150px] bg-gradient-to-br from-white/5 to-transparent border border-white/10 p-5 rounded-[2rem] relative"
                  >
                    <div className="mb-4">{game.icon}</div>
                    <p className="text-[11px] font-black truncate uppercase">{game.name}</p>
                    <button 
                      onClick={(e) => toggleFavorite(e, game.id)}
                      className="absolute top-4 right-4"
                    >
                      <Heart size={14} className="fill-rose-500 text-rose-500" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Grille des jeux */}
        <section>
          <h2 className="text-[10px] font-black text-slate-500 mb-6 tracking-[0.3em] uppercase">
            {search ? `Résultats (${filteredGames.length})` : "Jeux Populaires"}
          </h2>
          
          <div className="flex flex-col gap-4">
            {filteredGames.map((game) => (
              <motion.div
                key={game.id}
                layout
                onClick={() => router.push(game.path)}
                className="group relative bg-[#0d0d12] border border-white/5 rounded-[1.8rem] p-4 flex items-center gap-4 active:scale-[0.97] transition-all overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${game.color} to-transparent opacity-5`} />

                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  {React.cloneElement(game.icon as React.ReactElement, { size: 28 })}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm tracking-tight uppercase truncate">{game.name}</h3>
                  </div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider italic">{game.desc}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Users size={10} className="text-emerald-500" />
                    <span className="text-[9px] text-emerald-500/80 font-black">{game.players} en ligne</span>
                  </div>
                </div>

                <button 
                  onClick={(e) => toggleFavorite(e, game.id)}
                  className="p-2 z-10"
                >
                  <Heart 
                    size={18} 
                    className={favorites.includes(game.id) ? "fill-rose-500 text-rose-500" : "text-slate-800"} 
                  />
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Navigation Basse (Premium) */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex justify-between items-center z-50">
        <NavIcon icon={<Home size={22} />} label="ACCUEIL" active />
        <NavIcon icon={<Gamepad2 size={22} />} label="JOUER" />
        <NavIcon icon={<Ticket size={22} />} label="BILLETS" />
        <NavIcon icon={<MessageSquare size={22} />} label="SUPPORT" />
        <NavIcon icon={<User size={22} />} label="COMPTE" />
      </nav>
    </div>
  );
}

// Composant Helper pour la Nav
function NavIcon({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${active ? 'text-emerald-500' : 'text-slate-600'}`}>
      {icon}
      <span className="text-[7px] font-black tracking-[0.1em]">{label}</span>
      {active && <motion.div layoutId="nav-glow" className="w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />}
    </div>
  );
}

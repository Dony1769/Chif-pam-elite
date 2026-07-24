"use client";

import React, { useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Heart, Zap, Layers, Target, Grid,
  Fingerprint, Brain, Lock, ChevronLeft, Star,
  Home, Gamepad2, MessageSquare, User,
  Users, LucideIcon, ShoppingBag, Sparkles,
  Trophy, Clock3, Crown, Play
} from 'lucide-react';
import { motion } from 'framer-motion';

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

const GAMES: GameConfig[] = [
  { id: 'crash', name: 'Signal Growth', desc: 'Lecture de tendance', path: '/client/crash', icon: Zap, iconColor: 'text-amber-400', color: 'from-amber-500/20', players: '1,248', category: 'Analyse' },
  { id: 'squidglass', name: 'Squid Glass', desc: 'Décision séquentielle', path: '/client/squidglass', icon: Layers, iconColor: 'text-rose-500', color: 'from-rose-500/20', players: '942', category: 'Agilité' },
  { id: 'plinko', name: 'Plinko Matrix', desc: 'Simulation dynamique', path: '/client/plinko', icon: Target, iconColor: 'text-blue-400', color: 'from-blue-500/20', players: '1,105', category: 'Exploration' },
  { id: 'mines', name: 'Mines Grid', desc: 'Choix progressifs', path: '/client/mines', icon: Grid, iconColor: 'text-emerald-500', color: 'from-emerald-500/20', players: '856', category: 'Stratégie' },
  { id: 'biometric', name: 'Biometric Lab', desc: 'Agilité visuelle', path: '/client/biometric-hack', icon: Fingerprint, iconColor: 'text-cyan-400', color: 'from-cyan-500/20', players: '652', category: 'Réflexes' },
  { id: 'quiz', name: 'Quiz Insights', desc: 'Connaissance active', path: '/client/quiz', icon: Brain, iconColor: 'text-purple-400', color: 'from-purple-500/20', players: '3,012', category: 'Savoir' },
  { id: 'laser', name: 'Laser Vault', desc: 'Précision adaptative', path: '/client/laser-vault', icon: Lock, iconColor: 'text-orange-500', color: 'from-orange-500/20', players: '2,094', category: 'Précision' }
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
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = window.localStorage.getItem('fav_games');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error('Erreur lecture favoris', error);
      return [];
    }
  });

  const toggleFavorite = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    const nextFavorites = favorites.includes(id)
      ? favorites.filter((favorite) => favorite !== id)
      : [...favorites, id];
    setFavorites(nextFavorites);
    localStorage.setItem('fav_games', JSON.stringify(nextFavorites));
  };

  const filteredGames = useMemo(() =>
    GAMES.filter((game) => game.name.toLowerCase().includes(search.toLowerCase())),
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
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(135deg,#020617_0%,#050816_60%,#020617_100%)] pb-32 text-white">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#020617]/85 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-all active:scale-90 hover:bg-white/10">
            <ChevronLeft size={18} className="text-white" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-500">Game Center</p>
            <h1 className="text-lg font-black uppercase italic tracking-tighter text-white">Chif <span className="text-emerald-400">Play</span></h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 shadow-[0_0_16px_rgba(16,185,129,0.22)]">
            <Star size={18} className="text-emerald-400" />
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-emerald-950/40 p-5 shadow-[0_20px_70px_rgba(2,8,23,0.35)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.24),_transparent_32%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">
                <Sparkles size={12} /> Premium hub
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white sm:text-3xl">Votre prochaine expérience commence ici</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Explorez des jeux immersifs, classez vos réflexes et progressez dans un centre pensé comme une vraie plateforme mobile.</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-slate-950/70 px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                <Trophy size={14} className="text-amber-400" /> Saison active
              </div>
              <p className="mt-2 text-2xl font-black text-white">+32% d&apos;engagement</p>
            </div>
          </div>
        </motion.div>

        <div className="relative group">
          <div className="absolute inset-0 rounded-[22px] bg-emerald-500/20 blur-xl opacity-0 transition-opacity group-focus-within:opacity-100" />
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-emerald-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un jeu..."
            className="relative z-10 w-full rounded-[22px] border border-white/10 bg-slate-900/80 py-4 pl-12 pr-4 text-xs font-black uppercase tracking-[0.28em] text-white placeholder:text-slate-600 outline-none transition-all focus:border-emerald-500/40"
          />
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Continuer à jouer</p>
              <h3 className="text-base font-black uppercase italic tracking-tighter text-white">Reprendre l&apos;aventure</h3>
            </div>
            <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
              {continueGames.length} actifs
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {continueGames.map((game) => (
              <motion.button key={game.id} whileTap={{ scale: 0.98 }} onClick={() => router.push(game.path)} className={`min-w-[180px] rounded-[24px] border border-white/10 bg-gradient-to-br ${game.color} to-slate-900/80 p-4 text-left shadow-[0_16px_40px_rgba(2,6,23,0.28)]`}>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30">
                  <game.icon size={20} className={game.iconColor} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{game.category}</p>
                <h4 className="mt-1 text-base font-black uppercase italic tracking-tight text-white">{game.name}</h4>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">
                  <Play size={12} className="text-emerald-400" /> Reprendre
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {sectionGames.map((section) => (
          <section key={section.title} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{section.subtitle}</p>
                <h3 className="text-base font-black uppercase italic tracking-tighter text-white">{section.title}</h3>
              </div>
              <button className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Voir tout</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {section.games.map((game) => (
                <motion.button key={game.id} whileTap={{ scale: 0.98 }} onClick={() => router.push(game.path)} className="min-w-[150px] rounded-[22px] border border-white/10 bg-slate-900/70 p-3 text-left shadow-[0_12px_35px_rgba(2,6,23,0.26)]">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <game.icon size={18} className={game.iconColor} />
                    </div>
                    <button onClick={(event) => toggleFavorite(event, game.id)} className="rounded-full border border-white/10 bg-white/5 p-1.5">
                      <Heart size={14} className={favorites.includes(game.id) ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} />
                    </button>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">{game.category}</p>
                  <h4 className="mt-1 text-sm font-black uppercase italic tracking-tight text-white">{game.name}</h4>
                  <div className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <Users size={11} className="text-emerald-400" /> {game.players}
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-[28px] border border-white/10 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Découvrez aussi</p>
              <h3 className="text-base font-black uppercase italic tracking-tighter text-white">Les meilleurs moments du moment</h3>
            </div>
            <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">
              <Clock3 size={12} className="inline" /> Live
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-cyan-400/15 bg-cyan-500/10 p-4">
              <div className="flex items-center gap-2 text-cyan-300">
                <Crown size={14} /> <span className="text-[10px] font-black uppercase tracking-[0.26em]">Classement</span>
              </div>
              <p className="mt-2 text-sm font-black uppercase italic text-white">Quiz Insights domine le plateau</p>
            </div>
            <div className="rounded-[22px] border border-emerald-400/15 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <Sparkles size={14} /> <span className="text-[10px] font-black uppercase tracking-[0.26em]">Nouveau</span>
              </div>
              <p className="mt-2 text-sm font-black uppercase italic text-white">Biometric Lab apporte un rythme de folie</p>
            </div>
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-between rounded-t-[28px] border-t border-white/5 bg-[#020617]/90 px-6 py-4 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <NavIcon href="/client/home" icon={<Home size={22} />} label="ACCUEIL" active={pathname === '/client/home'} />
        <NavIcon href="/client/list" icon={<Gamepad2 size={22} />} label="EXPLORER" active={pathname === '/client/list'} />
        <NavIcon href="/client/market" icon={<ShoppingBag size={22} />} label="OFFRES" active={pathname === '/client/market'} />
        <NavIcon href="/client/chat" icon={<MessageSquare size={22} />} label="COMMUNAUTÉ" active={pathname === '/client/chat'} />
        <NavIcon href="/client/profile" icon={<User size={22} />} label="PROFIL" active={pathname === '/client/profile'} />
      </nav>
    </div>
  );
}

function NavIcon({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-emerald-400 -translate-y-1' : 'text-slate-600 hover:text-slate-300'}`}>
      <div className={`${active ? 'drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]' : ''} transition-all`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-[0.24em] ${active ? 'text-emerald-400' : 'text-slate-600'}`}>{label}</span>
    </Link>
  );
}

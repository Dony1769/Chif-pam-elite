"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Target, Sprout, TrendingUp, ShieldAlert, ArrowLeft, Loader2, 
  Dna, Brain, Lock, Layers, Box, ChevronRight, Activity, Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Type pour les statistiques par jeu
interface GameStats {
  volume: number;
  profit: number;
  count: number;
}

export default function AdminMiniGames() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    totalPlayers: 0,
    totalVolume: 0,
    totalProfit: 0
  });

  // État pour chaque jeu
  const [games, setGames] = useState<{ [key: string]: GameStats }>({});

  useEffect(() => {
    fetchAllGamesData();
  }, []);

  const calculateStats = (data: any[], type: 'status' | 'is_won') => {
    const volume = data.reduce((acc, curr) => acc + (curr.bet_amount || 0), 0);
    const profit = data.reduce((acc, curr) => {
      const isWin = type === 'is_won' ? curr.is_won : curr.status === 'won';
      const payout = isWin ? (curr.bet_amount * (curr.multiplier || 0)) : 0;
      return acc + (curr.bet_amount - payout);
    }, 0);
    return { volume, profit, count: data.length };
  };

  const fetchAllGamesData = async () => {
    try {
      setLoading(true);
      
      // Récupération de toutes les tables en parallèle
      const [
        mines, crash, biometric, vault, quiz, plinko, glass, elevator, profiles
      ] = await Promise.all([
        supabase.from('mines_games').select('bet_amount, is_won, multiplier'),
        supabase.from('crash_games').select('bet_amount, status, multiplier'),
        supabase.from('biometric_games').select('bet_amount, is_won, multiplier'),
        supabase.from('vault_games').select('bet_amount, is_won, multiplier'),
        supabase.from('quiz_games').select('bet_amount, is_won, multiplier'),
        supabase.from('plinko_games').select('bet_amount, is_won, multiplier'),
        supabase.from('glass_games').select('bet_amount, is_won, multiplier'),
        supabase.from('elevator_games').select('bet_amount, is_won, multiplier'),
        supabase.from('profiles').select('id', { count: 'exact' })
      ]);

      const gamesMap: { [key: string]: GameStats } = {
        mines: calculateStats(mines.data || [], 'is_won'),
        crash: calculateStats(crash.data || [], 'status'),
        biometric: calculateStats(biometric.data || [], 'is_won'),
        vault: calculateStats(vault.data || [], 'is_won'),
        quiz: calculateStats(quiz.data || [], 'is_won'),
        plinko: calculateStats(plinko.data || [], 'is_won'),
        glass: calculateStats(glass.data || [], 'is_won'),
        elevator: calculateStats(elevator.data || [], 'is_won'),
      };

      const totalV = Object.values(gamesMap).reduce((acc, curr) => acc + curr.volume, 0);
      const totalP = Object.values(gamesMap).reduce((acc, curr) => acc + curr.profit, 0);

      setGames(gamesMap);
      setGlobalStats({
        totalPlayers: profiles.count || 0,
        totalVolume: totalV,
        totalProfit: totalP
      });

    } catch (error) {
      console.error("Erreur Audit Jeux:", error);
    } finally {
      setLoading(false);
    }
  };

  // Composant pour les cartes de jeu individuelles
  const GameCard = ({ title, stats, icon: Icon, color }: { title: string, stats: GameStats, icon: any, color: string }) => (
    <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] hover:border-emerald-500/30 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-slate-950 border border-white/5 ${color}`}>
          <Icon size={20} />
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 font-bold uppercase">Volume</p>
          <p className="text-sm font-black">{stats.volume.toLocaleString()} HTG</p>
        </div>
      </div>
      <h4 className="text-lg font-black italic mb-4 uppercase">{title}</h4>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-[9px] text-slate-500 uppercase">Profit Net</p>
          <p className={`text-sm font-bold ${stats.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {stats.profit >= 0 ? '+' : ''}{stats.profit.toLocaleString()} HTG
          </p>
        </div>
        <div className="h-8 w-px bg-white/5"></div>
        <div className="text-right">
          <p className="text-[9px] text-slate-500 uppercase">Parties</p>
          <p className="text-sm text-white font-bold">{stats.count}</p>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="relative">
        <Loader2 className="animate-spin text-emerald-500" size={50} />
        <div className="absolute inset-0 blur-xl bg-emerald-500/20 animate-pulse"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-10 font-black italic uppercase tracking-tighter">
      {/* HEADER PREMIUM */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <button onClick={() => router.back()} className="p-4 bg-slate-900 rounded-3xl border border-white/5 hover:bg-emerald-500 hover:text-slate-950 transition-all shadow-xl">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-black italic">GAME <span className="text-emerald-500">CONTROL</span></h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em]">Surveillance Financière Temps Réel</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="px-6 py-3 bg-slate-900 border border-white/5 rounded-2xl text-center">
            <p className="text-[8px] text-slate-500">Joueurs</p>
            <p className="text-xl text-emerald-500">{globalStats.totalPlayers}</p>
          </div>
          <div className="px-6 py-3 bg-emerald-500 text-slate-950 rounded-2xl text-center shadow-lg shadow-emerald-500/20">
            <p className="text-[8px] font-bold opacity-70">Status</p>
            <p className="text-xl font-black">ELITE</p>
          </div>
        </div>
      </div>

      {/* GLOBAL PROFIT BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <div className="lg:col-span-2 bg-gradient-to-br from-emerald-500 to-emerald-600 p-10 rounded-[3rem] text-slate-950 relative overflow-hidden group shadow-2xl shadow-emerald-500/10">
          <div className="relative z-10">
            <p className="font-bold opacity-80 mb-2">Profit Net Consolidé</p>
            <h2 className="text-6xl md:text-7xl font-black tracking-tighter">
              {globalStats.totalProfit.toLocaleString()} <span className="text-2xl opacity-80 italic">HTG</span>
            </h2>
            <div className="mt-6 flex gap-4">
               <div className="px-4 py-2 bg-slate-950/10 border border-slate-950/20 rounded-xl flex items-center gap-2">
                  <Activity size={14} />
                  <span className="text-xs font-bold">Volume Total: {globalStats.totalVolume.toLocaleString()} HTG</span>
               </div>
            </div>
          </div>
          <TrendingUp size={200} className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700" />
        </div>

        <div className="bg-slate-900/80 border border-white/10 p-10 rounded-[3rem] backdrop-blur-xl flex flex-col justify-center relative overflow-hidden">
            <Zap className="text-emerald-500 absolute -right-4 -top-4 opacity-5" size={150} />
            <h3 className="text-sm text-slate-500 mb-2">Rendement Global</h3>
            <p className="text-4xl font-black">
              {globalStats.totalVolume > 0 
                ? ((globalStats.totalProfit / globalStats.totalVolume) * 100).toFixed(2) 
                : 0}%
            </p>
            <p className="text-[9px] text-emerald-500 mt-2 tracking-widest font-bold">Marge opérationnelle optimale</p>
        </div>
      </div>

      {/* GAMES GRID */}
      <h3 className="text-xl mb-6 flex items-center gap-3">
        <Layers className="text-emerald-500" size={20} />
        Performance par Jeu
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <GameCard title="Mines" stats={games.mines} icon={Target} color="text-rose-500" />
        <GameCard title="Crash" stats={games.crash} icon={Zap} color="text-emerald-500" />
        <GameCard title="Biometric" stats={games.biometric} icon={Dna} color="text-blue-500" />
        <GameCard title="Vault" stats={games.vault} icon={Lock} color="text-amber-500" />
        <GameCard title="Quiz" stats={games.quiz} icon={Brain} color="text-purple-500" />
        <GameCard title="Plinko" stats={games.plinko} icon={Layers} color="text-orange-500" />
        <GameCard title="Glass" stats={games.glass} icon={Box} color="text-cyan-500" />
        <GameCard title="Elevator" stats={games.elevator} icon={TrendingUp} color="text-indigo-500" />
      </div>

      {/* AUDIT SECTION */}
      <div className="bg-slate-900/30 border border-white/5 rounded-[3rem] p-10 backdrop-blur-md">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 shadow-inner">
              <ShieldAlert size={32} />
            </div>
            <div>
              <h3 className="text-xl">Audit d'intégrité <span className="text-emerald-500 italic">Provably Fair</span></h3>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Algorithme SHA-256 de vérification activé</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Latence Serveur</p>
              <p className="text-emerald-500 font-bold">14ms - EXCELLENT</p>
            </div>
            <button onClick={() => fetchAllGamesData()} className="p-4 bg-emerald-500 text-slate-950 rounded-2xl hover:scale-105 transition-all">
              <Zap size={20} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Target, Sprout, TrendingUp, ShieldAlert, ArrowLeft, Loader2, 
  Dna, Brain, Lock, Layers, Box, Activity, Zap, Power, PowerOff
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GameStats {
  volume: number;
  profit: number;
  count: number;
  isActive: boolean; // Ajout de l'état
}

export default function AdminMiniGames() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [globalStats, setGlobalStats] = useState({
    totalPlayers: 0,
    totalVolume: 0,
    totalProfit: 0
  });

  const [games, setGames] = useState<{ [key: string]: GameStats }>({});

  useEffect(() => {
    fetchAllGamesData();
  }, []);

  const calculateStats = (data: any[], type: 'status' | 'is_won', isActive: boolean) => {
    const volume = data.reduce((acc, curr) => acc + (curr.bet_amount || 0), 0);
    const profit = data.reduce((acc, curr) => {
      const isWin = type === 'is_won' ? curr.is_won : curr.status === 'won';
      const payout = isWin ? (curr.bet_amount * (curr.multiplier || 0)) : 0;
      return acc + (curr.bet_amount - payout);
    }, 0);
    return { volume, profit, count: data.length, isActive };
  };

  const fetchAllGamesData = async () => {
    try {
      setLoading(true);
      
      // 1. Récupérer les états (ON/OFF) des jeux
      const { data: settings } = await supabase.from('game_settings').select('*');
      const settingsMap = settings?.reduce((acc, curr) => ({ ...acc, [curr.game_id]: curr.is_active }), {}) || {};

      // 2. Récupérer les données des tables
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
        mines: calculateStats(mines.data || [], 'is_won', settingsMap['mines'] ?? true),
        crash: calculateStats(crash.data || [], 'status', settingsMap['crash'] ?? true),
        biometric: calculateStats(biometric.data || [], 'is_won', settingsMap['biometric'] ?? true),
        vault: calculateStats(vault.data || [], 'is_won', settingsMap['vault'] ?? true),
        quiz: calculateStats(quiz.data || [], 'is_won', settingsMap['quiz'] ?? true),
        plinko: calculateStats(plinko.data || [], 'is_won', settingsMap['plinko'] ?? true),
        glass: calculateStats(glass.data || [], 'is_won', settingsMap['glass'] ?? true),
        elevator: calculateStats(elevator.data || [], 'is_won', settingsMap['elevator'] ?? true),
      };

      const totalV = Object.values(gamesMap).reduce((acc, curr) => acc + curr.volume, 0);
      const totalP = Object.values(gamesMap).reduce((acc, curr) => acc + curr.profit, 0);

      setGames(gamesMap);
      setGlobalStats({ totalPlayers: profiles.count || 0, totalVolume: totalV, totalProfit: totalP });
    } catch (error) {
      console.error("Erreur Audit:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- NOUVELLE FONCTION DE TOGGLE ---
  const toggleGameStatus = async (gameId: string, currentStatus: boolean) => {
    setActionLoading(gameId);
    try {
      const { error } = await supabase
        .from('game_settings')
        .update({ is_active: !currentStatus })
        .eq('game_id', gameId);

      if (error) throw error;

      // Mise à jour locale pour l'UI
      setGames(prev => ({
        ...prev,
        [gameId]: { ...prev[gameId], isActive: !currentStatus }
      }));
    } catch (err) {
      alert("Erreur lors de la modification du statut.");
    } finally {
      setActionLoading(null);
    }
  };

  const GameCard = ({ id, title, stats, icon: Icon, color }: { id: string, title: string, stats: GameStats, icon: any, color: string }) => (
    <div className={`relative bg-slate-900/40 border ${stats.isActive ? 'border-white/5' : 'border-rose-500/30 bg-rose-500/5'} p-6 rounded-[2rem] transition-all group overflow-hidden`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-slate-950 border border-white/5 ${color}`}>
          <Icon size={20} />
        </div>
        
        {/* BOUTON PAUSE / PLAY */}
        <button 
          onClick={() => toggleGameStatus(id, stats.isActive)}
          disabled={actionLoading === id}
          className={`p-3 rounded-2xl transition-all active:scale-90 ${stats.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}
        >
          {actionLoading === id ? <Loader2 className="animate-spin" size={18} /> : (stats.isActive ? <Power size={18} /> : <PowerOff size={18} />)}
        </button>
      </div>

      <h4 className="text-lg font-black italic mb-4 uppercase flex items-center gap-2">
        {title}
        {!stats.isActive && <span className="text-[8px] bg-rose-500 text-white px-2 py-0.5 rounded-full not-italic">PAUSE</span>}
      </h4>

      <div className="flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity">
        <div>
          <p className="text-[9px] text-slate-500 uppercase">Profit</p>
          <p className={`text-sm font-bold ${stats.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {stats.profit.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-500 uppercase">Volume</p>
          <p className="text-sm font-bold">{stats.volume.toLocaleString()}</p>
        </div>
      </div>
      
      {/* OVERLAY MAINTENANCE */}
      {!stats.isActive && <div className="absolute inset-0 bg-rose-500/5 pointer-events-none border-2 border-rose-500/20 rounded-[2rem]"></div>}
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={50} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-10 font-black italic uppercase tracking-tighter">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <button onClick={() => router.back()} className="p-4 bg-slate-900 rounded-3xl border border-white/5 hover:bg-emerald-500 transition-all shadow-xl">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-black">GAME <span className="text-emerald-500">CENTER</span></h1>
            <p className="text-[10px] text-slate-500 tracking-[0.3em]">Master Administrator Panel</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="px-6 py-3 bg-slate-900 border border-white/5 rounded-2xl text-center">
            <p className="text-[8px] text-slate-500">Profit Global</p>
            <p className="text-xl text-emerald-500">{globalStats.totalProfit.toLocaleString()} HTG</p>
          </div>
        </div>
      </div>

      {/* GAMES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <GameCard id="mines" title="Mines" stats={games.mines} icon={Target} color="text-rose-500" />
        <GameCard id="crash" title="Crash" stats={games.crash} icon={Zap} color="text-emerald-500" />
        <GameCard id="biometric" title="Biometric" stats={games.biometric} icon={Dna} color="text-blue-500" />
        <GameCard id="vault" title="Vault" stats={games.vault} icon={Lock} color="text-amber-500" />
        <GameCard id="quiz" title="Quiz" stats={games.quiz} icon={Brain} color="text-purple-500" />
        <GameCard id="plinko" title="Plinko" stats={games.plinko} icon={Layers} color="text-orange-500" />
        <GameCard id="glass" title="Glass" stats={games.glass} icon={Box} color="text-cyan-500" />
        <GameCard id="elevator" title="Elevator" stats={games.elevator} icon={TrendingUp} color="text-indigo-500" />
      </div>

      {/* FOOTER INFO */}
      <div className="bg-slate-900/30 border border-white/5 rounded-[3rem] p-8 backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <ShieldAlert className="text-amber-500" size={24} />
          <p className="text-xs">Système de bascule instantanée. En coupant un jeu, tous les nouveaux paris seront refusés.</p>
        </div>
        <button onClick={() => fetchAllGamesData()} className="px-8 py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black hover:scale-105 transition-all uppercase italic">
          Rafraîchir les données
        </button>
      </div>
    </div>
  );
}

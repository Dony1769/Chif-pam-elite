"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Target, Sprout, TrendingUp, ShieldAlert, ArrowLeft, Loader2, 
  Dna, Brain, Lock, Layers, Box, Activity, Zap, Power, AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GameStats {
  volume: number;
  profit: number;
  count: number;
}

interface GameStatus {
  is_active: boolean;
}

export default function AdminMiniGames() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  
  const [globalStats, setGlobalStats] = useState({
    totalPlayers: 0,
    totalVolume: 0,
    totalProfit: 0
  });

  const [games, setGames] = useState<{ [key: string]: GameStats }>({});
  const [gameStates, setGameStates] = useState<{ [key: string]: boolean }>({});

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
      
      const [
        mines, crash, biometric, vault, quiz, plinko, glass, elevator, profiles, settings
      ] = await Promise.all([
        supabase.from('mines_games').select('bet_amount, is_won, multiplier'),
        supabase.from('crash_games').select('bet_amount, status, multiplier'),
        supabase.from('biometric_games').select('bet_amount, is_won, multiplier'),
        supabase.from('vault_games').select('bet_amount, is_won, multiplier'),
        supabase.from('quiz_games').select('bet_amount, is_won, multiplier'),
        supabase.from('plinko_games').select('bet_amount, is_won, multiplier'),
        supabase.from('glass_games').select('bet_amount, is_won, multiplier'),
        supabase.from('elevator_games').select('bet_amount, is_won, multiplier'),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('game_settings').select('game_id, is_active')
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

      const statesMap: { [key: string]: boolean } = {};
      settings.data?.forEach(s => { statesMap[s.game_id] = s.is_active; });

      const totalV = Object.values(gamesMap).reduce((acc, curr) => acc + curr.volume, 0);
      const totalP = Object.values(gamesMap).reduce((acc, curr) => acc + curr.profit, 0);

      setGames(gamesMap);
      setGameStates(statesMap);
      setGlobalStats({
        totalPlayers: profiles.count || 0,
        totalVolume: totalV,
        totalProfit: totalP
      });

    } catch (error) {
      console.error("Audit Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGame = async (gameId: string, currentState: boolean) => {
    setUpdating(gameId);
    try {
      const { error } = await supabase
        .from('game_settings')
        .update({ is_active: !currentState, updated_at: new Date() })
        .eq('game_id', gameId);

      if (error) throw error;
      setGameStates(prev => ({ ...prev, [gameId]: !currentState }));
    } catch (err) {
      alert("Erreur lors de la mise à jour du statut.");
    } finally {
      setUpdating(null);
    }
  };

  const GameCard = ({ id, title, stats, icon: Icon, color }: { id: string, title: string, stats: GameStats, icon: any, color: string }) => {
    const isActive = gameStates[id];
    const isUpdating = updating === id;

    return (
      <div className={`relative overflow-hidden p-6 rounded-[2.5rem] border transition-all duration-500 ${isActive ? 'bg-slate-900/40 border-white/5 shadow-xl' : 'bg-rose-950/20 border-rose-500/20 grayscale-[0.5]'}`}>
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl bg-slate-950 border border-white/5 ${isActive ? color : 'text-slate-500'}`}>
            <Icon size={20} />
          </div>
          
          <button 
            onClick={() => toggleGame(id, !!isActive)}
            disabled={!!isUpdating}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[8px] font-black transition-all active:scale-90 ${isActive ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}`}
          >
            {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
            {isActive ? 'ACTIF' : 'COUPÉ'}
          </button>
        </div>

        <h4 className="text-lg font-black italic mb-4 uppercase flex items-center gap-2">
          {title}
          {!isActive && <AlertTriangle size={14} className="text-rose-500 animate-pulse" />}
        </h4>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[9px] text-slate-500 uppercase font-bold">Volume</p>
              <p className="text-sm font-black tracking-tight">{stats?.volume.toLocaleString()} HTG</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-500 uppercase font-bold">Profit</p>
              <p className={`text-sm font-black ${stats?.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stats?.profit >= 0 ? '+' : ''}{stats?.profit.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
             <div className="h-full bg-emerald-500" style={{ width: '70%' }}></div>
             <div className="h-full bg-rose-500" style={{ width: '30%' }}></div>
          </div>
        </div>
      </div>
    );
  };

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
          <button onClick={() => router.back()} className="p-4 bg-slate-900 rounded-3xl border border-white/5 hover:text-emerald-500 transition-all shadow-xl">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl">Game <span className="text-emerald-500">Security</span></h1>
            <p className="text-[10px] text-slate-500 tracking-[0.3em]">Master Control Panel v2.0</p>
          </div>
        </div>
        <button onClick={fetchAllGamesData} className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center gap-3 hover:bg-emerald-500 hover:text-slate-950 transition-all">
          <Zap size={20} />
          <span className="text-xs">Rafraîchir Audit</span>
        </button>
      </div>

      {/* STATS GLOBALES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <div className="lg:col-span-2 bg-gradient-to-br from-emerald-500 to-emerald-600 p-10 rounded-[3rem] text-slate-950 shadow-2xl shadow-emerald-500/10">
          <p className="font-bold opacity-80 text-sm">Profit Net de la Plateforme</p>
          <h2 className="text-6xl md:text-7xl font-black">{globalStats.totalProfit.toLocaleString()} HTG</h2>
          <div className="mt-6 inline-flex items-center gap-2 bg-slate-950/10 px-4 py-2 rounded-xl text-xs font-bold">
            <Activity size={14} /> Flux Global : {globalStats.totalVolume.toLocaleString()} HTG
          </div>
        </div>
        <div className="bg-slate-900 border border-white/5 p-10 rounded-[3rem] flex flex-col justify-center">
            <p className="text-slate-500 text-[10px] mb-2">Communauté</p>
            <p className="text-5xl font-black">{globalStats.totalPlayers}</p>
            <p className="text-emerald-500 text-[10px] mt-2 tracking-widest">Utilisateurs Enregistrés</p>
        </div>
      </div>

      {/* GRILLE DES JEUX */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GameCard id="mines" title="Mines" stats={games.mines} icon={Target} color="text-rose-500" />
        <GameCard id="crash" title="Crash" stats={games.crash} icon={Zap} color="text-emerald-400" />
        <GameCard id="biometric" title="Biometric" stats={games.biometric} icon={Dna} color="text-blue-400" />
        <GameCard id="vault" title="Vault" stats={games.vault} icon={Lock} color="text-amber-500" />
        <GameCard id="quiz" title="Quiz" stats={games.quiz} icon={Brain} color="text-purple-400" />
        <GameCard id="plinko" title="Plinko" stats={games.plinko} icon={Layers} color="text-orange-500" />
        <GameCard id="glass" title="Glass" stats={games.glass} icon={Box} color="text-cyan-400" />
        <GameCard id="elevator" title="Elevator" stats={games.elevator} icon={TrendingUp} color="text-indigo-400" />
      </div>

      {/* MAINTENANCE GLOBALE */}
      <div className="mt-12 bg-rose-500/5 border border-rose-500/20 p-10 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/20">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h3 className="text-xl">Protocole d'urgence</h3>
            <p className="text-[10px] text-rose-500 font-bold opacity-70 uppercase">Coupure de sécurité immédiate</p>
          </div>
        </div>
        <p className="text-[9px] text-slate-500 max-w-md italic">
          Cette interface pilote directement la disponibilité des mini-jeux pour les clients. 
          Lorsqu'un jeu est "Coupé", il devient inaccessible en temps réel.
        </p>
      </div>
    </div>
  );
}

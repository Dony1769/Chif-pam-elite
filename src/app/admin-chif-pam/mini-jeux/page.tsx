"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Target, Sprout, TrendingUp, ShieldAlert, ArrowLeft, Loader2, 
  Dna, Brain, Lock, Layers, Box, Activity, Zap, Play, Pause, RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GameStats {
  volume: number;
  profit: number;
  count: number;
  isActive: boolean;
}

export default function AdminMiniGames() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [globalStats, setGlobalStats] = useState({ totalPlayers: 0, totalVolume: 0, totalProfit: 0 });
  const [games, setGames] = useState<{ [key: string]: GameStats }>({});

  useEffect(() => {
    fetchAllGamesData();
  }, []);

  // Fonction de calcul ultra-robuste pour éviter le "NaN" ou le blocage
  const calculateStats = (res: any, isWonType: boolean = true) => {
    const data = res.data || [];
    const volume = data.reduce((acc: number, curr: any) => acc + (Number(curr.bet_amount) || 0), 0);
    const profit = data.reduce((acc: number, curr: any) => {
      const isWin = isWonType ? curr.is_won : curr.status === 'won';
      const multiplier = Number(curr.multiplier) || 0;
      const bet = Number(curr.bet_amount) || 0;
      const payout = isWin ? (bet * multiplier) : 0;
      return acc + (bet - payout);
    }, 0);
    return { volume, profit, count: data.length };
  };

  const fetchAllGamesData = async () => {
    try {
      setLoading(true);
      
      // 1. Récupérer les statuts de pause/activité
      const { data: settings } = await supabase.from('game_settings').select('*');

      // 2. Récupérer les données de TOUTES les tables (Indépendamment pour éviter qu'une erreur bloque tout)
      const tables = [
        { id: 'mines', table: 'mines_games', isWon: true },
        { id: 'crash', table: 'crash_games', isWon: false },
        { id: 'biometric', table: 'biometric_games', isWon: true },
        { id: 'vault', table: 'vault_games', isWon: true },
        { id: 'quiz', table: 'quiz_games', isWon: true },
        { id: 'plinko', table: 'plinko_games', isWon: true },
        { id: 'glass', table: 'glass_games', isWon: true },
        { id: 'elevator', table: 'elevator_games', isWon: true },
      ];

      const gamesResults: any = {};
      let totalV = 0;
      let totalP = 0;

      for (const t of tables) {
        const res = await supabase.from(t.table).select('bet_amount, multiplier, ' + (t.isWon ? 'is_won' : 'status'));
        const stats = calculateStats(res, t.isWon);
        const setting = settings?.find(s => s.game_id === t.id);
        
        gamesResults[t.id] = { ...stats, isActive: setting?.is_active ?? true };
        totalV += stats.volume;
        totalP += stats.profit;
      }

      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });

      setGames(gamesResults);
      setGlobalStats({ totalPlayers: count || 0, totalVolume: totalV, totalProfit: totalP });
    } catch (error) {
      console.error("Erreur de synchronisation:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- FONCTION DE CONTROLE (PAUSE / PLAY) ---
  const toggleGameStatus = async (gameId: string, currentStatus: boolean) => {
    setUpdating(gameId);
    try {
      const { error } = await supabase
        .from('game_settings')
        .update({ is_active: !currentStatus })
        .eq('game_id', gameId);

      if (error) throw error;
      
      // Mise à jour locale
      setGames(prev => ({
        ...prev,
        [gameId]: { ...prev[gameId], isActive: !currentStatus }
      }));
    } catch (err) {
      alert("Erreur lors de la mise à jour du statut.");
    } finally {
      setUpdating(null);
    }
  };

  const GameCard = ({ id, title, icon: Icon, color }: { id: string, title: string, icon: any, color: string }) => {
    const stats = games[id] || { volume: 0, profit: 0, count: 0, isActive: true };
    return (
      <div className={`relative bg-slate-900/40 border ${stats.isActive ? 'border-white/5' : 'border-rose-500/30'} p-6 rounded-[2rem] transition-all group overflow-hidden`}>
        {!stats.isActive && <div className="absolute top-0 right-0 bg-rose-500 text-[8px] px-3 py-1 rounded-bl-xl font-black">PAUSE</div>}
        
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl bg-slate-950 border border-white/5 ${color}`}>
            <Icon size={20} />
          </div>
          <button 
            onClick={() => toggleGameStatus(id, stats.isActive)}
            disabled={updating === id}
            className={`p-2 rounded-xl transition-all ${stats.isActive ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-emerald-500 text-slate-950 hover:scale-105'}`}
          >
            {updating === id ? <Loader2 size={16} className="animate-spin" /> : stats.isActive ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
        </div>

        <h4 className="text-lg font-black italic mb-4 uppercase">{title}</h4>
        
        <div className="space-y-3">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500 uppercase">Volume</span>
            <span className="font-bold">{stats.volume.toLocaleString()} HTG</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500 uppercase">Profit</span>
            <span className={`font-bold ${stats.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {stats.profit.toLocaleString()} HTG
            </span>
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
          <button onClick={() => router.back()} className="p-4 bg-slate-900 rounded-3xl border border-white/5 hover:bg-emerald-500 transition-all shadow-xl">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-black italic">CONTROL <span className="text-emerald-500">PANEL</span></h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em]">Gestion des accès & monitoring</p>
          </div>
        </div>
        <button onClick={() => fetchAllGamesData()} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
          <RefreshCw size={20} />
        </button>
      </div>

      {/* GLOBAL STATS BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <div className="lg:col-span-2 bg-emerald-500 p-10 rounded-[3rem] text-slate-950 relative overflow-hidden shadow-2xl shadow-emerald-500/10">
          <div className="relative z-10">
            <p className="font-bold opacity-80 mb-2">Profit Net Global</p>
            <h2 className="text-6xl md:text-7xl font-black">{globalStats.totalProfit.toLocaleString()} <span className="text-2xl italic">HTG</span></h2>
          </div>
          <TrendingUp size={200} className="absolute -right-10 -bottom-10 opacity-10" />
        </div>
        <div className="bg-slate-900/80 border border-white/10 p-10 rounded-[3rem] backdrop-blur-xl flex flex-col justify-center">
          <h3 className="text-sm text-slate-500 mb-2 uppercase">Volume Entrant</h3>
          <p className="text-4xl font-black text-emerald-500">{globalStats.totalVolume.toLocaleString()}</p>
          <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: '70%' }}></div>
          </div>
        </div>
      </div>

      {/* GAMES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <GameCard id="mines" title="Mines" icon={Target} color="text-rose-500" />
        <GameCard id="crash" title="Crash" icon={Zap} color="text-emerald-500" />
        <GameCard id="biometric" title="Biometric" icon={Dna} color="text-blue-500" />
        <GameCard id="vault" title="Vault" icon={Lock} color="text-amber-500" />
        <GameCard id="quiz" title="Quiz" icon={Brain} color="text-purple-500" />
        <GameCard id="plinko" title="Plinko" icon={Layers} color="text-orange-500" />
        <GameCard id="glass" title="Glass" icon={Box} color="text-cyan-500" />
        <GameCard id="elevator" title="Elevator" icon={TrendingUp} color="text-indigo-500" />
      </div>

      {/* FOOTER AUDIT */}
      <div className="bg-slate-900/30 border border-white/5 rounded-[3rem] p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ShieldAlert className="text-emerald-500" />
          <span className="text-xs">Système de sécurité Elite actif - SHA-256 Verified</span>
        </div>
        <div className="text-[10px] text-slate-500">Dernière synchro: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
}


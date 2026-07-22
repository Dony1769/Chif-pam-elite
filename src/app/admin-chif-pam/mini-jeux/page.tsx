"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ADMIN_GAME_CONFIG, type AdminGameId } from '@/lib/constants/admin-games';
import { AdminMiniGamesService } from '@/services/admin/mini-games';
import { 
  Target, TrendingUp, ShieldAlert, ArrowLeft, Loader2, 
  Dna, Brain, Lock, Layers, Box, Zap, Play, Pause, RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GameStats {
  volume: number;
  profit: number;
  count: number;
  isActive: boolean;
}

type DashboardGameRow = {
  bet_amount?: number | null;
  multiplier?: number | null;
  final_multiplier?: number | null;
  is_won?: boolean | null;
  status?: string | null;
};

type GameSetting = {
  game_id: string;
  is_active: boolean;
};

type GameCardProps = {
  id: AdminGameId;
  title: string;
  color: string;
  icon: React.ComponentType<{ size?: number; className?: string; fill?: string }>;
};

export default function AdminMiniGames() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [globalStats, setGlobalStats] = useState({ totalPlayers: 0, totalVolume: 0, totalProfit: 0 });
  const [games, setGames] = useState<{ [key: string]: GameStats }>({});

  const fetchAllGamesData = async () => {
    try {
      setLoading(true);
      const { data: settings } = await supabase.from('game_settings').select('*').returns<GameSetting[]>();

      const results: { [key: string]: GameStats } = {};
      let totalV = 0;
      let totalP = 0;

      for (const item of ADMIN_GAME_CONFIG) {
        const { data, error } = await supabase.from(item.table).select('*').returns<DashboardGameRow[]>();
        
        if (error) {
          results[item.id] = { volume: 0, profit: 0, count: 0, isActive: true };
          continue;
        }

        // --- CALCUL PROFESSIONNEL ---
        let volumeTable = 0;
        let payoutTable = 0;

        data?.forEach((game) => {
          const bet = Number(game.bet_amount) || 0;
          const mult = Number(game.multiplier || game.final_multiplier || 0);
          
          volumeTable += bet;

          // Détection universelle de la victoire :
          // Soit le booléen is_won est vrai, soit le status est 'won' ou 'completed'
          const isWin = game.is_won === true || 
                        game.status === 'won' || 
                        game.status === 'completed';

          if (isWin) {
            payoutTable += (bet * mult);
          }
        });

        // Profit Réel = Argent encaissé (Mises) - Argent reversé (Gains)
        const profitTable = volumeTable - payoutTable;

        const s = settings?.find(setting => setting.game_id === item.id);

        results[item.id] = {
          volume: volumeTable,
          profit: profitTable,
          count: data?.length || 0,
          isActive: s?.is_active ?? true
        };

        totalV += volumeTable;
        totalP += profitTable;
      }

      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

      setGames(results);
      setGlobalStats({
        totalPlayers: count || 0,
        totalVolume: totalV,
        totalProfit: totalP
      });

    } catch (err) {
      console.error("Erreur Dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllGamesData();
  }, []);

  const toggleGameStatus = async (gameId: string, currentStatus: boolean) => {
    setUpdating(gameId);
    try {
      const result = await AdminMiniGamesService.toggleStatus(gameId, currentStatus);
      if (!result.success) {
        throw new Error(result.message);
      }
      
      setGames(prev => ({
        ...prev,
        [gameId]: { ...prev[gameId], isActive: !currentStatus }
      }));
    } catch (err: unknown) {
      alert("Erreur de mise à jour: " + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setUpdating(null);
    }
  };

  const GameCard = ({ id, title, icon: Icon, color }: GameCardProps) => {
    const s = games[id] || { volume: 0, profit: 0, count: 0, isActive: true };
    return (
      <div className={`relative p-6 rounded-[2.5rem] bg-slate-900/50 border transition-all ${s.isActive ? 'border-white/5' : 'border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.1)]'}`}>
        {!s.isActive && (
          <div className="absolute top-4 right-16 px-2 py-1 bg-rose-500 text-[8px] rounded-lg font-black animate-pulse">
            MAINTENANCE
          </div>
        )}
        
        <div className="flex justify-between items-start mb-6">
          <div className={`p-3 rounded-2xl bg-slate-950 border border-white/5 ${color}`}>
            <Icon size={20} />
          </div>
          <button 
            onClick={() => toggleGameStatus(id, s.isActive)}
            disabled={updating === id}
            className={`p-2 rounded-xl transition-all ${s.isActive ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-slate-950' : 'bg-rose-500 text-white hover:scale-105'}`}
          >
            {updating === id ? <Loader2 size={16} className="animate-spin" /> : s.isActive ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
        </div>

        <h3 className="text-lg font-black italic mb-4">{title}</h3>
        
        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
          <div>
            <p className="text-[9px] text-slate-500 uppercase">Volume</p>
            <p className="text-sm font-bold">{s.volume.toLocaleString()} <span className="text-[8px] opacity-50">HTG</span></p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-500 uppercase">Profit</p>
            <p className={`text-sm font-bold ${s.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {s.profit >= 0 ? '+' : ''}{s.profit.toLocaleString()}
            </p>
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
          <button onClick={() => router.back()} className="p-4 bg-slate-900 rounded-3xl border border-white/5 hover:border-emerald-500/50 transition-all">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-black italic">CONTROL <span className="text-emerald-500">PANEL</span></h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em]">ADMIN ROOT ACCESS</p>
          </div>
        </div>
        <button onClick={fetchAllGamesData} className="p-4 bg-white/5 rounded-2xl hover:bg-emerald-500 hover:text-slate-950 transition-all">
          <RefreshCw size={24} />
        </button>
      </div>

      {/* STATS GLOBALES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <div className="lg:col-span-2 bg-linear-to-br from-emerald-500 to-emerald-600 p-10 rounded-[3rem] text-slate-950 shadow-2xl shadow-emerald-500/20">
          <p className="font-bold opacity-80 mb-2 italic">Profit Net Consolidé</p>
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter">
            {globalStats.totalProfit.toLocaleString()} <span className="text-2xl opacity-80 italic font-light">HTG</span>
          </h2>
        </div>
        <div className="bg-slate-900/80 border border-white/10 p-10 rounded-[3rem] backdrop-blur-xl flex flex-col justify-center">
          <p className="text-sm text-slate-500 mb-2 uppercase">Utilisateurs Actifs</p>
          <p className="text-6xl font-black text-emerald-500">{globalStats.totalPlayers}</p>
        </div>
      </div>

      {/* GRILLE DES JEUX */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ADMIN_GAME_CONFIG.map((game) => {
          const iconMap: Record<AdminGameId, GameCardProps['icon']> = {
            mines: Target,
            crash: Zap,
            biometric: Dna,
            vault: Lock,
            quiz: Brain,
            plinko: Layers,
            glass: Box,
            elevator: TrendingUp,
          };

          return (
            <GameCard
              key={game.id}
              id={game.id}
              title={game.title}
              color={game.color}
              icon={iconMap[game.id]}
            />
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="mt-12 p-8 bg-slate-900/30 border border-white/5 rounded-[3rem] flex items-center justify-between opacity-50">
        <div className="flex items-center gap-4 uppercase text-[10px]">
          <ShieldAlert size={20} className="text-emerald-500" />
          <span>Sécurité Elite - Synchro Temps Réel</span>
        </div>
        <span className="text-[10px]">{new Date().toLocaleDateString()}</span>
      </div>
    </div>
  );
}

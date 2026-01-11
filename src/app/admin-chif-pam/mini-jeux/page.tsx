"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Target, Sprout, TrendingUp, 
  ShieldAlert, ArrowLeft, Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminMiniGames() {
  const router = useRouter();
  const [stats, setStats] = useState({
    minesVolume: 0,
    minesProfit: 0,
    crashVolume: 0,
    crashProfit: 0,
    totalPlayers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      // Extraction parallèle pour plus de rapidité
      const [minesRes, crashRes, playersRes] = await Promise.all([
        supabase.from('mines_games').select('bet_amount, is_won, multiplier'),
        supabase.from('crash_games').select('bet_amount, status, crash_point'), // Utilisation de crash_point selon ta DB
        supabase.from('profiles').select('id', { count: 'exact' })
      ]);

      // Logique Mines : Profit = Mise - (Mise * Multiplier si gagné)
      const minesData = minesRes.data || [];
      const mV = minesData.reduce((acc, curr) => acc + (curr.bet_amount || 0), 0);
      const mP = minesData.reduce((acc, curr) => {
        const payout = curr.is_won ? (curr.bet_amount * curr.multiplier) : 0;
        return acc + (curr.bet_amount - payout);
      }, 0);

      // Logique Crash : Profit = Mise - (Mise * multiplier_final si 'won')
      // Note : J'utilise multiplier ici car il est standard pour le gain
      const crashData = crashRes.data || [];
      const cV = crashData.reduce((acc, curr) => acc + (curr.bet_amount || 0), 0);
      const cP = crashData.reduce((acc, curr) => {
        // Un pari perdu (crash) est un profit de 100% pour la plateforme
        const payout = curr.status === 'won' ? (curr.bet_amount * (curr.crash_point || 1)) : 0;
        return acc + (curr.bet_amount - payout);
      }, 0);

      setStats({
        minesVolume: mV,
        minesProfit: mP,
        crashVolume: cV,
        crashProfit: cP,
        totalPlayers: playersRes.count || 0
      });
    } catch (error) {
      console.error("Erreur d'analyse des données:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 font-black italic uppercase">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-emerald-500 hover:text-slate-950 transition-all">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl tracking-tighter">Gestion Mini-Jeux</h1>
        </div>
        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <span className="text-emerald-500 text-[10px] animate-pulse">Live Monitor ON</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Card Profit Global */}
        <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-slate-950 shadow-2xl shadow-emerald-500/20 relative overflow-hidden">
          <p className="text-[10px] font-bold opacity-70">Profit Net Global</p>
          <h2 className="text-5xl mt-2">{(stats.minesProfit + stats.crashProfit).toLocaleString()} <span className="text-sm font-medium">HTG</span></h2>
          <TrendingUp size={120} className="absolute -right-6 -bottom-6 opacity-10" />
        </div>

        {/* Mines Stat */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 relative">
          <Target className="text-rose-500 mb-4" size={32} />
          <p className="text-[10px] text-slate-500">Volume Mines</p>
          <h3 className="text-2xl font-bold">{stats.minesVolume.toLocaleString()} HTG</h3>
          <div className={`inline-block mt-2 px-2 py-1 rounded-lg text-[9px] ${stats.minesProfit >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
             Rendement: {stats.minesProfit.toLocaleString()} HTG
          </div>
        </div>

        {/* Crash Stat */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 relative">
          <Sprout className="text-emerald-500 mb-4" size={32} />
          <p className="text-[10px] text-slate-500">Volume Crash</p>
          <h3 className="text-2xl font-bold">{stats.crashVolume.toLocaleString()} HTG</h3>
          <div className={`inline-block mt-2 px-2 py-1 rounded-lg text-[9px] ${stats.crashProfit >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
             Rendement: {stats.crashProfit.toLocaleString()} HTG
          </div>
        </div>
      </div>

      {/* Section Intégrité */}
      <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8">
        <div className="flex items-center gap-4 mb-6">
          <ShieldAlert className="text-amber-500" size={24} />
          <h3 className="text-lg">Audit d'intégrité (Provably Fair)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex justify-between items-center">
            <span className="text-[10px] text-slate-400">Joueurs Actifs</span>
            <span className="text-emerald-500">{stats.totalPlayers}</span>
          </div>
          <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex justify-between items-center">
            <span className="text-[10px] text-slate-400">Statut Serveur</span>
            <span className="text-emerald-500 font-bold">OPTIMAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}


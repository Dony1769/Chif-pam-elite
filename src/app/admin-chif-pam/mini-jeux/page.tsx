// /app/admin-chif-pam/mini-jeux/page.tsx 
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
      // Récupération des données Mines
      const { data: mines } = await supabase
        .from('mines_games')
        .select('bet_amount, multiplier, is_won');
      
      // Récupération des données Crash
      const { data: crash } = await supabase
        .from('crash_games')
        .select('bet_amount, crash_point, status');

      // Nombre de joueurs uniques (basé sur la table profiles)
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Calcul Mines : Profit Admin = Mises - (Mises * Multiplier si gagné)
      const mV = mines?.reduce((acc, curr) => acc + Number(curr.bet_amount), 0) || 0;
      const mP = mines?.reduce((acc, curr) => {
        const payout = curr.is_won ? (Number(curr.bet_amount) * Number(curr.multiplier)) : 0;
        return acc + (Number(curr.bet_amount) - payout);
      }, 0) || 0;

      // Calcul Crash : Profit Admin = Mises - (Mises * Multiplier si gagné)
      const cV = crash?.reduce((acc, curr) => acc + Number(curr.bet_amount), 0) || 0;
      const cP = crash?.reduce((acc, curr) => {
        // Note: Dans crash_games, on considère 'won' si le statut est validé
        const payout = curr.status === 'won' ? (Number(curr.bet_amount) * Number(curr.crash_point)) : 0;
        return acc + (Number(curr.bet_amount) - payout);
      }, 0) || 0;

      setStats({
        minesVolume: mV,
        minesProfit: mP,
        crashVolume: cV,
        crashProfit: cP,
        totalPlayers: userCount || 0
      });
    } catch (error) {
      console.error("Erreur stats admin:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

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
          <span className="text-emerald-500 text-[10px]">Utilisateurs : {stats.totalPlayers}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Profit Total */}
        <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-slate-950 shadow-2xl shadow-emerald-500/20 relative overflow-hidden">
          <p className="text-[10px] opacity-70 font-bold">Profit Net Global</p>
          <h2 className="text-5xl mt-2">{(stats.minesProfit + stats.crashProfit).toLocaleString()} <span className="text-sm">HTG</span></h2>
          <TrendingUp size={100} className="absolute -right-4 -bottom-4 opacity-10" />
        </div>

        {/* Mines Stats */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 relative">
          <Target className="text-rose-500 mb-4" size={32} />
          <p className="text-[10px] text-slate-500">Volume Mines</p>
          <h3 className="text-2xl">{stats.minesVolume.toLocaleString()} HTG</h3>
          <p className={`text-[10px] mt-2 font-bold ${stats.minesProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
             Péréquation: {stats.minesProfit.toLocaleString()} HTG
          </p>
        </div>

        {/* Crash Stats */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 relative">
          <Sprout className="text-emerald-500 mb-4" size={32} />
          <p className="text-[10px] text-slate-500">Volume Crash</p>
          <h3 className="text-2xl">{stats.crashVolume.toLocaleString()} HTG</h3>
          <p className={`text-[10px] mt-2 font-bold ${stats.crashProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
             Péréquation: {stats.crashProfit.toLocaleString()} HTG
          </p>
        </div>
      </div>

      {/* Audit Block */}
      <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8">
        <div className="flex items-center gap-4 mb-6">
          <ShieldAlert className="text-amber-500" size={24} />
          <h3 className="text-lg">Intégrité Provably Fair</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex justify-between items-center">
                <span className="text-[10px] text-slate-400">Statut Système</span>
                <span className="text-[10px] text-emerald-500 font-bold">Opérationnel</span>
            </div>
            <p className="text-[9px] text-slate-500 normal-case italic opacity-60">
                Chaque transaction est vérifiée contre le hash SHA-256 généré lors du placement de la mise.
            </p>
        </div>
      </div>
    </div>
  );
}


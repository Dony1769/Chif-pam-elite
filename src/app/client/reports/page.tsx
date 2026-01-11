"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, TrendingDown, 
  Target, Sprout, ChevronLeft,
  Award, PieChart, Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClientReports() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalWon: 0, totalLost: 0, gamesPlayed: 0,
    bestMultiplier: 0, favoriteGame: "Mines Elite"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: trans } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .in('type', ['GAME_BET', 'GAME_WON']);

        if (trans) {
          const won = trans.filter(t => t.type === 'GAME_WON').reduce((acc, t) => acc + t.amount, 0);
          const lost = trans.filter(t => t.type === 'GAME_BET').reduce((acc, t) => acc + Math.abs(t.amount), 0);
          
          setStats({
            totalWon: won,
            totalLost: lost,
            gamesPlayed: trans.filter(t => t.type === 'GAME_BET').length,
            bestMultiplier: 0,
            favoriteGame: "Mines Elite"
          });
        }
      } catch (error) {
        console.error(error);
      } finally { setLoading(false); }
    };
    fetchGlobalStats();
  }, []);

  const netProfit = stats.totalWon - stats.totalLost;

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/5"><ChevronLeft size={24} /></button>
        <h1 className="text-xl tracking-tighter">Rapport d'activité</h1>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden shadow-2xl">
          <p className="text-[10px] text-slate-500 tracking-widest mb-1">Performance Net (HTG)</p>
          <h2 className={`text-4xl ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {netProfit.toLocaleString()}
          </h2>
          <PieChart className="absolute -right-4 -bottom-4 opacity-5" size={120} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
            <TrendingUp className="text-emerald-500 mb-2" size={20} />
            <p className="text-[8px] text-slate-500">Récolté</p>
            <p className="text-sm">{stats.totalWon.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
            <TrendingDown className="text-rose-500 mb-2" size={20} />
            <p className="text-[8px] text-slate-500">Investi</p>
            <p className="text-sm">{stats.totalLost.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] text-slate-500 px-2 tracking-widest">Répartition</h3>
          <GameStatRow icon={<Target size={16} className="text-rose-500" />} name="Mines Elite" count={stats.gamesPlayed} color="bg-rose-500" percent={70} />
          <GameStatRow icon={<Sprout size={16} className="text-emerald-500" />} name="Croissance" count={5} color="bg-emerald-500" percent={30} />
        </div>
      </div>
    </div>
  );
}

function GameStatRow({ icon, name, count, color, percent }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-white/5">
      <div className="flex items-center gap-3">
        {icon}
        <div><p className="text-[10px]">{name}</p><p className="text-[8px] text-slate-500">{count} Parties</p></div>
      </div>
      <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, TrendingDown, 
  Target, Sprout, ChevronLeft,
  PieChart, Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClientReports() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    minesCount: 0,
    crashCount: 0,
    totalInvested: 0,
    totalWon: 0,
  });

  useEffect(() => {
    async function getClientStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [mines, crash] = await Promise.all([
          supabase.from('mines_games').select('*').eq('user_id', user.id),
          supabase.from('crash_games').select('*').eq('user_id', user.id)
        ]);

        const mData = mines.data || [];
        const cData = crash.data || [];

        // Investissement total (Mines + Crash)
        const invested = [...mData, ...cData].reduce((acc, g) => acc + (g.bet_amount || 0), 0);
        
        // Gains Mines
        const minesWon = mData.filter(g => g.is_won).reduce((acc, g) => acc + (g.bet_amount * (g.multiplier || 0)), 0);
        
        // Gains Crash (CORRIGÉ)
        const crashWon = cData.filter(g => g.status === 'won').reduce((acc, g) => acc + (g.bet_amount * (g.multiplier || 0)), 0);

        setData({
          minesCount: mData.length,
          crashCount: cData.length,
          totalInvested: invested,
          totalWon: minesWon + crashWon
        });

      } catch (e) {
        console.error("Erreur Client Reports:", e);
      } finally {
        setLoading(false);
      }
    }
    getClientStats();
  }, []);

  const netProfit = data.totalWon - data.totalInvested;

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl tracking-tighter font-black">Rapport d'activité</h1>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden shadow-2xl">
          <p className="text-[10px] text-slate-500 tracking-widest mb-1 font-bold">Performance Net (HTG)</p>
          <h2 className={`text-4xl font-black ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()}
          </h2>
          <PieChart className="absolute -right-4 -bottom-4 opacity-5" size={120} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
            <TrendingUp className="text-emerald-500 mb-2" size={20} />
            <p className="text-[8px] text-slate-500 font-bold">Gains Totaux</p>
            <p className="text-sm font-black">{data.totalWon.toLocaleString()} HTG</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
            <TrendingDown className="text-rose-500 mb-2" size={20} />
            <p className="text-[8px] text-slate-500 font-bold">Total Misé</p>
            <p className="text-sm font-black">{data.totalInvested.toLocaleString()} HTG</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] text-slate-500 px-2 tracking-widest font-bold">Répartition des sessions</h3>
          
          <GameStatRow 
            icon={<Target size={16} className="text-rose-500" />} 
            name="Mines Elite" 
            count={data.minesCount} 
            color="bg-rose-500" 
            percent={data.minesCount > 0 ? (data.minesCount / (data.minesCount + data.crashCount) * 100) : 0} 
          />
          
          <GameStatRow 
            icon={<Sprout size={16} className="text-emerald-500" />} 
            name="Crash Game" 
            count={data.crashCount} 
            color="bg-emerald-500" 
            percent={data.crashCount > 0 ? (data.crashCount / (data.minesCount + data.crashCount) * 100) : 0} 
          />
        </div>
      </div>
    </div>
  );
}

function GameStatRow({ icon, name, count, color, percent }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-white/5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-black/20 rounded-lg">{icon}</div>
        <div>
          <p className="text-[10px] font-black">{name}</p>
          <p className="text-[8px] text-slate-500 font-bold">{count} Parties jouées</p>
        </div>
      </div>
      <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}


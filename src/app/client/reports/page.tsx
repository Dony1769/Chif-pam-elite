"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, TrendingUp, TrendingDown, 
  Target, Sprout, Ticket, ChevronLeft,
  Calendar, Award, PieChart
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClientReports() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalWon: 0,
    totalLost: 0,
    gamesPlayed: 0,
    bestMultiplier: 0,
    favoriteGame: "---"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupération des transactions de type Jeu
      const { data: trans } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['GAME_BET', 'GAME_WON']);

      if (trans) {
        const won = trans.filter(t => t.type === 'GAME_WON').reduce((acc, t) => acc + t.amount, 0);
        const lost = trans.filter(t => t.type === 'GAME_BET').reduce((acc, t) => acc + t.amount, 0);
        
        setStats({
          totalWon: won,
          totalLost: lost,
          gamesPlayed: trans.filter(t => t.type === 'GAME_BET').length,
          bestMultiplier: 0, // À calculer depuis les tables de jeux spécifiques si besoin
          favoriteGame: "Mines Elite"
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const netProfit = stats.totalWon - stats.totalLost;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans italic uppercase pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/5">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black tracking-tighter">Rapport d'activité</h1>
      </div>

      <div className="space-y-6">
        
        {/* Résumé Global */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden">
          <p className="text-[10px] text-slate-500 tracking-widest mb-1">Performance Nette</p>
          <h2 className={`text-4xl font-black ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {netProfit.toLocaleString()} <span className="text-xs">HTG</span>
          </h2>
          <PieChart className="absolute -right-4 -bottom-4 opacity-5 text-white" size={120} />
        </div>

        {/* Statistiques en Grille */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
            <TrendingUp className="text-emerald-500 mb-2" size={20} />
            <p className="text-[8px] text-slate-500">Total Récolté</p>
            <p className="font-black text-sm">{stats.totalWon.toLocaleString()} HTG</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
            <TrendingDown className="text-rose-500 mb-2" size={20} />
            <p className="text-[8px] text-slate-500">Mises Totales</p>
            <p className="font-black text-sm">{stats.totalLost.toLocaleString()} HTG</p>
          </div>
        </div>

        {/* Analyse par Jeu */}
        <div className="space-y-3">
          <h3 className="text-[10px] text-slate-500 px-2 tracking-widest">Répartition par Jeu</h3>
          
          <div className="space-y-2">
            <GameStatRow 
              icon={<Target size={16} className="text-rose-500" />} 
              name="Mines Elite" 
              count={stats.gamesPlayed} 
              color="bg-rose-500" 
              percent={65} 
            />
            <GameStatRow 
              icon={<Sprout size={16} className="text-emerald-500" />} 
              name="Croissance" 
              count={12} 
              color="bg-emerald-500" 
              percent={35} 
            />
          </div>
        </div>

        {/* Badge de Fidélité */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-blue-500/20 p-6 rounded-[2rem] border border-emerald-500/20 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40">
            <Award className="text-slate-950" size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black italic">Statut Investisseur</p>
            <p className="text-[8px] text-slate-400">Vous avez une gestion de risque de niveau Pro.</p>
          </div>
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
        <div>
          <p className="text-[10px] font-black">{name}</p>
          <p className="text-[8px] text-slate-500">{count} Parties jouées</p>
        </div>
      </div>
      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

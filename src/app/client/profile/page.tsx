"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  User, LogOut, TrendingUp, 
  Camera, Loader2, ChevronRight, Activity
} from 'lucide-react';
import { 
  AreaChart, Area, Tooltip, ResponsiveContainer, XAxis 
} from 'recharts';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ deposits: 0, withdrawals: 0 });

  useEffect(() => {
    fetchCompleteData();
  }, []);

  const fetchCompleteData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Récupération du profil avec le username
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // 2. Récupération des transactions approuvées pour la courbe réelle
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, created_at, status')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });

    if (prof) {
      setProfile(prof);
      if (transactions) {
        processTransactions(transactions);
      }
    }
    setLoading(false);
  };

  const processTransactions = (trans: any[]) => {
    const dailyData: { [key: string]: number } = {};
    let totalDep = 0;
    let totalWith = 0;

    trans.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString('fr-FR', { weekday: 'short' });
      if (t.type === 'deposit') {
        totalDep += t.amount;
        dailyData[date] = (dailyData[date] || 0) + t.amount;
      } else if (t.type === 'withdrawal') {
        totalWith += t.amount;
        dailyData[date] = (dailyData[date] || 0) - t.amount;
      }
    });

    const formattedData = Object.keys(dailyData).map(key => ({
      name: key,
      gain: dailyData[key]
    }));

    setChartData(formattedData);
    setTotals({ deposits: totalDep, withdrawals: totalWith });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-black italic uppercase tracking-tighter">
      <div className="max-w-md mx-auto space-y-8">
        
        {/* HEADER PROFIL DYNAMIQUE */}
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="relative">
            <div className="w-28 h-28 bg-gradient-to-tr from-emerald-500 to-slate-900 rounded-full flex items-center justify-center border-4 border-white/5 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
              <User size={54} className="text-slate-950" />
            </div>
            <div className="absolute bottom-1 right-1 bg-emerald-500 text-slate-950 p-2 rounded-full border-4 border-[#020617]">
              <Camera size={16} />
            </div>
          </div>
          <div className="text-center">
            {/* Affichage du Username de la table profiles */}
            <h1 className="text-3xl tracking-tighter text-white">
              @{profile?.username || 'Joueur'}
            </h1>
            <p className="text-[10px] text-emerald-500/50 not-italic lowercase tracking-[0.4em] mt-1">
              Membre depuis {new Date(profile?.created_at).getFullYear()}
            </p>
          </div>
        </div>

        {/* ANALYTICS REEL - FLUX FINANCIER */}
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 p-6 overflow-hidden backdrop-blur-sm">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <Activity className="text-emerald-500" size={18} />
              <span className="text-xs tracking-widest">Activité du compte</span>
            </div>
            <div className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
               <span className="text-[9px] text-emerald-500">Live Sync</span>
            </div>
          </div>
          
          <div className="h-44 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px', fontSize: '10px', fontFamily: 'inherit' }}
                  cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                <Area type="monotone" dataKey="gain" stroke="#10b981" fillOpacity={1} fill="url(#colorReal)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-8 border-t border-white/5 mt-6">
            <div className="space-y-1">
              <p className="text-[8px] text-slate-500 tracking-[0.3em]">Total Entrant</p>
              <p className="text-xl text-emerald-500">{totals.deposits.toLocaleString()} HTG</p>
            </div>
            <div className="border-l border-white/5 pl-6 space-y-1">
              <p className="text-[8px] text-slate-500 tracking-[0.3em]">Total Sortant</p>
              <p className="text-xl text-white">{totals.withdrawals.toLocaleString()} HTG</p>
            </div>
          </div>
        </div>

        {/* SECTION INFO STATIQUE - PROFESSIONNEL */}
        <div className="bg-slate-900/20 rounded-[2rem] border border-white/5 p-6 flex items-center justify-between">
          <div>
            <p className="text-[8px] text-slate-500 tracking-widest mb-1">Identité enregistrée</p>
            <p className="text-sm tracking-tight">{profile?.full_name || 'Non renseigné'}</p>
          </div>
          <TrendingUp className="text-slate-800" size={24} />
        </div>

        {/* LOGOUT PROFESSIONNEL */}
        <button 
          onClick={() => supabase.auth.signOut()}
          className="w-full p-6 bg-rose-500/5 border border-rose-500/10 rounded-[2rem] flex justify-between items-center group active:scale-95 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 rounded-2xl group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <LogOut size={20} className="text-rose-500 group-hover:text-white" />
            </div>
            <span className="text-xs text-rose-500 tracking-[0.2em]">Sécuriser & Déconnecter</span>
          </div>
          <ChevronRight size={18} className="text-rose-900 group-hover:translate-x-1 transition-transform" />
        </button>

      </div>
    </main>
  );
}

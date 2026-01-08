"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  User, ShieldCheck, LogOut, TrendingUp, 
  Settings, Camera, Loader2, ChevronRight, Wallet
} from 'lucide-react';
import { 
  AreaChart, Area, Tooltip, ResponsiveContainer, XAxis 
} from 'recharts';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [totals, setTotals] = useState({ deposits: 0, withdrawals: 0 });

  // Form states
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    fetchCompleteData();
  }, []);

  const fetchCompleteData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Récupérer le profil
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // 2. Récupérer TOUTES les transactions approuvées pour le graphe
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, created_at, status')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });

    if (prof) {
      setProfile(prof);
      setFullName(prof.full_name || "");
      
      if (transactions) {
        processTransactions(transactions);
      }
    }
    setLoading(false);
  };

  // Logique pour transformer les transactions en points de courbe
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

    // Formater pour Recharts
    const formattedData = Object.keys(dailyData).map(key => ({
      name: key,
      gain: dailyData[key]
    }));

    setChartData(formattedData);
    setTotals({ deposits: totalDep, withdrawals: totalWith });
  };

  const handleUpdateProfile = async () => {
    setUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id);

    if (error) alert("Erreur lors de la mise à jour");
    else alert("Profil mis à jour avec succès !");
    setUpdating(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-black italic uppercase tracking-tighter">
      <div className="max-w-md mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-emerald-900 rounded-full flex items-center justify-center border-4 border-white/5 shadow-2xl">
              <User size={48} className="text-slate-950" />
            </div>
            <div className="absolute bottom-0 right-0 bg-emerald-500 text-slate-950 p-2 rounded-full border-2 border-[#020617]">
              <Camera size={14} />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl tracking-tighter">{profile?.full_name || 'Utilisateur'}</h1>
            <p className="text-[10px] text-slate-500 not-italic lowercase tracking-[0.3em]">Membre depuis {new Date(profile?.created_at).getFullYear()}</p>
          </div>
        </div>

        {/* ANALYTICS REEL */}
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={18} />
              <span className="text-xs">Flux de Trésorerie</span>
            </div>
            <div className="bg-emerald-500/10 px-3 py-1 rounded-full">
               <span className="text-[9px] text-emerald-500">Live Data</span>
            </div>
          </div>
          
          <div className="h-40 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="gain" stroke="#10b981" fillOpacity={1} fill="url(#colorReal)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5 mt-4">
            <div>
              <p className="text-[8px] text-slate-500 tracking-widest mb-1">Total Dépôts</p>
              <p className="text-lg text-emerald-500">{totals.deposits.toLocaleString()} HTG</p>
            </div>
            <div className="border-l border-white/5 pl-4">
              <p className="text-[8px] text-slate-500 tracking-widest mb-1">Total Retraits</p>
              <p className="text-lg text-white">{totals.withdrawals.toLocaleString()} HTG</p>
            </div>
          </div>
        </div>

        {/* SETTINGS */}
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 p-8 space-y-6">
          <div className="flex items-center gap-2 text-slate-400">
            <Settings size={16} />
            <h2 className="text-xs tracking-widest">Informations Personnelles</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 ml-2">Nom complet sur le compte</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all text-xs"
              />
            </div>

            <button 
              onClick={handleUpdateProfile}
              disabled={updating}
              className="w-full py-4 bg-emerald-500 text-black rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/10"
            >
              {updating ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
              Mettre à jour le profil
            </button>
          </div>
        </div>

        {/* DÉCONNEXION */}
        <button 
          onClick={() => supabase.auth.signOut()}
          className="w-full p-6 bg-rose-500/5 border border-rose-500/10 rounded-[2rem] flex justify-between items-center group active:scale-95 transition-all"
        >
          <div className="flex items-center gap-4">
            <LogOut size={20} className="text-rose-500" />
            <span className="text-xs text-rose-500 tracking-widest">Fermer la session</span>
          </div>
          <ChevronRight size={18} className="text-rose-900" />
        </button>

      </div>
    </main>
  );
}

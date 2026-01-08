"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  User, LogOut, TrendingUp, 
  Camera, Loader2, ChevronRight, Activity, CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis, ReferenceLine 
} from 'recharts';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ deposits: 0, withdrawals: 0, netBalance: 0 });

  useEffect(() => {
    fetchCompleteData();
  }, []);

  const fetchCompleteData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Récupérer le profil (avec locked_balance)
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // 2. Récupérer les transactions financières approuvées
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, created_at, status')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    // 3. Récupérer les mises (pour calculer pertes et gains)
    const { data: mises } = await supabase
      .from('mises')
      .select('montant, status, created_at')
      .eq('user_id', user.id);

    if (prof) {
      setProfile(prof);
      // Fusionner les données pour la courbe de performance
      processPerformanceData(transactions || [], mises || []);
    }
    setLoading(false);
  };

  const processPerformanceData = (trans: any[], mises: any[]) => {
    const dailyData: { [key: string]: number } = {};
    let totalDep = 0;
    let totalWith = 0;
    let netRunningBalance = 0;

    // Traitement des Transactions (Dépôts / Retraits)
    trans.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString('fr-FR', { weekday: 'short' });
      const val = t.type === 'deposit' ? t.amount : -t.amount;
      
      if (t.type === 'deposit') totalDep += t.amount;
      if (t.type === 'withdrawal') totalWith += t.amount;
      
      dailyData[date] = (dailyData[date] || 0) + val;
      netRunningBalance += val;
    });

    // Traitement des Mises (Investissement / Gains)
    mises.forEach(m => {
      const date = new Date(m.created_at).toLocaleDateString('fr-FR', { weekday: 'short' });
      
      // Une mise est toujours une sortie d'argent au départ
      let impactMise = -m.montant; 
      
      // Si la mise est gagnée, on ajoute le gain (on suppose ici un gain proportionnel, 
      // ajuste selon ta logique de calcul de gain si nécessaire)
      // Note: Si ton système crée une transaction de type 'gain', ne pas le doubler ici.
      if (m.status === 'gagné') {
         // Exemple: gain de 50x pour un chiffre. À ajuster selon tes règles.
         impactMise += (m.montant * 50); 
      }

      dailyData[date] = (dailyData[date] || 0) + impactMise;
      netRunningBalance += impactMise;
    });

    const formattedData = Object.keys(dailyData).map(key => ({
      name: key,
      gain: dailyData[key]
    }));

    setChartData(formattedData);
    setStats({ 
      deposits: totalDep, 
      withdrawals: totalWith, 
      netBalance: netRunningBalance 
    });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.replace('/connexion');
    } catch (error) {
      console.error("Erreur déconnexion:", error);
      window.location.href = '/connexion';
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 pb-32">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* HEADER PROFIL */}
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative">
            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border-2 border-emerald-500/20 shadow-xl">
              <User size={40} className="text-emerald-500" />
            </div>
            <div className="absolute bottom-0 right-0 bg-emerald-500 p-2 rounded-full border-4 border-[#020617]">
              <Camera size={14} className="text-slate-950" />
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">@{profile?.username}</h1>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div className="flex flex-col gap-1 mt-1">
               <span className="text-[10px] uppercase tracking-widest text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-white/5">
                Compte Premium
              </span>
              {profile?.locked_balance > 0 && (
                <span className="text-[9px] text-amber-500 font-bold uppercase italic">
                  Bloqué: {profile?.locked_balance.toLocaleString()} HTG
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI PRINCIPAL - PERFORMANCE RÉELLE */}
        <div className="bg-linear-to-b from-slate-900 to-slate-950 rounded-[2.5rem] border border-white/5 p-6 shadow-2xl">
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Croissance Portefeuille</p>
            <div className="flex items-baseline gap-2">
              <h2 className={`text-4xl font-black ${stats.netBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stats.netBalance.toLocaleString()} HTG
              </h2>
              <span className="text-xs text-slate-500 italic">
                {stats.netBalance >= 0 ? '▲ Profit' : '▼ Perte'}
              </span>
            </div>
          </div>
          
          <div className="h-48 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorGain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={stats.netBalance >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={stats.netBalance >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950 border border-white/10 p-3 rounded-2xl shadow-xl">
                          <p className="text-[10px] text-slate-500 uppercase mb-1">{payload[0].payload.name}</p>
                          <p className={`font-bold ${Number(payload[0].value) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {Number(payload[0].value).toLocaleString()} HTG
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                <Area 
                  animationDuration={1500}
                  type="monotone" 
                  dataKey="gain" 
                  stroke={stats.netBalance >= 0 ? "#10b981" : "#f43f5e"} 
                  fillOpacity={1} 
                  fill="url(#colorGain)" 
                  strokeWidth={3} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5 mt-4">
            <div>
              <p className="text-[9px] uppercase text-slate-500 tracking-tighter mb-1">Total Entrées</p>
              <p className="text-lg font-bold">+{stats.deposits.toLocaleString()}</p>
            </div>
            <div className="border-l border-white/10 pl-4">
              <p className="text-[9px] uppercase text-slate-500 tracking-tighter mb-1">Total Sorties</p>
              <p className="text-lg font-bold">-{stats.withdrawals.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* BOUTON DÉCONNEXION */}
        <button 
          onClick={handleLogout}
          className="w-full p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex justify-between items-center group hover:bg-rose-500/20 transition-all"
        >
          <div className="flex items-center gap-4">
            <LogOut size={20} className="text-rose-500" />
            <span className="text-sm font-semibold text-rose-500">Déconnexion sécurisée</span>
          </div>
          <ChevronRight size={18} className="text-rose-500/50 group-hover:translate-x-1 transition-transform" />
        </button>

      </div>
    </main>
  );
}
"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Users, Wallet, ArrowUpCircle, 
  ArrowDownCircle, Loader2, RefreshCw 
} from 'lucide-react';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalBalance: 0,
    pendingDepots: 0,
    pendingRetraits: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    setLoading(true);
    
    // 1. Récupérer les profils pour le solde total et nombre d'utilisateurs
    const { data: profiles } = await supabase.from('profiles').select('balance');
    const totalUsers = profiles?.length || 0;
    const totalBalance = profiles?.reduce((acc, curr) => acc + curr.balance, 0) || 0;

    // 2. Compter les transactions en attente
    const { data: trans } = await supabase.from('transactions').select('type, status, amount, created_at');
    const pendingDepots = trans?.filter(t => t.status === 'en_attente' && t.type === 'depot').length || 0;
    const pendingRetraits = trans?.filter(t => t.status === 'en_attente' && t.type === 'retrait').length || 0;

    setStats({ totalUsers, totalBalance, pendingDepots, pendingRetraits });

    // 3. Formater les données pour Recharts (7 derniers jours)
    if (trans) {
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const formattedData = last7Days.map(date => {
        const dayTrans = trans.filter(t => t.created_at.startsWith(date) && t.status === 'approuve');
        return {
          name: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
          depots: dayTrans.filter(t => t.type === 'depot').reduce((acc, curr) => acc + curr.amount, 0),
          retraits: dayTrans.filter(t => t.type === 'retrait').reduce((acc, curr) => acc + curr.amount, 0),
        };
      });
      setChartData(formattedData);
    }

    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-emerald-500 gap-4">
      <Loader2 className="animate-spin" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Calcul des profits...</p>
    </div>
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Finance <span className="text-emerald-500 text-sm">Elite</span></h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Analyse en temps réel</p>
        </div>
        <button onClick={fetchGlobalStats} className="p-3 bg-slate-900 rounded-2xl border border-white/5 hover:bg-emerald-500 hover:text-slate-950 transition-all">
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Cartes de Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Solde Total Clients" value={`${stats.totalBalance.toLocaleString()} HTG`} icon={<Wallet className="text-emerald-500" />} />
        <StatCard title="Utilisateurs Actifs" value={stats.totalUsers} icon={<Users className="text-blue-500" />} />
        <StatCard title="Dépôts en Attente" value={stats.pendingDepots} icon={<ArrowUpCircle className="text-amber-500" />} color="text-amber-500" />
        <StatCard title="Retraits en Attente" value={stats.pendingRetraits} icon={<ArrowDownCircle className="text-rose-500" />} color="text-rose-500" />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 p-8 rounded-[3rem] border border-white/5 shadow-2xl">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 text-slate-400">Flux de Trésorerie (7j)</h3>
          <div className="h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '15px' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="depots" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorDep)" />
                <Area type="monotone" dataKey="retraits" stroke="#f43f5e" strokeWidth={3} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/40 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col justify-center text-center">
          <TrendingUp className="mx-auto text-emerald-500 mb-4" size={48} />
          <h3 className="text-2xl font-black italic uppercase">Performance</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 px-10">
            Votre marge bénéficiaire actuelle est optimisée par le système de "Rideau de Fumée".
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="p-6 bg-slate-950 rounded-4xl border border-white/5">
                <p className="text-[10px] font-black uppercase text-emerald-500">Volume Dépôts</p>
                <p className="text-lg font-black italic mt-1">{chartData.reduce((a,b) => a+b.depots, 0).toLocaleString()} HTG</p>
            </div>
            <div className="p-6 bg-slate-950 rounded-4xl border border-white/5">
                <p className="text-[10px] font-black uppercase text-rose-500">Volume Retraits</p>
                <p className="text-lg font-black italic mt-1">{chartData.reduce((a,b) => a+b.retraits, 0).toLocaleString()} HTG</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color = "text-white" }: any) {
  return (
    <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 flex items-center gap-5">
      <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 shadow-inner">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">{title}</p>
        <p className={`text-xl font-black italic ${color}`}>{value}</p>
      </div>
    </div>
  );
}
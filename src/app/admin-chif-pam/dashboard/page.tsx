"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Users, Wallet, ArrowUpCircle, 
  ArrowDownCircle, Loader2, RefreshCw, LayoutDashboard,
  Dices, MessageSquare, LogOut, ShieldCheck, ClipboardList
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [stats, setStats] = useState<any>({
    totalUsers: 0, 
    totalBalance: 0, 
    pendingDepots: 0, 
    pendingRetraits: 0,
    totalRevenue: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    setLoading(true);
    try {
      // 1. Récupération des profils pour le solde total
      const { data: profiles } = await supabase.from('profiles').select('balance');
      const totalUsers = profiles?.length || 0;
      const totalBalance = profiles?.reduce((acc, curr) => acc + (curr.balance || 0), 0) || 0;

      // 2. Récupération des transactions pour les stats et le graphique
      const { data: trans } = await supabase
        .from('transactions')
        .select('type, status, amount, created_at')
        .order('created_at', { ascending: true });

      const pendingDepots = trans?.filter(t => t.type === 'depot' && t.status === 'en_attente').length || 0;
      const pendingRetraits = trans?.filter(t => t.type === 'retrait' && t.status === 'en_attente').length || 0;
      
      // Calcul du revenu (ex: total des mises - total des gains)
      const totalRevenue = trans?.filter(t => t.status === 'valide' || t.status === 'approuve')
        .reduce((acc, t) => t.type === 'mise' ? acc + t.amount : t.type === 'gain' ? acc - t.amount : acc, 0) || 0;

      setStats({ totalUsers, totalBalance, pendingDepots, pendingRetraits, totalRevenue });

      // 3. Préparation des données du graphique (7 derniers jours)
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const formattedData = last7Days.map(date => {
        const dayTrans = trans?.filter(t => t.created_at.startsWith(date)) || [];
        return {
          name: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
          mises: dayTrans.filter(t => t.type === 'mise').reduce((acc, t) => acc + t.amount, 0),
          gains: dayTrans.filter(t => t.type === 'gain').reduce((acc, t) => acc + t.amount, 0),
        };
      });

      setChartData(formattedData);
    } catch (error) {
      console.error("Erreur stats:", error);
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
    <div className="min-h-screen bg-[#020617] text-white font-sans flex">
      {/* SIDEBAR GAUCHE */}
      <aside className="w-72 border-r border-white/5 bg-slate-950/50 backdrop-blur-xl p-8 flex flex-col hidden lg:flex">
        <div className="flex items-center gap-3 mb-12 px-2">
          <ShieldCheck className="text-emerald-500" size={28} />
          <h1 className="text-xl font-black italic uppercase tracking-tighter">Chif<span className="text-emerald-500">Pam</span></h1>
        </div>

        <nav className="space-y-2 flex-1">
          <NavLink href="/admin-chif-pam/dashboard" icon={<LayoutDashboard size={20}/>} label="Dashboard" active={pathname === '/admin-chif-pam/dashboard'} />
          <NavLink href="/admin-chif-pam/demandes" icon={<ClipboardList size={20}/>} label="Demandes" active={pathname === '/admin-chif-pam/demandes'} />
          <NavLink href="/admin-chif-pam/loterie" icon={<Dices size={20}/>} label="Loterie" active={pathname === '/admin-chif-pam/loterie'} />
          <NavLink href="/admin-chif-pam/users" icon={<Users size={20}/>} label="Utilisateurs" active={pathname === '/admin-chif-pam/users'} />
          <NavLink href="/admin-chif-pam/chat" icon={<MessageSquare size={20}/>} label="Support" active={pathname === '/admin-chif-pam/chat'} />
        </nav>

        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-4 px-6 py-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:text-rose-500 transition-all">
          <LogOut size={20} /> Déconnexion
        </button>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* HEADER AVEC BOUTON RAFRAICHIR */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Vue d'ensemble</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Statistiques financières en temps réel</p>
            </div>
            <button onClick={fetchGlobalStats} className="p-4 bg-slate-900 rounded-2xl border border-white/5 hover:bg-emerald-500 hover:text-black transition-all">
              <RefreshCw size={20} />
            </button>
          </div>

          {/* GRILLE DE STATS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Utilisateurs" value={stats.totalUsers} icon={<Users />} color="blue" />
            <StatCard title="Trésorerie Clients" value={`${stats.totalBalance.toLocaleString()} HTG`} icon={<Wallet />} color="emerald" />
            <StatCard title="Dépôts en attente" value={stats.pendingDepots} icon={<ArrowUpCircle />} color="amber" />
            <StatCard title="Retraits en attente" value={stats.pendingRetraits} icon={<ArrowDownCircle />} color="rose" />
          </div>

          {/* GRAPHIQUE ET ACTIONS */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem]">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Flux des 7 derniers jours</h3>
                  <div className="flex gap-4 text-[9px] font-black uppercase">
                    <span className="flex items-center gap-2 text-emerald-500"><div className="w-2 h-2 bg-emerald-500 rounded-full"/> Mises</span>
                    <span className="flex items-center gap-2 text-rose-500"><div className="w-2 h-2 bg-rose-500 rounded-full"/> Gains</span>
                  </div>
               </div>
               <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorMises" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                      <YAxis hide />
                      <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold'}} />
                      <Area type="monotone" dataKey="mises" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMises)" />
                      <Area type="monotone" dataKey="gains" stroke="#f43f5e" strokeWidth={3} fill="transparent" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* ACCÈS RAPIDES (INCLUANT LES DEMANDES) */}
            <div className="space-y-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 px-4">Actions Prioritaires</h3>
               
               <Link href="/admin-chif-pam/demandes" className="flex items-center justify-between p-6 bg-emerald-500 rounded-[2rem] text-slate-950 hover:scale-[1.02] transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black/10 rounded-xl"><ClipboardList size={24}/></div>
                    <span className="font-black uppercase text-[11px] tracking-widest">Valider Demandes</span>
                  </div>
                  <div className="bg-black/10 px-3 py-1 rounded-full text-[10px] font-black">{stats.pendingDepots + stats.pendingRetraits}</div>
               </Link>

               <Link href="/admin-chif-pam/loterie" className="flex items-center justify-between p-6 bg-slate-900 border border-white/5 rounded-[2rem] hover:border-emerald-500/30 transition-all group">
                  <div className="flex items-center gap-4 text-slate-300">
                    <div className="p-3 bg-slate-950 rounded-xl text-emerald-500"><Dices size={24}/></div>
                    <span className="font-black uppercase text-[11px] tracking-widest text-white">Gérer Tirages</span>
                  </div>
                  <TrendingUp size={20} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
               </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, icon, label, active }: any) {
  return (
    <Link href={href} className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest ${active ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
      {icon}
      {label}
    </Link>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const colors: any = {
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border ${colors[color]} relative overflow-hidden group`}>
      <div className="relative z-10">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">{title}</p>
        <p className="text-2xl font-black italic">{value}</p>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
        {React.cloneElement(icon, { size: 80 })}
      </div>
    </div>
  );
}

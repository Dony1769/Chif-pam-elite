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
  Dices, MessageSquare, LogOut, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [stats, setStats] = useState<any>({
    totalUsers: 0, totalBalance: 0, pendingDepots: 0, pendingRetraits: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('balance');
    const totalUsers = profiles?.length || 0;
    const totalBalance = profiles?.reduce((acc, curr) => acc + curr.balance, 0) || 0;

    const { data: trans } = await supabase.from('transactions').select('type, status, amount, created_at');
    const pendingDepots = trans?.filter(t => t.status === 'en_attente' && t.type === 'depot').length || 0;
    const pendingRetraits = trans?.filter(t => t.status === 'en_attente' && t.type === 'retrait').length || 0;

    setStats({ totalUsers, totalBalance, pendingDepots, pendingRetraits });

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/connexion');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-emerald-500 gap-4 font-sans">
      <Loader2 className="animate-spin" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Accès Sécurisé en cours...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex font-sans">
      
      {/* BARRE DE NAVIGATION LATERALE (SIDEBAR) */}
      <aside className="w-72 border-r border-white/5 bg-slate-950/50 backdrop-blur-xl p-8 flex flex-col lg:flex">
        <div className="mb-12">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">
            Elite <span className="text-emerald-500">PAM</span>
          </h2>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Admin Central</p>
        </div>

        <nav className="flex-1 space-y-2">
          <NavLink href="/admin-chif-pam/dashboard" icon={<LayoutDashboard size={20}/>} label="Finance" active={pathname.includes('dashboard')} />
          <NavLink href="/admin-chif-pam/users" icon={<Users size={20}/>} label="Utilisateurs" active={pathname.includes('users')} />
          <NavLink href="/admin-chif-pam/loterie" icon={<Dices size={20}/>} label="Loterie / Fumée" active={pathname.includes('loterie')} />
          <NavLink href="/admin-chif-pam/chat" icon={<MessageSquare size={20}/>} label="Support Chat" active={pathname.includes('chat')} />
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-4 text-slate-500 hover:text-rose-500 transition-colors font-black uppercase text-[10px] tracking-widest"
        >
          <LogOut size={20} /> Déconnexion
        </button>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-12">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">Tableau <span className="text-emerald-500">Financier</span></h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Vue d'ensemble du système</p>
          </div>
          <div className="flex gap-4">
            <button onClick={fetchGlobalStats} className="p-4 bg-slate-900 rounded-2xl border border-white/5 hover:border-emerald-500/50 transition-all text-emerald-500">
              <RefreshCw size={20} />
            </button>
          </div>
        </header>

        {/* CARTES DE STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard title="Trésorerie Clients" value={`${stats.totalBalance.toLocaleString()} HTG`} icon={<Wallet />} color="emerald" />
          <StatCard title="Membres Elite" value={stats.totalUsers} icon={<Users />} color="blue" />
          <StatCard title="Dépôts à Valider" value={stats.pendingDepots} icon={<ArrowUpCircle />} color="amber" />
          <StatCard title="Retraits à Valider" value={stats.pendingRetraits} icon={<ArrowDownCircle />} color="rose" />
        </div>

        {/* GRAPHIQUES ET PERFORMANCE */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-slate-900/30 p-10 rounded-[3.5rem] border border-white/5">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Flux de Trésorerie (7j)</h3>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-emerald-500"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Dépôts</div>
                   <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-rose-500"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Retraits</div>
                </div>
             </div>
             <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.2} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="black" axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '20px', padding: '15px' }}
                      itemStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }}
                    />
                    <Area type="monotone" dataKey="depots" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorDep)" />
                    <Area type="monotone" dataKey="retraits" stroke="#f43f5e" strokeWidth={4} fill="none" strokeDasharray="10 10" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-emerald-500 p-10 rounded-[3.5rem] text-slate-950 flex flex-col justify-between relative overflow-hidden group">
            <ShieldCheck className="absolute -right-4 -top-4 w-32 h-32 opacity-10 group-hover:rotate-12 transition-transform" />
            <div>
              <TrendingUp size={40} className="mb-6" />
              <h3 className="text-3xl font-black uppercase italic leading-none">Système<br/>Optimisé</h3>
              <p className="text-slate-900/60 text-[10px] font-bold uppercase tracking-widest mt-4">
                Le "Rideau de Fumée" est actif. Vos profits sont sécurisés.
              </p>
            </div>
            <div className="mt-8 space-y-4">
               <div className="p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
                  <p className="text-[9px] font-black uppercase opacity-60">Total Entrées</p>
                  <p className="text-2xl font-black italic">{chartData.reduce((a,b) => a+b.depots, 0).toLocaleString()} HTG</p>
               </div>
               <Link href="/admin-chif-pam/loterie" className="flex items-center justify-center w-full bg-slate-950 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 transition-all">
                  Gérer les tirages
               </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// COMPOSANTS LOCAUX POUR UNE STRUCTURE PRO
function NavLink({ href, icon, label, active }: any) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest ${
        active 
        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
        : 'text-slate-500 hover:bg-white/5 hover:text-white'
      }`}
    >
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
    <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/5 shadow-xl hover:-translate-y-1.25 transition-transform">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 border ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">{title}</p>
      <p className="text-2xl font-black italic tracking-tighter">{value}</p>
    </div>
  );
}
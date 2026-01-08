"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  XAxis, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Users, Wallet, ArrowUpCircle, 
  ArrowDownCircle, Loader2, RefreshCw, LayoutDashboard,
  Dices, MessageSquare, LogOut, ShieldCheck, ClipboardList,
  ChevronRight, Activity
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [stats, setStats] = useState({
    totalUsers: 0, 
    totalBalance: 0, 
    pendingDepots: 0, 
    pendingRetraits: 0,
    unreadMessages: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    setLoading(true);
    try {
      // 1. Profils & Solde global
      const { data: profiles } = await supabase.from('profiles').select('balance');
      const totalUsers = profiles?.length || 0;
      const totalBalance = profiles?.reduce((acc, curr) => acc + (curr.balance || 0), 0) || 0;

      // 2. Transactions en attente (Correction des filtres type/status)
      const { data: pendingT } = await supabase
        .from('transactions')
        .select('type')
        .eq('status', 'pending');
      
      const pendingDepots = pendingT?.filter(t => t.type === 'deposit').length || 0;
      const pendingRetraits = pendingT?.filter(t => t.type === 'withdrawal').length || 0;

      // 3. Support (Messages non lus) - RÉINTÉGRÉ
      const { count: unread } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      setStats({
        totalUsers,
        totalBalance,
        pendingDepots,
        pendingRetraits,
        unreadMessages: unread || 0
      });

      // 4. LOGIQUE RECHARTS : FLUX DE REVENU ADMIN (Mises Perdues vs Gagnées)
      const { data: flux } = await supabase
        .from('mises')
        .select('amount, status, created_at')
        .order('created_at', { ascending: true });

      if (flux) {
        const dailyStats: { [key: string]: number } = {};
        flux.forEach(item => {
          const day = new Date(item.created_at).toLocaleDateString('fr-FR', { weekday: 'short' });
          const profitAdmin = item.status === 'perdu' ? item.amount : -item.amount;
          dailyStats[day] = (dailyStats[day] || 0) + profitAdmin;
        });

        const formattedChart = Object.keys(dailyStats).map(day => ({
          name: day,
          revenue: dailyStats[day]
        }));
        setChartData(formattedChart);
      }

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
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase tracking-tighter">
      <div className="flex">
        
        {/* SIDEBAR COMPLÈTE (RÉPARÉE) */}
        <aside className="w-72 bg-slate-950 min-h-screen border-r border-white/5 p-8 hidden lg:block">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <ShieldCheck size={24} />
            </div>
            <span className="text-xl tracking-widest">ADMIN CP</span>
          </div>
          <nav className="space-y-2">
            <SidebarLink href="/admin-chif-pam" icon={<LayoutDashboard size={20}/>} label="Dashboard" active={pathname === '/admin-chif-pam'} />
            <SidebarLink href="/admin-chif-pam/loterie" icon={<Dices size={20}/>} label="Gestion Loterie" active={pathname.includes('loterie')} />
            <SidebarLink href="/admin-chif-pam/demandes" icon={<Wallet size={20}/>} label="Finances / Demandes" active={pathname.includes('transactions')} />
            <SidebarLink href="/admin-chif-pam/users" icon={<Users size={20}/>} label="Utilisateurs" active={pathname.includes('users')} />
            <SidebarLink href="/admin-chif-pam/chat" icon={<MessageSquare size={20}/>} label="Support Client" active={pathname.includes('chat')} />
          </nav>

          <button onClick={() => supabase.auth.signOut()} className="mt-12 flex items-center gap-4 text-slate-600 hover:text-rose-500 transition-colors px-4">
            <LogOut size={20} /> <span className="text-[10px] tracking-widest">Déconnexion</span>
          </button>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 lg:p-12 space-y-10 overflow-y-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl">Administration</h1>
              <p className="text-emerald-500 text-[10px] tracking-[0.5em] mt-2 italic font-medium lowercase">Contrôle de rentabilité & Support</p>
            </div>
            <button onClick={fetchGlobalStats} className="p-4 bg-slate-900 rounded-2xl hover:bg-emerald-500 hover:text-slate-950 transition-all border border-white/5">
              <RefreshCw size={20} />
            </button>
          </div>

          {/* GRAPHIQUE PREMIUM */}
          <div className="bg-slate-900/50 rounded-[3rem] border border-white/5 p-8 shadow-2xl backdrop-blur-sm">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <Activity className="text-emerald-500" size={24} />
                </div>
                <div>
                  <h2 className="text-xl">Flux de Revenus Nets</h2>
                  <p className="text-[10px] text-slate-500 tracking-widest lowercase not-italic">Mises Perdues vs Gains Clients</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-3xl ${chartData.reduce((acc, curr) => acc + curr.revenue, 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {chartData.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString()} HTG
                </p>
                <p className="text-[10px] text-slate-500">Bénéfice Période</p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* STAT CARDS (AVEC COULEURS ORIGINALES) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Membres" value={stats.totalUsers} icon={<Users />} color="blue" />
            <StatCard title="Volume Global" value={`${stats.totalBalance.toLocaleString()} HTG`} icon={<Wallet />} color="emerald" />
            <StatCard title="En attente Dépôt" value={stats.pendingDepots} icon={<ArrowUpCircle />} color="amber" />
            <StatCard title="En attente Retrait" value={stats.pendingRetraits} icon={<ArrowDownCircle />} color="rose" />
          </div>

          {/* ACTIONS & SUPPORT (RÉINTÉGRÉ TOUT LE SYSTÈME MANQUANT) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
            <div className="space-y-4">
               <h3 className="text-[10px] text-slate-600 tracking-[0.3em] px-4">Opérations de Jeu</h3>
               <ActionCard 
                href="/admin-chif-pam/loterie" 
                label="Contrôle de la Loterie" 
                count="LIVE" 
                icon={<Dices size={24}/>} 
                color="bg-emerald-500" 
               />
               <ActionCard 
                href="/admin-chif-pam/users" 
                label="Gestion des Joueurs" 
                icon={<Users size={24}/>} 
                color="bg-blue-600" 
                textColor="text-white"
               />
            </div>

            <div className="space-y-4">
               <h3 className="text-[10px] text-slate-600 tracking-[0.3em] px-4">Finances & Assistance</h3>
               <ActionCard 
                href="/admin-chif-pam/transactions" 
                label="Valider les Demandes" 
                count={stats.pendingDepots + stats.pendingRetraits} 
                icon={<ClipboardList size={24}/>} 
                color="bg-white" 
               />
               <ActionCard 
                href="/admin-chif-pam/chat" 
                label="Support (Messages)" 
                count={stats.unreadMessages} 
                icon={<MessageSquare size={24}/>} 
                color="bg-slate-800" 
                textColor="text-white"
               />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// COMPOSANTS RÉPARÉS
function SidebarLink({ href, icon, label, active = false }: any) {
  return (
    <Link href={href} className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${active ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'hover:bg-white/5 text-slate-500'}`}>
      {icon}
      <span className="text-[10px] font-black tracking-widest">{label}</span>
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
    <div className={`p-8 rounded-[2.5rem] border ${colors[color]} relative overflow-hidden group transition-all`}>
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

function ActionCard({ href, label, count, icon, color, textColor = "text-slate-950" }: any) {
  return (
    <Link href={href} className={`flex items-center justify-between p-6 ${color} rounded-[2rem] hover:scale-[1.02] transition-all group shadow-xl`}>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-black/10 rounded-xl">{icon}</div>
        <div className={textColor}>
          <p className="text-[10px] font-black uppercase opacity-60 tracking-tighter">Action Directe</p>
          <p className="text-sm font-black uppercase tracking-tight">{label}</p>
        </div>
      </div>
      {count !== undefined && count !== 0 && (
        <div className={`px-4 py-2 bg-black/10 rounded-full text-xs ${textColor} font-black`}>{count}</div>
      )}
    </Link>
  );
}

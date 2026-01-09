"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  XAxis, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Users, Wallet, ArrowUpCircle, Bell,
  ArrowDownCircle, Loader2, RefreshCw, LayoutDashboard,
  Dices, MessageSquare, LogOut, ShieldCheck, ClipboardList,
  Activity, AlertCircle, ChevronRight
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
    
    // Système de Realtime pour les notifications Dashboard
    const channel = supabase
      .channel('admin-dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchGlobalStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchGlobalStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchGlobalStats = async () => {
    try {
      const { data: profiles } = await supabase.from('profiles').select('balance');
      const totalUsers = profiles?.length || 0;
      const totalBalance = profiles?.reduce((acc, curr) => acc + (curr.balance || 0), 0) || 0;

      const { data: pendingT } = await supabase
        .from('transactions')
        .select('type')
        .eq('status', 'pending');
      
      const pendingDepots = pendingT?.filter(t => t.type === 'deposit' || t.type === 'depot').length || 0;
      const pendingRetraits = pendingT?.filter(t => t.type === 'withdrawal' || t.type === 'retrait').length || 0;

      const { count: unread } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      const { data: flux, error: fluxError } = await supabase
        .from('mises')
        .select('montant, status, created_at')
        .limit(1000);

      if (!fluxError && flux) {
        const dailyStats: { [key: string]: number } = {};
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toLocaleDateString('fr-FR', { weekday: 'short' });
        }).reverse();
        
        last7Days.forEach(day => dailyStats[day] = 0);

        flux.forEach(item => {
          const day = new Date(item.created_at).toLocaleDateString('fr-FR', { weekday: 'short' });
          let impactAdmin = 0;
          if (item.status === 'perdu') {
            impactAdmin = item.montant; 
          } else if (item.status === 'gagne' || item.status === 'gagné') {
            impactAdmin = -item.montant; 
          }
          if (dailyStats[day] !== undefined) {
            dailyStats[day] += impactAdmin;
          }
        });

        const formattedChart = Object.keys(dailyStats).map(day => ({
          name: day,
          revenue: dailyStats[day]
        }));
        setChartData(formattedChart);
      }

      setStats({
        totalUsers,
        totalBalance,
        pendingDepots,
        pendingRetraits,
        unreadMessages: unread || 0
      });

    } catch (error) {
      console.error("Dashboard Sync Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  const totalPending = stats.pendingDepots + stats.pendingRetraits;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase tracking-tighter">
      <div className="flex">
        
        {/* SIDEBAR */}
        <aside className="w-72 bg-slate-950 min-h-screen border-r border-white/5 p-8 hidden lg:block sticky top-0 h-screen">
          <div className="flex items-center gap-3 mb-12">
            <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
              <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xl tracking-widest uppercase font-black">CHIF-PAM</span>
          </div>
          <nav className="space-y-2">
            <SidebarLink href="/admin-chif-pam/dashboard" icon={<LayoutDashboard size={20}/>} label="Dashboard" active={pathname.includes('dashboard')} />
            <SidebarLink href="/admin-chif-pam/loterie" icon={<Dices size={20}/>} label="Gestion Loterie" active={pathname.includes('loterie')} />
            <SidebarLink href="/admin-chif-pam/demandes" icon={<Wallet size={20}/>} label="Finances / Demandes" active={pathname.includes('demandes')} />
            <SidebarLink href="/admin-chif-pam/users" icon={<Users size={20}/>} label="Utilisateurs" active={pathname.includes('users')} />
            <SidebarLink href="/admin-chif-pam/notifications" icon={<Bell size={20}/>} label="Notifications" active={pathname.includes('notifications')} />
            <SidebarLink href="/admin-chif-pam/chat" icon={<MessageSquare size={20}/>} label="Support Client" active={pathname.includes('chat')} />
          </nav>

          <button onClick={() => supabase.auth.signOut()} className="mt-12 flex items-center gap-4 text-slate-600 hover:text-rose-500 transition-colors px-4">
            <LogOut size={20} /> <span className="text-[10px] tracking-widest lowercase not-italic">Déconnexion</span>
          </button>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 lg:p-12 space-y-8 overflow-y-auto">
          
          {/* BARRE DE NOTIFICATIONS TEMPS RÉEL */}
          {(totalPending > 0 || stats.unreadMessages > 0) && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-3xl flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-4">
                <AlertCircle className="text-emerald-500" size={20} />
                <span className="text-[10px] tracking-[0.2em]">
                  SYSTÈME : {totalPending} DEMANDES EN ATTENTE | {stats.unreadMessages} MESSAGES NON LUS
                </span>
              </div>
              <Link href="/admin-chif-pam/demandes" className="text-[10px] bg-emerald-500 text-slate-950 px-4 py-2 rounded-full flex items-center gap-2">
                TRAITER MAINTENANT <ChevronRight size={14} />
              </Link>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl uppercase">Tableau de Bord</h1>
              <p className="text-emerald-500 text-[10px] tracking-[0.5em] mt-2 italic font-medium lowercase">Rapport d'activité élite</p>
            </div>
            <button onClick={fetchGlobalStats} className="p-4 bg-slate-900 rounded-2xl hover:bg-emerald-500 hover:text-slate-950 transition-all border border-white/5 shadow-xl">
              <RefreshCw size={20} />
            </button>
          </div>

          {/* CHART AREA */}
          <div className="bg-slate-900/50 rounded-[3.5rem] border border-white/5 p-8 lg:p-12 shadow-2xl backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 shadow-inner">
                  <Activity className="text-emerald-500" size={32} />
                </div>
                <div>
                  <h2 className="text-2xl uppercase tracking-tighter">Flux de Revenus Nets</h2>
                  <p className="text-[10px] text-slate-500 tracking-widest lowercase not-italic">Analyse basée sur les pertes/gains clients</p>
                </div>
              </div>
              <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-white/5 min-w-[200px] text-right">
                <p className={`text-3xl font-black italic ${chartData.reduce((acc, curr) => acc + curr.revenue, 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {chartData.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString()} <span className="text-sm not-italic">HTG</span>
                </p>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Profit Net 7 Jours</p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '15px' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={5} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Joueurs Actifs" value={stats.totalUsers} icon={<Users />} color="blue" />
            <StatCard title="Volume Coffre" value={`${stats.totalBalance.toLocaleString()}`} icon={<Wallet />} color="emerald" />
            <StatCard title="Attente Dépôt" value={stats.pendingDepots} icon={<ArrowUpCircle />} color="amber" />
            <StatCard title="Attente Retrait" value={stats.pendingRetraits} icon={<ArrowDownCircle />} color="rose" />
          </div>

          {/* QUICK ACTIONS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
            <div className="space-y-4">
               <h3 className="text-[10px] text-slate-600 tracking-[0.4em] px-6 font-bold">MOTEUR DE JEU</h3>
               <ActionCard 
                href="/admin-chif-pam/loterie" 
                label="Gestion des Tirages" 
                count="LIVE" 
                icon={<Dices size={24}/>} 
                color="bg-emerald-500" 
               />
               <ActionCard 
                href="/admin-chif-pam/users" 
                label="Base de Données Clients" 
                icon={<Users size={24}/>} 
                color="bg-blue-600" 
                textColor="text-white"
               />
            </div>

            <div className="space-y-4">
               <h3 className="text-[10px] text-slate-600 tracking-[0.4em] px-6 font-bold">FLUX FINANCIER & SUP</h3>
               <ActionCard 
                href="/admin-chif-pam/demandes" 
                label="Validation Transactions" 
                count={totalPending} 
                icon={<ClipboardList size={24}/>} 
                color="bg-white" 
               />
               <div className="grid grid-cols-2 gap-4">
                  <ActionCard 
                    href="/admin-chif-pam/notifications" 
                    label="Alertes" 
                    icon={<Bell size={20}/>} 
                    color="bg-amber-500/10" 
                    textColor="text-amber-500"
                    border="border-amber-500/20"
                  />
                  <ActionCard 
                    href="/admin-chif-pam/chat" 
                    label="Support" 
                    count={stats.unreadMessages} 
                    icon={<MessageSquare size={20}/>} 
                    color="bg-slate-800" 
                    textColor="text-white"
                  />
               </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// COMPOSANTS UI
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
    <div className={`p-8 rounded-[2.5rem] border ${colors[color]} relative overflow-hidden group transition-all shadow-xl`}>
      <div className="relative z-10">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">{title}</p>
        <p className="text-3xl font-black italic">{value}</p>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
        {React.cloneElement(icon, { size: 90 })}
      </div>
    </div>
  );
}

function ActionCard({ href, label, count, icon, color, textColor = "text-slate-950", border="border-transparent" }: any) {
  return (
    <Link href={href} className={`flex items-center justify-between p-6 ${color} ${border} border rounded-[2rem] hover:scale-[1.02] transition-all group shadow-xl`}>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-black/10 rounded-xl">{icon}</div>
        <div className={textColor}>
          <p className="text-[10px] font-black uppercase opacity-60 tracking-tighter">Action Directe</p>
          <p className="text-sm font-black uppercase tracking-tight">{label}</p>
        </div>
      </div>
      {count !== undefined && count !== 0 && (
        <div className={`px-4 py-2 bg-black/20 rounded-full text-[10px] ${textColor} font-black border border-black/5`}>{count}</div>
      )}
    </Link>
  );
}

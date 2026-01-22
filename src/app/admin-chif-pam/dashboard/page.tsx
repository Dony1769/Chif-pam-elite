"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  XAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { 
  Users, Wallet, ArrowUpCircle, Bell,
  ArrowDownCircle, Loader2, RefreshCw, LayoutDashboard,
  Dices, MessageSquare, LogOut, Ticket, ClipboardList,
  Activity, AlertCircle, ChevronRight, Target
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
    
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchGlobalStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchGlobalStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mises' }, () => fetchGlobalStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchGlobalStats = async () => {
    try {
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { data: balanceData } = await supabase.rpc('get_total_balance'); 

      const { count: countDepots } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .in('type', ['deposit', 'depot']);

      const { count: countRetraits } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .in('type', ['withdrawal', 'retrait']);

      const { count: unread } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('is_admin', false);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: flux } = await supabase
        .from('mises')
        .select('montant, gain, status, created_at') 
        .gte('created_at', sevenDaysAgo.toISOString());

      if (flux) {
        const dailyStats: { [key: string]: number } = {};
        const last7DaysLabels = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toLocaleDateString('fr-FR', { weekday: 'short' });
        }).reverse();
        
        last7DaysLabels.forEach(day => dailyStats[day] = 0);

        flux.forEach(item => {
          const day = new Date(item.created_at).toLocaleDateString('fr-FR', { weekday: 'short' });
          let impactAdmin = 0;

          // LOGIQUE MAISON (HOUSE EDGE)
          if (item.status === 'perdu') {
            impactAdmin = item.montant; // Client perd = Admin gagne
          } else if (['gagne', 'gagné', 'win'].includes(item.status)) {
            const payout = item.gain || item.montant; 
            impactAdmin = -payout; // Client gagne = Admin perd
          }

          if (dailyStats[day] !== undefined) dailyStats[day] += impactAdmin;
        });

        setChartData(Object.keys(dailyStats).map(day => ({ name: day, revenue: dailyStats[day] })));
      }

      setStats({
        totalUsers: userCount || 0,
        totalBalance: balanceData || 0,
        pendingDepots: countDepots || 0,
        pendingRetraits: countRetraits || 0,
        unreadMessages: unread || 0
      });

    } catch (error) {
      console.error("Sync Error:", error);
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
  const totalRevenuePeriod = chartData.reduce((acc, curr) => acc + curr.revenue, 0);

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase tracking-tighter">
      <div className="flex">
        
        {/* SIDEBAR */}
        <aside className="w-72 bg-slate-950 min-h-screen border-r border-white/5 p-8 hidden lg:block sticky top-0 h-screen overflow-y-auto">
          <div className="flex items-center gap-3 mb-12">
            <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
              <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xl tracking-widest uppercase font-black">CHIF-PAM</span>
          </div>
          <nav className="space-y-2">
            <SidebarLink href="/admin-chif-pam/dashboard" icon={<LayoutDashboard size={20}/>} label="Dashboard" active={pathname.includes('dashboard')} />
            <SidebarLink href="/admin-chif-pam/challenges" icon={<Dices size={20}/>} label="Gestion Défi" active={pathname.includes('challenges')} />
            <SidebarLink href="/admin-chif-pam/coupon" icon={<Ticket size={20}/>} label="Gestion Coupons" active={pathname.includes('coupon')} />
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
        <main className="flex-1 p-6 lg:p-12 space-y-8 overflow-y-auto h-screen">
          
          {(totalPending > 0 || stats.unreadMessages > 0) && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] flex items-center justify-between animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="flex items-center gap-5">
                <div className="bg-emerald-500 p-2 rounded-lg text-slate-950">
                  <AlertCircle size={20} />
                </div>
                <span className="text-[11px] tracking-[0.2em] font-black">
                  ALERTE : {totalPending} TRANSACTIONS & {stats.unreadMessages} MESSAGES EN ATTENTE
                </span>
              </div>
              <Link href="/admin-chif-pam/demandes" className="text-[10px] bg-white text-slate-950 px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-emerald-500 transition-colors">
                OUVRIR <ChevronRight size={14} />
              </Link>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h1 className="text-4xl uppercase tracking-tighter">Control <span className="text-emerald-500">Center</span></h1>
            <button onClick={fetchGlobalStats} className="p-4 bg-slate-900 rounded-2xl border border-white/5 hover:bg-emerald-500 hover:text-slate-950 transition-all">
              <RefreshCw size={20} />
            </button>
          </div>

          {/* CHART */}
          <div className="bg-slate-900/50 rounded-[3.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-12 relative z-10">
              <div className="flex items-center gap-6">
                <div className={`p-5 ${totalRevenuePeriod >= 0 ? 'bg-emerald-500' : 'bg-rose-500'} text-slate-950 rounded-3xl`}>
                    <Activity size={32} />
                </div>
                <div>
                    <h2 className="text-2xl">Bénéfice Net (7j)</h2>
                    <p className="text-[10px] text-slate-500 not-italic">Gains Clients = Pertes Admin</p>
                </div>
              </div>
              <div className="bg-slate-950/80 p-6 rounded-[2rem] border border-emerald-500/20 text-right">
                <p className={`text-3xl font-black italic ${totalRevenuePeriod >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {totalRevenuePeriod > 0 ? '+' : ''}{totalRevenuePeriod.toLocaleString()} <span className="text-sm">HTG</span>
                </p>
              </div>
            </div>
            <div className="h-80 w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={totalRevenuePeriod >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={totalRevenuePeriod >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  {/* CORRECTION DU TYPE ICI POUR LE BUILD */}
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString()} HTG`, 'Bénéfice Net']}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <Area type="monotone" dataKey="revenue" stroke={totalRevenuePeriod >= 0 ? "#10b981" : "#f43f5e"} strokeWidth={4} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Joueurs" value={stats.totalUsers.toLocaleString()} icon={<Users />} color="blue" />
            <StatCard title="Trésorerie" value={stats.totalBalance.toLocaleString()} icon={<Wallet />} color="emerald" />
            <StatCard title="Dépôts Attente" value={stats.pendingDepots} icon={<ArrowUpCircle />} color="amber" />
            <StatCard title="Retraits Attente" value={stats.pendingRetraits} icon={<ArrowDownCircle />} color="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
            <div className="space-y-4">
               <h3 className="text-[10px] text-slate-600 tracking-[0.4em] px-6 font-bold uppercase">Game Management</h3>
               <ActionCard href="/admin-chif-pam/challenges" label="Gestion des défis" count="LIVE" icon={<Dices size={24}/>} color="bg-emerald-500" />
               <ActionCard href="/admin-chif-pam/mini-jeux" label="Audit Mini-Jeux" icon={<Target size={24}/>} color="bg-slate-900" textColor="text-emerald-500" border="border-emerald-500/20" />
               <ActionCard href="/admin-chif-pam/coupon" label="Coupons & Promos" icon={<Ticket size={24}/>} color="bg-indigo-600" textColor="text-white" />
            </div>

            <div className="space-y-4">
               <h3 className="text-[10px] text-slate-600 tracking-[0.4em] px-6 font-bold uppercase">Financial & Support</h3>
               <ActionCard href="/admin-chif-pam/demandes" label="Validation Flux" count={totalPending} icon={<ClipboardList size={24}/>} color="bg-white" />
               <div className="grid grid-cols-2 gap-4">
                  <ActionCard href="/admin-chif-pam/notifications" label="Alertes" icon={<Bell size={20}/>} color="bg-amber-500/10" textColor="text-amber-500" border="border-amber-500/20" />
                  <ActionCard href="/admin-chif-pam/chat" label="Support" count={stats.unreadMessages} icon={<MessageSquare size={20}/>} color="bg-slate-800" textColor="text-white" />
               </div>
               <ActionCard href="/admin-chif-pam/users" label="Audit Utilisateurs" icon={<Users size={24}/>} color="bg-slate-900" textColor="text-blue-500" border="border-blue-500/20" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ href, icon, label, active = false }: any) {
  return (
    <Link href={href} className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${active ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'hover:bg-white/5 text-slate-500'}`}>
      {icon} <span className="text-[10px] font-black tracking-widest">{label}</span>
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
    <div className={`p-8 rounded-[2.5rem] border ${colors[color]} relative overflow-hidden shadow-xl`}>
      <div className="relative z-10">
        <p className="text-[9px] uppercase opacity-60 mb-2">{title}</p>
        <p className="text-3xl font-black italic">{value}</p>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-10">{React.cloneElement(icon, { size: 90 })}</div>
    </div>
  );
}

function ActionCard({ href, label, count, icon, color, textColor = "text-slate-950", border="border-transparent" }: any) {
  return (
    <Link href={href} className={`flex items-center justify-between p-6 ${color} ${border} border rounded-[2rem] hover:scale-[1.02] transition-all shadow-xl`}>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-black/10 rounded-xl">{icon}</div>
        <div className={textColor}>
          <p className="text-[10px] opacity-60">Accès Rapide</p>
          <p className="text-sm font-black uppercase">{label}</p>
        </div>
      </div>
      {count !== undefined && count !== 0 && (
        <div className={`px-4 py-2 bg-black/20 rounded-full text-[10px] ${textColor} font-black`}>{count}</div>
      )}
    </Link>
  );
}


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
  Activity, AlertCircle, ChevronRight, Target, SidebarLink
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
    unreadMessages: 0 // Statistique pour le nouveau chat
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchGlobalStats();
    
    // ECOUTEUR ULTRA INSTANTANÉ (Modifié pour inclure les messages)
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchGlobalStats())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchGlobalStats()) // Nouveau message = Update stats
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => fetchGlobalStats()) // Message lu = Update stats
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

      // --- LOGIQUE CHAT MISE À JOUR ---
      const { count: unread } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read_by_admin', false)   // Nouvelle colonne
        .eq('is_admin_message', false); // Messages venant des clients seulement

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
          if (item.status === 'perdu') {
            impactAdmin = item.montant;
          } else if (['gagne', 'gagné', 'win'].includes(item.status)) {
            const payout = item.gain || item.montant; 
            impactAdmin = -payout;
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
        
        {/* SIDEBAR (Inchangée) */}
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
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 lg:p-12 space-y-8 overflow-y-auto h-screen">
          
          {/* BANDEAU ALERTE MISE À JOUR */}
          {(totalPending > 0 || stats.unreadMessages > 0) && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2.5rem] flex items-center justify-between animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="flex items-center gap-5">
                <div className="bg-emerald-500 p-3 rounded-2xl text-slate-950">
                  <AlertCircle size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] tracking-[0.2em] font-black uppercase">Statut Critique</span>
                  <span className="text-sm font-black text-emerald-500">
                    {totalPending} ACTIONS FINANCIÈRES & {stats.unreadMessages} MESSAGES CLIENTS NON LUS
                  </span>
                </div>
              </div>
              <Link href={stats.unreadMessages > 0 ? "/admin-chif-pam/chat" : "/admin-chif-pam/demandes"} className="text-[10px] bg-emerald-500 text-slate-950 px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-white transition-all font-black italic shadow-lg shadow-emerald-500/20">
                TRAITER <ChevronRight size={14} />
              </Link>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h1 className="text-4xl uppercase tracking-tighter">Control <span className="text-emerald-500">Center</span></h1>
            <button onClick={fetchGlobalStats} className="p-4 bg-slate-900 rounded-2xl border border-white/5 hover:border-emerald-500 transition-all text-slate-500 hover:text-emerald-500">
              <RefreshCw size={20} />
            </button>
          </div>

          {/* ... (Reste du code Chart et StatCards inchangé) ... */}
          
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
                  {/* CARD CHAT MISE À JOUR ICI */}
                  <ActionCard href="/admin-chif-pam/chat" label="Support" count={stats.unreadMessages} icon={<MessageSquare size={20}/>} color="bg-slate-800" textColor="text-emerald-500" />
               </div>
               <ActionCard href="/admin-chif-pam/users" label="Audit Utilisateurs" icon={<Users size={24}/>} color="bg-slate-900" textColor="text-blue-500" border="border-blue-500/20" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ... Les composants SidebarLink, StatCard et ActionCard restent identiques

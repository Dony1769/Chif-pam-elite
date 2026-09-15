"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';
import { 
  XAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { 
  Users, Wallet, ArrowUpCircle, Bell,
  ArrowDownCircle, Loader2, RefreshCw, LayoutDashboard,
  Dices, MessageSquare, Ticket, ClipboardList,
  AlertCircle, ChevronRight, BarChart3, Sparkles, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  // Loading initial (Vrai chargement)
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Loading silencieux (pour le bouton refresh manuel)
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pathname = usePathname();
  
  const [stats, setStats] = useState({
    totalUsers: 0, 
    totalBalance: 0, 
    pendingDepots: 0, 
    pendingRetraits: 0,
    unreadMessages: 0,
    pendingAgentRequests: 0,
    activeAgents: 0,
    averageP2PRate: 0,
    p2pVolume24h: 0,
    fraudFlags: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  // Ref pour éviter les fuites de mémoire sur l'intervalle
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Premier chargement
    fetchGlobalStats(true);
    
    // 2. Écouteur TRÈS RAPIDE (Realtime Supabase)
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchGlobalStats(false))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchGlobalStats(false))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => fetchGlobalStats(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mises' }, () => fetchGlobalStats(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_requests' }, () => fetchGlobalStats(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'p2p_transactions' }, () => fetchGlobalStats(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'p2p_fraud_flags' }, () => fetchGlobalStats(false))
      .subscribe();

    // 3. Intervalle de sécurité (30 secondes) - Rafraîchissement silencieux
    intervalRef.current = setInterval(() => {
        fetchGlobalStats(false);
    }, 30000);

    return () => { 
        supabase.removeChannel(channel);
        if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fetchGlobalStats = async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    else setIsRefreshing(true); // Indique un refresh léger

    try {
      // Exécution parallèle pour la vitesse
      const [
        userRes,
        balanceRes,
        depotsRes,
        retraitsRes,
        msgRes,
        agentRequestsRes,
        activeAgentsRes,
        p2pRatesRes,
        p2pVolumeRes,
        fraudFlagsRes,
        fluxRes
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.rpc('get_total_balance'),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending').in('type', ['deposit', 'depot']),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending').in('type', ['withdrawal', 'retrait']),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('is_read_by_admin', false).eq('is_admin_message', false),
        supabase.from('agent_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('agent_profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('p2p_offers').select('rate_htg_per_cp').eq('active', true),
        supabase.from('p2p_transactions').select('amount_htg').eq('status', 'completed').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('p2p_fraud_flags').select('*', { count: 'exact', head: true }).eq('reviewed', false),
        // Pour le graph
        supabase.from('mises').select('montant, gain, status, created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      // Traitement Graphique
      if (fluxRes.data) {
        const dailyStats: { [key: string]: number } = {};
        // Initialiser les 7 derniers jours à 0
        [...Array(7)].forEach((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dailyStats[d.toLocaleDateString('fr-FR', { weekday: 'short' })] = 0;
        });

        fluxRes.data.forEach(item => {
          const day = new Date(item.created_at).toLocaleDateString('fr-FR', { weekday: 'short' });
          let impact = 0;
          if (item.status === 'perdu') impact = item.montant;
          else if (['gagne', 'gagné', 'win'].includes(item.status)) impact = -(item.gain || item.montant);
          
          if (dailyStats[day] !== undefined) dailyStats[day] += impact;
        });
        setChartData(Object.keys(dailyStats).reverse().map(day => ({ name: day, revenue: dailyStats[day] })));
      }

      setStats({
        totalUsers: userRes.count || 0,
        totalBalance: balanceRes.data || 0,
        pendingDepots: depotsRes.count || 0,
        pendingRetraits: retraitsRes.count || 0,
        unreadMessages: msgRes.count || 0,
        pendingAgentRequests: agentRequestsRes.count || 0,
        activeAgents: activeAgentsRes.count || 0,
        averageP2PRate: p2pRatesRes.data?.length ? p2pRatesRes.data.reduce((sum, row) => sum + Number(row.rate_htg_per_cp), 0) / p2pRatesRes.data.length : 0,
        p2pVolume24h: p2pVolumeRes.data?.reduce((sum, row) => sum + Number(row.amount_htg), 0) || 0,
        fraudFlags: fraudFlagsRes.count || 0,
      });

    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
      if (isInitial) setInitialLoading(false);
      setIsRefreshing(false);
    }
  };

  // Seul le chargement initial bloque l'écran
  if (initialLoading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  const totalPending = stats.pendingDepots + stats.pendingRetraits;
  const hasActionableAlerts = totalPending > 0 || stats.unreadMessages > 0 || stats.pendingAgentRequests > 0 || stats.fraudFlags > 0;
  const alertHref = stats.unreadMessages > 0
    ? '/admin-chif-pam/chat'
    : totalPending > 0
      ? '/admin-chif-pam/demandes'
      : stats.pendingAgentRequests > 0
        ? '/admin-chif-pam/agent-requests'
        : '/admin-chif-pam/p2p';
  const alertText = stats.unreadMessages > 0
    ? `${stats.unreadMessages} MESSAGES NON LUS`
    : totalPending > 0
      ? `${totalPending} ACTIONS FINANCIERES`
      : stats.pendingAgentRequests > 0
        ? `${stats.pendingAgentRequests} DEMANDES AGENT`
        : `${stats.fraudFlags} ALERTES FRAUDE P2P`;

  const quickLinks = [
    { href: '/admin-chif-pam/analytics', label: 'Analytics', icon: <BarChart3 size={24} />, color: 'bg-slate-800', textColor: 'text-emerald-300' },
    { href: '/admin-chif-pam/challenges', label: 'Défis', icon: <Dices size={24} />, color: 'bg-fuchsia-500', textColor: 'text-slate-950' },
    { href: '/admin-chif-pam/coupon', label: 'Coupons', icon: <Ticket size={24} />, color: 'bg-amber-400', textColor: 'text-slate-950' },
    { href: '/admin-chif-pam/mini-jeux', label: 'Mini-jeux', icon: <Dices size={24} />, color: 'bg-emerald-500', textColor: 'text-slate-950' },
    { href: '/admin-chif-pam/loterie', label: 'Loterie', icon: <Sparkles size={24} />, color: 'bg-cyan-400', textColor: 'text-slate-950' },
    { href: '/admin-chif-pam/market', label: 'Boutique', icon: <Wallet size={24} />, color: 'bg-orange-400', textColor: 'text-slate-950' },
    { href: '/admin-chif-pam/demandes', label: 'Finances', icon: <ClipboardList size={24} />, color: 'bg-white', textColor: 'text-slate-950' },
    { href: '/admin-chif-pam/users', label: 'Utilisateurs', icon: <Users size={24} />, color: 'bg-blue-500', textColor: 'text-white' },
    { href: '/admin-chif-pam/notifications', label: 'Notifications', icon: <Bell size={24} />, color: 'bg-rose-400', textColor: 'text-slate-950' },
    { href: '/admin-chif-pam/agent-requests', label: 'Agents', icon: <Users size={24} />, color: 'bg-violet-400', textColor: 'text-slate-950' },
    { href: '/admin-chif-pam/chat', label: 'Support', icon: <MessageSquare size={24} />, color: 'bg-slate-700', textColor: 'text-emerald-300' },
    { href: '/admin-chif-pam/p2p', label: 'Marché P2P', icon: <ShieldAlert size={24} />, color: 'bg-lime-300', textColor: 'text-slate-950' },
    { href: '/admin-chif-pam/phone-duplicates', label: 'Doublons téléphone', icon: <AlertCircle size={24} />, color: 'bg-red-400', textColor: 'text-slate-950' },
    { href: '/admin-chif-pam/phone-issues', label: 'Incidents téléphone', icon: <ShieldAlert size={24} />, color: 'bg-yellow-300', textColor: 'text-slate-950' },
  ];

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
            <SidebarLink href="/admin-chif-pam/analytics" icon={<BarChart3 size={20}/>} label="Analytics" active={pathname.includes('analytics')} />
            <SidebarLink href="/admin-chif-pam/challenges" icon={<Dices size={20}/>} label="Gestion Défi" active={pathname.includes('challenges')} />
            <SidebarLink href="/admin-chif-pam/coupon" icon={<Ticket size={20}/>} label="Gestion Coupons" active={pathname.includes('coupon')} />
            <SidebarLink href="/admin-chif-pam/demandes" icon={<Wallet size={20}/>} label="Finances / Demandes" active={pathname.includes('demandes')} />
            <SidebarLink href="/admin-chif-pam/users" icon={<Users size={20}/>} label="Utilisateurs" active={pathname.includes('users')} />
            <SidebarLink href="/admin-chif-pam/notifications" icon={<Bell size={20}/>} label="Notifications" active={pathname.includes('notifications')} />
            <SidebarLink href="/admin-chif-pam/agent-requests" icon={<Users size={20}/>} label="Agents" active={pathname.includes('agent-requests')} />
            <SidebarLink href="/admin-chif-pam/chat" icon={<MessageSquare size={20}/>} label="Support Client" active={pathname.includes('chat')} />
            <SidebarLink href="/admin-chif-pam/p2p" icon={<Sparkles size={20}/>} label="Marché P2P" active={pathname.includes('p2p')} />
            <SidebarLink href="/admin-chif-pam/market" icon={<Wallet size={20}/>} label="Boutique" active={pathname.includes('market')} />
            <SidebarLink href="/admin-chif-pam/mini-jeux" icon={<Dices size={20}/>} label="Mini-jeux" active={pathname.includes('mini-jeux')} />
            <SidebarLink href="/admin-chif-pam/loterie" icon={<Sparkles size={20}/>} label="Loterie" active={pathname.includes('loterie')} />
            <SidebarLink href="/admin-chif-pam/phone-duplicates" icon={<ShieldAlert size={20}/>} label="Doublons téléphone" active={pathname.includes('phone-duplicates')} />
            <SidebarLink href="/admin-chif-pam/phone-issues" icon={<AlertCircle size={20}/>} label="Incidents téléphone" active={pathname.includes('phone-issues')} />
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 lg:p-12 space-y-8 overflow-y-auto h-screen">
          
          {/* Header avec indicateur de refresh subtil */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
                <h1 className="text-4xl uppercase tracking-tighter">Control <span className="text-emerald-500">Center</span></h1>
                {/* Petit indicateur discret qui montre la dernière mise à jour */}
                <p className="text-[9px] text-slate-600 mt-1 flex items-center gap-2">
                    {isRefreshing ? <span className="text-emerald-500 animate-pulse">● Mise à jour...</span> : <span>● Données en direct</span>}
                </p>
            </div>
            
            <button 
                onClick={() => fetchGlobalStats(false)} 
                className={`p-4 bg-slate-900 rounded-2xl border border-white/5 hover:border-emerald-500 transition-all ${isRefreshing ? 'text-emerald-500 animate-spin' : 'text-slate-500 hover:text-emerald-500'}`}
            >
              <RefreshCw size={20} />
            </button>
          </div>

          {/* BANDEAU ALERTE (Apparaît s'il y a du travail) */}
          {hasActionableAlerts && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2.5rem] flex items-center justify-between shadow-[0_0_30px_rgba(16,185,129,0.1)] animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-5">
                <div className="bg-emerald-500 p-3 rounded-2xl text-slate-950">
                  <AlertCircle size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] tracking-[0.2em] font-black uppercase text-white">Statut Critique</span>
                  <span className="text-sm font-black text-emerald-500">
                    {alertText}
                  </span>
                </div>
              </div>
              <Link href={alertHref} className="text-[10px] bg-emerald-500 text-slate-950 px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-white transition-all font-black italic shadow-lg shadow-emerald-500/20">
                TRAITER <ChevronRight size={14} />
              </Link>
            </div>
          )}

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard title="Total Joueurs" value={stats.totalUsers.toLocaleString()} icon={<Users />} color="blue" />
            <StatCard title="Trésorerie" value={stats.totalBalance.toLocaleString()} icon={<Wallet />} color="emerald" />
            <StatCard title="Dépôts Attente" value={stats.pendingDepots} icon={<ArrowUpCircle />} color="amber" />
            <StatCard title="Retraits Attente" value={stats.pendingRetraits} icon={<ArrowDownCircle />} color="rose" />
            <StatCard title="Demandes Agent" value={stats.pendingAgentRequests} icon={<Users />} color="blue" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MarketStat label="Agents actifs" value={stats.activeAgents.toLocaleString()} icon={<Users size={18} />} />
            <MarketStat label="Taux moyen P2P" value={`${stats.averageP2PRate.toFixed(4)} HTG/CP`} icon={<Sparkles size={18} />} />
            <MarketStat label="Volume P2P 24h" value={`${stats.p2pVolume24h.toLocaleString()} HTG`} icon={<ShieldAlert size={18} />} />
          </div>

          {/* GRAPH & ACTIONS */}
          <div className="h-64 w-full bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-6 relative overflow-hidden">
             <p className="absolute top-6 left-8 text-[10px] text-slate-500 font-bold uppercase tracking-widest z-10">Flux de Trésorerie (7J)</p>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 10, fontWeight: 900}} tickLine={false} axisLine={false} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#10B981', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>

          <div className="space-y-4 pb-12">
            <h3 className="text-[10px] text-slate-600 tracking-[0.4em] px-6 font-bold uppercase">Actions requises</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {totalPending > 0 && <ActionCard href="/admin-chif-pam/demandes" label="Validation Flux" count={totalPending} icon={<ClipboardList size={24}/>} color="bg-white" />}
              {stats.unreadMessages > 0 && <ActionCard href="/admin-chif-pam/chat" label="Support non lu" count={stats.unreadMessages} icon={<MessageSquare size={24}/>} color="bg-slate-800" textColor="text-emerald-500" />}
              {stats.pendingAgentRequests > 0 && <ActionCard href="/admin-chif-pam/agent-requests" label="Demandes agent" count={stats.pendingAgentRequests} icon={<Users size={24}/>} color="bg-emerald-500" />}
              {stats.fraudFlags > 0 && <ActionCard href="/admin-chif-pam/p2p" label="Alertes fraude P2P" count={stats.fraudFlags} icon={<ShieldAlert size={24}/>} color="bg-amber-500" textColor="text-slate-950" />}
            </div>
          </div>

          <div className="space-y-4 pb-12">
            <div className="flex items-end justify-between px-6">
              <div>
                <h3 className="text-[10px] text-slate-300 tracking-[0.4em] font-bold uppercase">Accès rapide</h3>
                <p className="mt-1 text-[10px] normal-case tracking-normal text-slate-600">Toutes les pages de gestion, toujours disponibles.</p>
              </div>
              <LayoutDashboard size={18} className="text-emerald-500/60" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {quickLinks.map((link) => <ActionCard key={link.href} {...link} />)}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function MarketStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-900/60 p-4"><span className="text-emerald-400">{icon}</span><div><p className="text-[9px] text-slate-500">{label}</p><p className="text-sm font-black text-white">{value}</p></div></div>;
}

// --- UI COMPONENTS ---

function SidebarLink({ href, icon, label, active = false }: any) {
  return (
    <Link href={href} className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${active ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 scale-[1.02]' : 'hover:bg-white/5 text-slate-500 hover:text-emerald-500/50'}`}>
      {icon} <span className="text-[10px] font-black tracking-[0.2em] uppercase italic">{label}</span>
    </Link>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const colors: any = {
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-amber-500/5",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-rose-500/5",
  };
  return (
    <div className={`p-8 rounded-[2.5rem] border ${colors[color]} relative overflow-hidden shadow-2xl backdrop-blur-sm group transition-all duration-500 hover:-translate-y-1`}>
      <div className="relative z-10">
        <p className="text-[9px] uppercase font-black tracking-widest opacity-60 mb-2 italic">{title}</p>
        <p className="text-3xl font-black italic tracking-tighter">{value}</p>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
        {React.cloneElement(icon, { size: 100 })}
      </div>
    </div>
  );
}

function ActionCard({ href, label, count, icon, color, textColor = "text-slate-950", border="border-transparent" }: any) {
  return (
    <Link href={href} className={`flex items-center justify-between p-6 ${color} ${border} border rounded-[2.5rem] hover:scale-[1.03] active:scale-95 transition-all shadow-xl group`}>
      <div className="flex items-center gap-5">
        <div className="p-4 bg-black/10 rounded-2xl group-hover:rotate-6 transition-transform">{icon}</div>
        <div className={textColor}>
          <p className="text-[10px] opacity-60 font-black uppercase tracking-widest">Accès Rapide</p>
          <p className="text-sm font-black uppercase italic tracking-tighter">{label}</p>
        </div>
      </div>
      {count !== undefined && count !== 0 && (
        <div className={`px-4 py-2 bg-black/20 rounded-full text-[10px] ${textColor} font-black animate-pulse border border-black/5`}>{count}</div>
      )}
    </Link>
  );
}


"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  User, LogOut, Camera, Loader2, ChevronRight, 
  CheckCircle2, ArrowLeft, Save, Shield, HelpCircle,
  BookOpen, Info
} from 'lucide-react';
import { 
  AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis, ReferenceLine 
} from 'recharts';
import Link from 'next/link';

// --- COMPOSANT LOGO SVG OFFICIEL ---
const LogoChifPamSmall = () => (
  <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [stats, setStats] = useState({ deposits: 0, withdrawals: 0, netBalance: 0 });

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchCompleteData();
  }, []);

  const fetchCompleteData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: transactions } = await supabase.from('transactions').select('amount, type, created_at, status').eq('user_id', user.id).eq('status', 'approved');
    const { data: mises } = await supabase.from('mises').select('montant, status, created_at').eq('user_id', user.id);

    if (prof) {
      setProfile(prof);
      setNewUsername(prof.username || '');
      processPerformanceData(transactions || [], mises || []);
    }
    setLoading(false);
  };

  const processPerformanceData = (trans: any[], mises: any[]) => {
    const dailyData: { [key: string]: number } = {};
    let totalDep = 0; let totalWith = 0; let netRunningBalance = 0;

    trans.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString('fr-FR', { weekday: 'short' });
      const val = t.type === 'deposit' ? t.amount : -t.amount;
      if (t.type === 'deposit') totalDep += t.amount;
      if (t.type === 'withdrawal') totalWith += t.amount;
      dailyData[date] = (dailyData[date] || 0) + val;
      netRunningBalance += val;
    });

    mises.forEach(m => {
      const date = new Date(m.created_at).toLocaleDateString('fr-FR', { weekday: 'short' });
      let impactMise = -m.montant; 
      if (m.status === 'gagné' || m.status === 'gagne') impactMise += (m.montant * 50); 
      dailyData[date] = (dailyData[date] || 0) + impactMise;
      netRunningBalance += impactMise;
    });

    const formattedData = Object.keys(dailyData).map(key => ({ name: key, gain: dailyData[key] }));
    setChartData(formattedData);
    setStats({ deposits: totalDep, withdrawals: totalWith, netBalance: netRunningBalance });
  };

  const handleUpdateProfile = async () => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: profError } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', user.id);

      if (profError) throw profError;

      if (newPassword.length >= 6) {
        const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
        if (authError) throw authError;
      }

      alert("Profil mis à jour avec succès !");
      fetchCompleteData();
      setNewPassword('');
    } catch (error: any) {
      alert("Erreur: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.replace('/connexion');
    } catch (error) {
      window.location.href = '/connexion';
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-sans overflow-x-hidden">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => router.back()}
            className="p-3 bg-slate-900 border border-white/5 rounded-2xl hover:bg-slate-800 transition-all active:scale-90"
          >
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full border border-white/5">
            <LogoChifPamSmall />
            <span className="font-black italic text-sm tracking-tighter">CHIF-PAM</span>
          </div>
          <div className="w-10"></div>
        </div>

        {/* HEADER PROFIL */}
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative group">
            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border-2 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-transform">
              <User size={40} className="text-emerald-500" />
            </div>
            <div className="absolute bottom-0 right-0 bg-emerald-500 p-2 rounded-full border-4 border-[#020617] cursor-pointer">
              <Camera size={14} className="text-slate-950" />
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-black tracking-tight uppercase italic">@{profile?.username}</h1>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold">Membre Officiel</span>
          </div>
        </div>

        {/* NOUVEAU : SECTION AIDE & INFOS (Demandé dans le rapport) */}
        <div className="space-y-3">
          <h3 className="text-[10px] text-slate-500 uppercase tracking-[0.3em] ml-4 font-black italic">Assistance</h3>
          <Link href="/client/help">
            <div className="w-full p-5 bg-slate-900/80 border border-emerald-500/10 rounded-[2rem] flex justify-between items-center group hover:border-emerald-500/30 transition-all active:scale-98">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <BookOpen size={20} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase italic tracking-tight">Guide & Aide</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">Comment miser et retirer</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-emerald-500/40 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* PERFORMANCE RÉELLE */}
        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="mb-6 relative z-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1 font-bold">Bilan d'activité</p>
            <h2 className={`text-4xl font-black ${stats.netBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {stats.netBalance.toLocaleString()} HTG
            </h2>
          </div>
          
          <div className="h-40 w-full -ml-4 relative z-10">
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
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950 border border-white/10 p-3 rounded-2xl shadow-xl">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">{payload[0].payload.name}</p>
                          <p className={`font-bold ${Number(payload[0].value) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {Number(payload[0].value).toLocaleString()} HTG
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.05)" />
                <Area type="monotone" dataKey="gain" stroke={stats.netBalance >= 0 ? "#10b981" : "#f43f5e"} fillOpacity={1} fill="url(#colorGain)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5 mt-4 relative z-10">
            <div>
              <p className="text-[9px] uppercase text-slate-500 tracking-tighter mb-1 font-bold italic">Total Dépôts</p>
              <p className="text-lg font-black text-emerald-500">+{stats.deposits.toLocaleString()}</p>
            </div>
            <div className="border-l border-white/10 pl-4">
              <p className="text-[9px] uppercase text-slate-500 tracking-tighter mb-1 font-bold italic">Total Retraits</p>
              <p className="text-lg font-black text-rose-500">-{stats.withdrawals.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* PARAMÈTRES COMPTE */}
        <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-emerald-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sécurité du Compte</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase text-slate-500 ml-4 font-bold tracking-widest">Identifiant</label>
              <input 
                type="text" 
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-sm font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase text-slate-500 ml-4 font-bold tracking-widest">Modifier mot de passe</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-sm font-bold"
              />
            </div>
            <button 
              onClick={handleUpdateProfile}
              disabled={updating}
              className="w-full bg-emerald-500 text-slate-950 p-4 rounded-2xl font-black text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {updating ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> ENREGISTRER</>}
            </button>
          </div>
        </div>

        {/* DÉCONNEXION */}
        <button 
          onClick={handleLogout}
          className="w-full p-5 bg-rose-500/5 border border-rose-500/10 rounded-3xl flex justify-between items-center group hover:bg-rose-500/10 transition-all active:scale-95"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-rose-500/10 rounded-xl">
               <LogOut size={18} className="text-rose-500" />
            </div>
            <span className="text-xs font-black text-rose-500 uppercase tracking-widest">Déconnexion</span>
          </div>
          <ChevronRight size={18} className="text-rose-500/30 group-hover:translate-x-1 transition-transform" />
        </button>

      </div>
    </main>
  );
}


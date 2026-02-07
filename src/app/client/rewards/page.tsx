"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Trophy, Calendar, CheckCircle2, Lock, Gift, Star, Zap, ChevronLeft, Coins, Gem, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RewardsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'tasks'>('login');
  const [loading, setLoading] = useState(true);
  const [rewardsConfig, setRewardsConfig] = useState<any[]>([]);
  const [claiming, setClaiming] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/connexion');

    const [profRes, rewRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('daily_rewards_config').select('*').order('day_number', { ascending: true })
    ]);

    setProfile(profRes.data);
    setRewardsConfig(rewRes.data || []);
    setLoading(false);
  };

  const handleClaimDaily = async () => {
    setClaiming(true);
    const { data, error } = await supabase.rpc('claim_daily_login', { p_user_id: profile.id });
    
    if (error || !data.success) {
      alert(data?.message || "Erreur lors de la réclamation");
    } else {
      // Effet visuel ou son ici
      fetchData(); // Rafraichir les données
    }
    setClaiming(false);
  };

  if (loading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  const currentStreak = profile?.login_streak || 0;
  const alreadyClaimedToday = new Date(profile?.last_login_date).toDateString() === new Date().toDateString();

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-emerald-500/30 pb-24">
      {/* Header FC Mobile Style */}
      <div className="bg-gradient-to-b from-slate-900 to-[#020617] p-6 border-b border-white/5">
        <div className="flex justify-between items-center mb-6">
            <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl active:scale-95"><ChevronLeft/></button>
            <h1 className="text-xl font-black italic tracking-tighter uppercase">Centre de Récompenses</h1>
            <div className="w-10"></div>
        </div>

        {/* User Stats Bar */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            <StatBadge icon={<Coins size={14} className="text-emerald-400"/>} value={profile.jetons_cp} label="CP" />
            <StatBadge icon={<Gem size={14} className="text-blue-400"/>} value={profile.diamonds} label="DIAMANTS" />
            <StatBadge icon={<Star size={14} className="text-amber-400"/>} value={`Niv. ${profile.level}`} label={`${profile.xp % 1000}/1000 XP`} isXp />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-4 p-6">
        <TabButton active={activeTab === 'login'} onClick={() => setActiveTab('login')} icon={<Calendar size={18}/>} label="Connexion" />
        <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<Trophy size={18}/>} label="Tâches" />
      </div>

      <div className="px-4">
        <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
                <motion.div key="login" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}>
                    {/* Hero Card du jour */}
                    <div className="bg-gradient-to-br from-slate-800 to-black p-6 rounded-[2rem] border border-white/10 relative overflow-hidden mb-8 shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full pointer-events-none"/>
                        <div className="relative z-10 text-center">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Récompense du jour</p>
                            <h2 className="text-4xl font-black italic text-white mb-6">JOUR {currentStreak + (alreadyClaimedToday ? 0 : 1)}</h2>
                            
                            <button 
                                onClick={handleClaimDaily}
                                disabled={alreadyClaimedToday || claiming}
                                className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                                    alreadyClaimedToday 
                                    ? 'bg-white/5 text-slate-500 cursor-not-allowed' 
                                    : 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                                }`}
                            >
                                {claiming ? <Loader2 className="animate-spin"/> : alreadyClaimedToday ? "DÉJÀ RÉCLAMÉ ✅" : "RÉCLAMER MAINTENANT"}
                            </button>
                        </div>
                    </div>

                    {/* Grille Calendrier */}
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {rewardsConfig.map((day) => {
                            const isPast = day.day_number <= currentStreak;
                            const isNext = day.day_number === currentStreak + 1 && !alreadyClaimedToday;
                            
                            return (
                                <div key={day.day_number} className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative overflow-hidden ${
                                    isPast ? 'bg-emerald-900/20 border-emerald-500/50 opacity-50' : 
                                    isNext ? 'bg-white/10 border-emerald-500 animate-pulse' : 'bg-black/40 border-white/5'
                                }`}>
                                    {isPast && <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center"><CheckCheck className="text-emerald-500"/></div>}
                                    <span className="text-[8px] absolute top-1 left-2 text-slate-500">J{day.day_number}</span>
                                    {day.reward_type === 'cp' && <Coins size={20} className="text-emerald-400 mb-1"/>}
                                    {day.reward_type === 'diamonds' && <Gem size={20} className="text-blue-400 mb-1"/>}
                                    {day.reward_type === 'xp' && <Star size={20} className="text-amber-400 mb-1"/>}
                                    <span className="text-[10px] font-black">{day.amount}</span>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>
            ) : (
                <motion.div key="tasks" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="space-y-4">
                    {/* Exemple de tâches statiques (à dynamiser avec une table 'user_tasks' plus tard) */}
                    <TaskCard title="Première Victoire" desc="Gagne une partie de Quiz" reward="100 CP" icon={<Trophy className="text-amber-500"/>} progress={0} max={1} />
                    <TaskCard title="Hacker Pro" desc="Réussis 5 séquences Biometric" reward="50 XP" icon={<Fingerprint className="text-emerald-500"/>} progress={2} max={5} />
                    <TaskCard title="Investisseur" desc="Achète un pack boutique" reward="10 DIAMONDS" icon={<Zap className="text-purple-500"/>} progress={0} max={1} />
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Sub-components pour le style
const StatBadge = ({ icon, value, label, isXp }: any) => (
    <div className="bg-slate-900/80 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3 min-w-fit">
        {icon}
        <div>
            <p className="text-sm font-black leading-none">{value}</p>
            <p className="text-[7px] text-slate-500 font-bold tracking-widest uppercase">{label}</p>
        </div>
        {isXp && <div className="h-1 w-10 bg-white/10 rounded-full mt-1"><div className="h-full bg-amber-500 rounded-full" style={{width: '45%'}}/></div>}
    </div>
);

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-black italic uppercase text-xs ${active ? 'bg-white text-black' : 'bg-white/5 text-slate-400'}`}>
        {icon} {label}
    </button>
);

const TaskCard = ({ title, desc, reward, icon, progress, max }: any) => (
    <div className="bg-slate-900/60 border border-white/5 p-5 rounded-[1.5rem] flex items-center gap-4">
        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center border border-white/5">{icon}</div>
        <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
                <h4 className="font-black italic uppercase text-sm">{title}</h4>
                <span className="text-[9px] bg-white/10 px-2 py-1 rounded-md font-bold text-emerald-400">{reward}</span>
            </div>
            <p className="text-[10px] text-slate-500 mb-2">{desc}</p>
            <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{width: `${(progress/max)*100}%`}}/>
            </div>
            <div className="flex justify-end mt-1">
                <span className="text-[8px] text-slate-400 font-mono">{progress}/{max}</span>
            </div>
        </div>
        <button disabled={progress < max} className={`h-10 px-4 rounded-xl font-black text-[9px] uppercase ${progress >= max ? 'bg-emerald-500 text-black animate-pulse' : 'bg-white/5 text-slate-600'}`}>
            {progress >= max ? "RÉCLAMER" : "EN COURS"}
        </button>
    </div>
);

import { CheckCheck, Fingerprint } from 'lucide-react';

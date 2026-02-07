"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Trophy, Calendar, CheckCircle2, Lock, Gift, Star, Zap, ChevronLeft, Coins, Gem, Loader2, Brain, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RewardsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'tasks'>('login');
  const [loading, setLoading] = useState(true);
  const [rewardsConfig, setRewardsConfig] = useState<any[]>([]);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [claiming, setClaiming] = useState<string | boolean>(false);
  const router = useRouter();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/connexion');

    const [profRes, rewRes, taskRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('daily_rewards_config').select('*').order('day_number', { ascending: true }),
      // On récupère les tâches et la progression du jour
      supabase.from('tasks_config').select(`*, user_tasks_progress(progress, is_claimed)`)
    ]);

    // Formatage des tâches pour simplifier l'accès à la progression
    const tasksFormatted = taskRes.data?.map((t: any) => {
        // Filtrer pour être sûr que c'est la progression de l'utilisateur actuel
        const prog = t.user_tasks_progress?.find((p: any) => p.user_id === user.id);
        return {
            ...t,
            progress: prog?.progress || 0,
            is_claimed: prog?.is_claimed || false
        };
    });

    setProfile(profRes.data);
    setRewardsConfig(rewRes.data || []);
    setUserTasks(tasksFormatted || []);
    setLoading(false);
  };

  // --- ACTIONS DE RÉCLAMATION OPTIMISÉES ---

  const handleClaimDaily = async () => {
    if (!profile) return;
    setClaiming(true);
    
    const { data, error } = await supabase.rpc('claim_daily_login', { p_user_id: profile.id });
    
    if (error || !data.success) {
      alert(data?.message || "Erreur technique");
    } else {
      // MISE À JOUR INSTANTANÉE DES SOLDES (Sans recharger toute la page)
      setProfile((prev: any) => ({
        ...prev,
        jetons_cp: data.new_cp,
        diamonds: data.new_diamonds,
        xp: data.new_xp,
        last_login_date: new Date().toISOString(), // Simule la date d'aujourd'hui
        login_streak: (prev.login_streak || 0) + 1
      }));
      // On recharge juste pour être sûr que tout est sync
      setTimeout(fetchData, 500); 
    }
    setClaiming(false);
  };

  const handleClaimTask = async (taskCode: string) => {
    setClaiming(taskCode);
    const { data, error } = await supabase.rpc('claim_task_reward', { p_user_id: profile.id, p_task_code: taskCode });
    
    if (error || !data.success) {
        alert("Erreur : Tâche non validée ou déjà réclamée.");
    } else {
        // MISE À JOUR INSTANTANÉE DES SOLDES
        setProfile((prev: any) => ({
            ...prev,
            jetons_cp: data.new_cp,
            diamonds: data.new_diamonds,
            xp: data.new_xp
        }));
        
        // Marquer la tâche comme réclamée visuellement
        setUserTasks(prev => prev.map(t => 
            t.code === taskCode ? { ...t, is_claimed: true } : t
        ));
    }
    setClaiming(false);
  };

  if (loading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  // Calculs pour l'affichage
  const currentStreak = profile?.login_streak || 0;
  const todayStr = new Date().toDateString();
  const lastLoginStr = profile?.last_login_date ? new Date(profile.last_login_date).toDateString() : "";
  const alreadyClaimedToday = todayStr === lastLoginStr;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-emerald-500/30 pb-24">
      
      {/* Header Stats */}
      <div className="bg-gradient-to-b from-slate-900 to-[#020617] p-6 border-b border-white/5 sticky top-0 z-20">
        <div className="flex justify-between items-center mb-6">
            <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl active:scale-95"><ChevronLeft/></button>
            <h1 className="text-lg font-black italic tracking-tighter uppercase">Missions & Cadeaux</h1>
            <div className="w-8"></div>
        </div>
        <div className="flex gap-2 justify-center">
            {/* COMPOSANTS STATPILL QUI SE METTENT A JOUR AUTOMATIQUEMENT */}
            <StatPill icon={<Coins size={12}/>} val={profile?.jetons_cp || 0} label="CP" color="text-emerald-400" />
            <StatPill icon={<Gem size={12}/>} val={profile?.diamonds || 0} label="GEMS" color="text-blue-400" />
            <StatPill icon={<Star size={12}/>} val={profile?.level || 1} label="LVL" color="text-amber-400" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 p-6">
        <TabButton active={activeTab === 'login'} onClick={() => setActiveTab('login')} label="Calendrier" />
        <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} label="Défis du Jour" />
      </div>

      <div className="px-4">
        <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
                <motion.div key="login" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
                    {/* Hero Card */}
                    <div className="bg-gradient-to-br from-emerald-900/40 to-black p-6 rounded-[2rem] border border-emerald-500/20 text-center mb-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                        <h2 className="text-3xl font-black italic text-white mb-1">JOUR {alreadyClaimedToday ? currentStreak : currentStreak + 1}</h2>
                        <p className="text-[10px] text-emerald-500 uppercase tracking-widest mb-6">Série en cours</p>
                        <button 
                            onClick={handleClaimDaily}
                            disabled={alreadyClaimedToday || claiming === true}
                            className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 ${
                                alreadyClaimedToday ? 'bg-white/5 text-slate-500' : 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                            }`}
                        >
                            {claiming === true ? <Loader2 className="animate-spin mx-auto"/> : alreadyClaimedToday ? "Reviens Demain" : "Récupérer"}
                        </button>
                    </div>

                    {/* Grille */}
                    <div className="grid grid-cols-5 gap-2">
                        {rewardsConfig.slice(0, 10).map((day) => { 
                            const isPast = day.day_number <= currentStreak;
                            const isTodayTarget = day.day_number === currentStreak + 1;
                            
                            return (
                                <div key={day.day_number} className={`aspect-[4/5] rounded-xl border flex flex-col items-center justify-center relative ${
                                    isPast ? 'bg-emerald-500/10 border-emerald-500/40' : 
                                    (isTodayTarget && !alreadyClaimedToday) ? 'bg-white/10 border-emerald-400 animate-pulse' : 'bg-black/40 border-white/5'
                                }`}>
                                    <span className="text-[7px] text-slate-500 absolute top-1 left-1.5">J{day.day_number}</span>
                                    {day.reward_type === 'diamonds' ? <Gem size={18} className="text-blue-400 mb-1"/> : 
                                     day.reward_type === 'cp' ? <Coins size={18} className="text-emerald-400 mb-1"/> : 
                                     <Star size={18} className="text-amber-400 mb-1"/>}
                                    <span className="text-[9px] font-black">{day.amount}</span>
                                    {isPast && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><CheckCircle2 className="text-emerald-500" size={20}/></div>}
                                </div>
                            )
                        })}
                    </div>
                </motion.div>
            ) : (
                <motion.div key="tasks" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-3">
                    {userTasks.map((task) => (
                        <div key={task.code} className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center border border-white/5 text-slate-400">
                                {task.icon_name === 'Brain' ? <Brain size={18}/> : task.icon_name === 'Lock' ? <Lock size={18}/> : <ShoppingBag size={18}/>}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                    <h4 className="text-xs font-black uppercase italic text-slate-200">{task.description}</h4>
                                    <span className={`text-[8px] px-2 py-0.5 rounded font-bold ${task.reward_type === 'diamonds' ? 'text-blue-400 bg-blue-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>
                                        +{task.reward_amount} {task.reward_type === 'diamonds' ? '💎' : 'CP'}
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden mb-1">
                                    <div className="h-full bg-emerald-500 transition-all" style={{width: `${Math.min(100, (task.progress/task.target_count)*100)}%`}}/>
                                </div>
                                <p className="text-[8px] text-slate-500 text-right">{task.progress} / {task.target_count}</p>
                            </div>
                            <button 
                                onClick={() => handleClaimTask(task.code)}
                                // Bouton désactivé si : pas fini OU déjà réclamé OU en cours de traitement
                                disabled={task.progress < task.target_count || task.is_claimed || claiming === task.code}
                                className={`h-8 px-3 rounded-lg font-black text-[9px] uppercase transition-all ${
                                    task.is_claimed ? 'bg-transparent text-slate-600 border border-slate-700' :
                                    task.progress >= task.target_count ? 'bg-emerald-500 text-black animate-pulse shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-slate-600'
                                }`}
                            >
                                {claiming === task.code ? <Loader2 size={12} className="animate-spin"/> : task.is_claimed ? "FAIT" : "RÉCLAMER"}
                            </button>
                        </div>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const StatPill = ({icon, val, label, color}: any) => (
    <div className={`bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2 ${color}`}>
        {icon} <span className="text-xs font-black italic">{val}</span>
    </div>
);

const TabButton = ({ active, onClick, label }: any) => (
    <button onClick={onClick} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
        active ? 'bg-white text-black' : 'bg-white/5 text-slate-500'
    }`}>
        {label}
    </button>
);

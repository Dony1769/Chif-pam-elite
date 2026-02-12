"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Trophy, Calendar, CheckCircle2, Lock, Gift, Star, ChevronLeft, Coins, Gem, Loader2, Brain, ShoppingBag, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Import du banner (Assurez-vous d'avoir ce composant ou remplacez par ExoClickBanner si vous préférez)
import ExoClickBanner from "@/components/ads/ExoClickBanner"; 

export default function RewardsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'tasks'>('login');
  const [loading, setLoading] = useState(true);
  const [rewardsConfig, setRewardsConfig] = useState<any[]>([]);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [claiming, setClaiming] = useState<string | boolean>(false);
  
  // Nouvel état pour gérer le statut "déjà réclamé" indépendamment de last_login
  const [rewardStatus, setRewardStatus] = useState({ claimed: false, streak: 0 });
  
  const router = useRouter();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/connexion');

    const [profRes, rewRes, taskRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('daily_rewards_config').select('*').order('day_number', { ascending: true }),
      supabase.from('tasks_config').select(`*, user_tasks_progress(progress, is_claimed)`)
    ]);

    if (profRes.data) {
        setProfile(profRes.data);
        
        // LOGIQUE DE VÉRIFICATION ROBUSTE
        // On vérifie si la dernière date de connexion est "aujourd'hui" ET si le streak a été incrémenté
        // Idéalement, il faudrait une colonne 'last_reward_date' dans la DB.
        // Ici, on compare la date stockée avec la date locale.
        const lastDate = new Date(profRes.data.last_login_date);
        const today = new Date();
        const isSameDay = lastDate.toDateString() === today.toDateString();
        
        // Si c'est le même jour, on suppose que c'est réclamé (à améliorer coté SQL si besoin)
        setRewardStatus({
            claimed: isSameDay, 
            streak: profRes.data.login_streak
        });
    }

    const tasksFormatted = taskRes.data?.map((t: any) => {
        const prog = t.user_tasks_progress?.[0];
        return {
            ...t,
            progress: prog?.progress || 0,
            is_claimed: prog?.is_claimed || false
        };
    });

    setRewardsConfig(rewRes.data || []);
    setUserTasks(tasksFormatted || []);
    setLoading(false);
  };

  // --- LOGIQUE RÉCLAMATION JOURNALIÈRE ---
  const handleClaimDaily = async () => {
    if (!profile) return;
    setClaiming(true);
    
    try {
        const { data, error } = await supabase.rpc('claim_daily_login', { p_user_id: profile.id });
        
        if (error) throw error;
        if (!data.success) {
            alert(data.message);
            // Si l'erreur dit "déjà réclamé", on met à jour l'état visuel
            if (data.message.includes('déjà')) {
                setRewardStatus(prev => ({ ...prev, claimed: true }));
            }
        } else {
            // Succès
            setProfile((prev: any) => ({
                ...prev,
                jetons_cp: data.new_cp,
                diamonds: data.new_diamonds,
                xp: data.new_xp,
                level: data.new_level,
                login_streak: data.new_streak,
                last_login_date: new Date().toISOString()
            }));
            setRewardStatus({ claimed: true, streak: data.new_streak });
        }
    } catch (err: any) {
        alert("Erreur: " + err.message);
    } finally {
        setClaiming(false);
    }
  };

  // --- LOGIQUE RÉCLAMATION TÂCHE ---
  const handleClaimTask = async (taskCode: string) => {
    if (!profile) return;
    setClaiming(taskCode);
    const { data, error } = await supabase.rpc('claim_task_reward', { p_user_id: profile.id, p_task_code: taskCode });
    
    if (error) { alert("Erreur système"); }
    else if (!data.success) { alert(data.message); }
    else {
      setProfile((prev: any) => ({
        ...prev,
        jetons_cp: data.new_cp,
        diamonds: data.new_diamonds,
        xp: data.new_xp,
        level: data.new_level
      }));

      setUserTasks(prev => prev.map(t => t.code === taskCode ? { ...t, is_claimed: true } : t));
    }
    setClaiming(false);
  };

  if (loading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-emerald-500/30 pb-24">

      {/* Header Stats (Fixe) */}
      <div className="bg-gradient-to-b from-slate-900 to-[#020617] p-6 border-b border-white/5 sticky top-0 z-20 shadow-lg">
        <div className="flex justify-between items-center mb-6">
            <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl active:scale-95 transition-all"><ChevronLeft/></button>
            <h1 className="text-lg font-black italic tracking-tighter uppercase">Centre de Mission</h1>
            <div className="w-8"></div>
        </div>
        <div className="flex gap-2 justify-center">
            <StatPill icon={<Coins size={14}/>} val={profile?.jetons_cp} label="CP" color="text-emerald-400" />
            <StatPill icon={<Gem size={14}/>} val={profile?.diamonds} label="GEMS" color="text-blue-400" />
            <StatPill icon={<Star size={14}/>} val={profile?.level} label="LVL" color="text-amber-400" />
        </div>
      </div>

      {/* Navigation Onglets */}
      <div className="flex justify-center gap-2 p-6">
        <TabButton active={activeTab === 'login'} onClick={() => setActiveTab('login')} label="Calendrier" icon={<Calendar size={16}/>} />
        <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} label="Défis du Jour" icon={<Trophy size={16}/>} />
      </div>

      <div className="px-4 max-w-lg mx-auto">
        <AnimatePresence mode="wait">

          {/* --- ONGLET CONNEXION --- */}
          {activeTab === 'login' && (
            <motion.div key="login" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
              {/* Hero Card */}
              <div className="bg-gradient-to-br from-emerald-900/40 to-black p-6 rounded-[2rem] border border-emerald-500/20 text-center mb-8 relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                <h2 className="text-3xl font-black italic text-white mb-1">JOUR {rewardStatus.claimed ? rewardStatus.streak : rewardStatus.streak + 1}</h2>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest mb-6 font-bold">Série en cours</p>
                
                <button 
                    onClick={handleClaimDaily}
                    disabled={rewardStatus.claimed || claiming === true}
                    className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 ${
                        rewardStatus.claimed ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5' : 'bg-emerald-500 text-black shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:bg-emerald-400'
                    }`}
                >
                    {claiming === true ? <Loader2 className="animate-spin mx-auto"/> : rewardStatus.claimed ? "REVIENS DEMAIN" : "RÉCLAMER BONUS"}
                </button>
              </div>

              {/* Grille des 30 jours */}
              <div className="grid grid-cols-5 gap-2 pb-10">
                {rewardsConfig.map((day) => {
                    // Logique visuelle basée sur le streak ACTUEL
                    const isPast = day.day_number <= rewardStatus.streak;
                    const isNext = day.day_number === rewardStatus.streak + 1 && !rewardStatus.claimed;
                    const isMilestone = day.is_milestone;
                    
                    return (
                        <div key={day.day_number} className={`aspect-[4/5] rounded-xl border flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                            isPast ? 'bg-emerald-500/10 border-emerald-500/40 opacity-60' : 
                            isNext ? 'bg-white/10 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-105 z-10' : 
                            isMilestone ? 'bg-amber-500/10 border-amber-500/30' : 'bg-black/40 border-white/5'
                        }`}>
                            <span className="text-[7px] text-slate-500 absolute top-1 left-1.5 font-bold">J{day.day_number}</span>
                            
                            <div className="mb-1">
                                {day.reward_type === 'diamonds' ? <Gem size={18} className="text-blue-400"/> : 
                                 day.reward_type === 'cp' ? <Coins size={18} className="text-emerald-400"/> : 
                                 <Star size={18} className="text-amber-400"/>}
                            </div>
                            
                            <span className={`text-[9px] font-black ${isMilestone ? 'text-amber-400' : 'text-white'}`}>{day.amount}</span>
                            
                            {isPast && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-[1px]">
                                    <CheckCircle2 className="text-emerald-500" size={20}/>
                                </div>
                            )}
                        </div>
                    )
                })}
              </div>
            </motion.div>
          )}

          {/* --- ONGLET TÂCHES --- */}
          {activeTab === 'tasks' && (
            <motion.div key="tasks" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-3">
              {userTasks.length === 0 ? (
                <div className="text-center py-10 text-slate-600 font-bold italic text-xs">Aucune tâche disponible</div>
              ) : userTasks.map((task) => {
                const isCompleted = task.progress >= task.target_count;
                const percent = Math.min(100, (task.progress/task.target_count)*100);

                return (
                  <div key={task.code} className={`border p-4 rounded-2xl flex items-center gap-4 transition-all ${isCompleted && !task.is_claimed ? 'bg-gradient-to-r from-emerald-900/20 to-slate-900 border-emerald-500/30' : 'bg-slate-900/60 border-white/5'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-black border-white/5 text-slate-400'}`}>
                      {task.icon_name === 'Brain' ? <Brain size={20}/> : task.icon_name === 'Lock' ? <Lock size={20}/> : task.icon_name === 'Fingerprint' ? <Lock size={20}/> : <ShoppingBag size={20}/>}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1.5">
                        <h4 className="text-xs font-black uppercase italic text-slate-200 truncate pr-2">{task.description}</h4>
                        <span className={`text-[8px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${task.reward_type === 'diamonds' ? 'text-blue-400 bg-blue-400/10' : task.reward_type === 'cp' ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'}`}>
                          +{task.reward_amount} {task.reward_type === 'diamonds' ? '💎' : task.reward_type === 'cp' ? 'CP' : 'XP'}
                        </span>
                      </div>
                      
                      <div className="relative w-full h-2 bg-black rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-500 ease-out" style={{width: `${percent}%`}}/>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] text-slate-500 font-bold tracking-wider">PROGRESSION</span>
                        <span className="text-[8px] text-white font-mono">{task.progress} / {task.target_count}</span>
                      </div>
                    </div>

                    <button 
                        onClick={() => handleClaimTask(task.code)}
                        disabled={!isCompleted || task.is_claimed || claiming === task.code}
                        className={`h-9 px-3 rounded-lg font-black text-[9px] uppercase transition-all active:scale-95 ${task.is_claimed ? 'bg-transparent text-slate-600 border border-slate-700 cursor-default' : isCompleted ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse' : 'bg-white/5 text-slate-600'}`}
                    >
                        {claiming === task.code ? <Loader2 size={12} className="animate-spin"/> : task.is_claimed ? <CheckCheck size={16}/> : "RÉCLAMER"}
                    </button>
                  </div>
                )
              })}

              {/* --- Native Banner Adsterra --- */}  
              <div className="mt-4 mb-10 flex justify-center">
                <AdsterraNativeBanner />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// Composants UI Réutilisables
const StatPill = ({icon, val, label, color}: any) => (
  <div className={`bg-slate-900/80 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2.5 shadow-sm min-w-[80px] justify-center ${color}`}>
      {icon} <span className="text-sm font-black italic">{val?.toLocaleString() || 0}</span>
  </div>
);

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${active ? 'bg-white text-black shadow-lg scale-[1.02]' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>
      {icon} {label}
  </button>
);

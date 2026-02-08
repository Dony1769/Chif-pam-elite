"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Trophy, Calendar, CheckCircle2, Lock, Gift, Star, ChevronLeft, Coins, Gem, Loader2, Brain, ShoppingBag, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdsterraNativeBanner from "@/components/ads/AdsterraNativeBanner";

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
      supabase.from('tasks_config').select(`*, user_tasks_progress(progress, is_claimed)`)
    ]);

    const tasksFormatted = taskRes.data?.map((t: any) => {
        const prog = t.user_tasks_progress?.[0];   
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

  const handleClaimDaily = async () => {
    if (!profile) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc('claim_daily_login', { p_user_id: profile.id });
    if (error) alert("Erreur système");
    else if (!data.success) alert(data.message);
    else setProfile((prev: any) => ({
        ...prev,
        jetons_cp: data.new_cp,
        diamonds: data.new_diamonds,
        xp: data.new_xp,
        level: data.new_level,
        login_streak: data.new_streak,
        last_login_date: new Date().toISOString()
    }));
    setClaiming(false);
  };

  const handleClaimTask = async (taskCode: string) => {
    if (!profile) return;
    setClaiming(taskCode);
    const { data, error } = await supabase.rpc('claim_task_reward', { p_user_id: profile.id, p_task_code: taskCode });
    if (error) alert("Erreur système");
    else if (!data.success) alert(data.message);
    else {
      setProfile((prev: any) => ({
        ...prev,
        jetons_cp: data.new_cp,
        diamonds: data.new_diamonds,
        xp: data.new_xp,
        level: data.new_level
      }));
      setUserTasks(prev => prev.map(t =>
          t.code === taskCode ? { ...t, is_claimed: true } : t
      ));
    }
    setClaiming(false);
  };

  if (loading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  const currentStreak = profile?.login_streak || 0;
  const lastLogin = new Date(profile?.last_login_date);
  const today = new Date();
  const alreadyClaimedToday = lastLogin.toDateString() === today.toDateString();

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-emerald-500/30 pb-24">
      {/* Header Stats */}
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

      {/* Onglets */}
      <div className="flex justify-center gap-2 p-6">
        <TabButton active={activeTab === 'login'} onClick={() => setActiveTab('login')} label="Calendrier" icon={<Calendar size={16}/>} />
        <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} label="Défis du Jour" icon={<Trophy size={16}/>} />
      </div>

      <div className="px-4 max-w-lg mx-auto">
        <AnimatePresence mode="wait">

          {/* Onglet Calendrier */}
          {activeTab === 'login' && (
            <motion.div key="login" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
              {/* ... contenu calendrier ... */}
            </motion.div>
          )}

          {/* Onglet Tâches */}
          {activeTab === 'tasks' && (
            <motion.div key="tasks" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-3">
              {userTasks.length === 0 ? (
                <div className="text-center py-10 text-slate-600 font-bold italic text-xs">Aucune tâche disponible</div>
              ) : userTasks.map((task) => {
                const isCompleted = task.progress >= task.target_count;
                const percent = Math.min(100, (task.progress/task.target_count)*100);

                return (
                  <div key={task.code} className={`border p-4 rounded-2xl flex items-center gap-4 transition-all ${isCompleted && !task.is_claimed ? 'bg-gradient-to-r from-emerald-900/20 to-slate-900 border-emerald-500/30' : 'bg-slate-900/60 border-white/5'}`}>
                    {/* ... contenu tâche ... */}
                  </div>
                )
              })}

              {/* --- Native Banner Adsterra --- */}
              <AdsterraNativeBanner />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

const StatPill = ({icon, val, label, color}: any) => (
  <div className={`bg-slate-900/80 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2.5 shadow-sm min-w-[80px] justify-center ${color}`}>
      {icon} <span className="text-sm font-black italic">{val?.toLocaleString() || 0}</span>
  </div>
);

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
      active ? 'bg-white text-black shadow-lg scale-[1.02]' : 'bg-white/5 text-slate-500 hover:bg-white/10'
  }`}>
      {icon} {label}
  </button>
);

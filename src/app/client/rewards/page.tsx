"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
// Ajout des icônes pour les tâches (TrendingUp, Bomb, etc.)
import { Trophy, Calendar, CheckCircle2, Lock, Star, ChevronLeft, Coins, Gem, Loader2, Brain, ShoppingBag, CheckCheck, TrendingUp, Bomb, ArrowDownCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ExoClickBanner from "@/components/ads/ExoClickBanner"; 

export default function RewardsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'tasks'>('login');
  const [loading, setLoading] = useState(true);
  
  // Données
  const [rewardsConfig, setRewardsConfig] = useState<any[]>([]); // Calendrier
  const [userTasks, setUserTasks] = useState<any[]>([]); // Tâches du jour
  const [claimedDays, setClaimedDays] = useState<number[]>([]); 
  
  // États d'action
  const [claiming, setClaiming] = useState(false); // Pour le calendrier
  const [claimingTask, setClaimingTask] = useState<string | null>(null); // Pour une tâche spécifique
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const router = useRouter();

  // Calcul dynamique des jours du mois
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); 
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayDayNumber = currentDate.getDate();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/connexion');

    // 1. Profil & Config Calendrier
    const [profRes, rewRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('daily_rewards_config').select('*').lte('day_number', daysInMonth).order('day_number', { ascending: true })
    ]);

    setProfile(profRes.data);
    setRewardsConfig(rewRes.data || []);

    // 2. Calendrier : Jours déjà réclamés
    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString();
    const { data: claims } = await supabase
      .from('user_calendar_claims')
      .select('day_number')
      .eq('user_id', user.id)
      .gte('claim_date', startOfMonth)
      .lte('claim_date', endOfMonth);

    if (claims) setClaimedDays(claims.map(c => c.day_number));

    // 3. TÂCHES : Récupérer ou Générer les missions aléatoires (RPC)
    // C'est ici qu'on appelle la nouvelle fonction SQL qu'on a créée
    const { data: missions } = await supabase.rpc('get_or_create_daily_missions', { p_user_id: user.id });
    setUserTasks(missions || []);

    setLoading(false);
  };

  // --- CALENDRIER (Logique existante) ---
  const handleClaim = async () => {
    if (!profile || claiming || claimedDays.includes(todayDayNumber)) return;
    setClaiming(true);

    try {
      const { data, error } = await supabase.rpc('claim_calendar_reward', { p_user_id: profile.id });
      if (error) throw error;
      if (!data.success) {
        alert(data.message);
      } else {
        setProfile((prev: any) => ({
          ...prev,
          jetons_cp: data.new_cp,
          diamonds: data.new_diamonds,
          xp: data.new_xp
        }));
        setClaimedDays(prev => [...prev, todayDayNumber]);
        new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3").play().catch(()=>{});
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setClaiming(false);
    }
  };

  // --- TÂCHES (Nouvelle Logique) ---
  const handleClaimTask = async (missionId: string, rewardType: string, amount: number) => {
    if (!profile || claimingTask) return;
    setClaimingTask(missionId);
    
    try {
        // 1. Marquer la mission comme réclamée
        const { error } = await supabase
            .from('user_daily_missions')
            .update({ is_claimed: true })
            .eq('id', missionId)
            .eq('user_id', profile.id);

        if (error) throw error;

        // 2. Donner la récompense au joueur
        let updates: any = {};
        if (rewardType === 'cp') updates.jetons_cp = (profile.jetons_cp || 0) + amount;
        else if (rewardType === 'diamonds') updates.diamonds = (profile.diamonds || 0) + amount;
        else if (rewardType === 'xp') updates.xp = (profile.xp || 0) + amount;

        const { error: profileError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profile.id);

        if (profileError) throw profileError;

        // 3. Update UI local
        setProfile({ ...profile, ...updates });
        setUserTasks(prev => prev.map(t => t.id === missionId ? { ...t, is_claimed: true } : t));
        
        // Son victoire
        new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3").play().catch(()=>{});

    } catch (err: any) {
        alert("Erreur: " + err.message);
    } finally {
        setClaimingTask(null);
    }
  };

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  if (loading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

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

      <div className="flex justify-center gap-2 p-6">
        <TabButton active={activeTab === 'login'} onClick={() => setActiveTab('login')} label="Calendrier" icon={<Calendar size={16}/>} />
        <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} label="Défis du Jour" icon={<Trophy size={16}/>} />
      </div>

      <div className="px-4 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          
          {/* --- ONGLET CALENDRIER --- */}
          {activeTab === 'login' && (
            <motion.div key="login" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
              
              <div className="flex justify-between items-end mb-4 px-2">
                <div>
                    <h2 className="text-2xl font-black italic text-white uppercase">{monthNames[currentMonth]}</h2>
                    <p className="text-[10px] text-slate-500 font-bold tracking-widest">{currentYear}</p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-black text-emerald-500">{todayDayNumber}</p>
                    <p className="text-[9px] text-emerald-500/60 font-bold uppercase">Aujourd'hui</p>
                </div>
              </div>

              <div className="mb-8">
                 {!claimedDays.includes(todayDayNumber) ? (
                    <button 
                        onClick={handleClaim}
                        disabled={claiming}
                        className="w-full py-4 bg-emerald-500 text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse hover:scale-[1.02] transition-transform"
                    >
                        {claiming ? <Loader2 className="animate-spin mx-auto"/> : `RÉCLAMER CADEAU DU ${todayDayNumber}`}
                    </button>
                 ) : (
                    <div className="w-full py-4 bg-white/5 border border-white/5 rounded-2xl text-center">
                        <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest flex items-center justify-center gap-2">
                            <CheckCircle2 size={14}/> Récompense du jour récupérée
                        </p>
                    </div>
                 )}
              </div>

              <div className="grid grid-cols-7 gap-2 pb-10">
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                    const isToday = dayNum === todayDayNumber;
                    const isPast = dayNum < todayDayNumber;
                    const isClaimed = claimedDays.includes(dayNum);
                    const dayConfig = rewardsConfig.find(r => r.day_number === dayNum);
                    const isMilestone = dayConfig?.is_milestone;

                    return (
                        <div key={dayNum} className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                            isToday 
                                ? (isClaimed ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/10 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] z-10 scale-110')
                                : isClaimed 
                                    ? 'bg-emerald-900/20 border-emerald-500/20 opacity-60'
                                    : isPast 
                                        ? 'bg-rose-500/5 border-rose-500/20 opacity-40 grayscale'
                                        : 'bg-black/40 border-white/5'
                        }`}>
                            <span className={`text-[8px] absolute top-1 left-1.5 font-bold ${isToday ? 'text-emerald-400' : 'text-slate-600'}`}>{dayNum}</span>
                            <div className="mb-0.5 scale-75">
                                {dayConfig?.reward_type === 'diamonds' ? <Gem size={16} className="text-blue-400"/> : 
                                 dayConfig?.reward_type === 'cp' ? <Coins size={16} className="text-emerald-400"/> : 
                                 <Star size={16} className="text-amber-400"/>}
                            </div>
                            <span className={`text-[8px] font-black ${isMilestone ? 'text-amber-400' : 'text-slate-300'}`}>{dayConfig?.amount || '?'}</span>
                            {isClaimed && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><CheckCheck className="text-emerald-500" size={16}/></div>}
                            {isPast && !isClaimed && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Lock className="text-rose-500/50" size={14}/></div>}
                        </div>
                    );
                })}
              </div>
              
              <div className="mt-4 mb-10 flex justify-center"><ExoClickBanner /></div>
            </motion.div>
          )}

          {/* --- ONGLET TÂCHES (MIS À JOUR) --- */}
          {activeTab === 'tasks' && (
            <motion.div key="tasks" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-3">
               
               {userTasks.length === 0 ? (
                 <div className="text-center py-10 opacity-50 text-xs flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-emerald-500"/>
                    <p>Chargement des missions...</p>
                 </div>
               ) : userTasks.map(t => {
                   const isCompleted = t.progress >= t.target_count;
                   const percent = Math.min(100, (t.progress / t.target_count) * 100);
                   
                   // Choix de l'icône selon ce qui est renvoyé par la DB
                   let Icon = Trophy;
                   if (t.icon_name === 'TrendingUp') Icon = TrendingUp;
                   if (t.icon_name === 'Bomb') Icon = Bomb;
                   if (t.icon_name === 'ArrowDownCircle') Icon = ArrowDownCircle;

                   return (
                      <div key={t.id} className={`border p-4 rounded-2xl flex items-center gap-4 transition-all ${isCompleted && !t.is_claimed ? 'bg-gradient-to-r from-emerald-900/20 to-slate-900 border-emerald-500/30' : 'bg-slate-900/60 border-white/5'}`}>
                        {/* Icone */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-black border-white/5 text-slate-400'}`}>
                          <Icon size={20}/>
                        </div>
                        
                        {/* Info & Barre */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1.5">
                            <h4 className="text-xs font-black uppercase italic text-slate-200 truncate pr-2">{t.description}</h4>
                            <span className={`text-[8px] px-2 py-0.5 rounded font-bold whitespace-nowrap flex items-center gap-1 ${t.reward_type === 'diamonds' ? 'text-blue-400 bg-blue-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>
                              +{t.reward_amount} {t.reward_type.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="relative w-full h-2 bg-black rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-500 ease-out" style={{width: `${percent}%`}}/>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[8px] text-slate-500 font-bold tracking-wider">PROGRESSION</span>
                            <span className="text-[8px] text-white font-mono">{t.progress} / {t.target_count}</span>
                          </div>
                        </div>

                        {/* Bouton Action */}
                        <button 
                            onClick={() => handleClaimTask(t.id, t.reward_type, t.reward_amount)}
                            disabled={!isCompleted || t.is_claimed || claimingTask === t.id}
                            className={`h-9 px-3 rounded-lg font-black text-[9px] uppercase transition-all active:scale-95 flex items-center justify-center ${
                                t.is_claimed 
                                ? 'bg-transparent text-slate-600 border border-slate-700 cursor-default' 
                                : isCompleted 
                                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse' 
                                    : 'bg-white/5 text-slate-600'
                            }`}
                        >
                            {claimingTask === t.id ? <Loader2 size={12} className="animate-spin"/> : t.is_claimed ? <CheckCheck size={16}/> : "RÉCLAMER"}
                        </button>
                      </div>
                   )
               })}
               
               <div className="mt-6 flex justify-center w-full overflow-hidden rounded-xl">
                  <ExoClickBanner />
               </div>
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
  <button onClick={onClick} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${active ? 'bg-white text-black shadow-lg scale-[1.02]' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>
      {icon} {label}
  </button>
);


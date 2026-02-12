"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Trophy, Calendar, CheckCircle2, Lock, Gift, Star, ChevronLeft, Coins, Gem, Loader2, Brain, ShoppingBag, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// --- IMPORT DE LA PUBLICITÉ ---
import ExoClickBanner from "@/components/ads/ExoClickBanner"; 

export default function RewardsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'tasks'>('login');
  const [loading, setLoading] = useState(true);
  const [rewardsConfig, setRewardsConfig] = useState<any[]>([]);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [claiming, setClaiming] = useState<boolean>(false);
  
  // État local pour forcer l'affichage immédiat après clic
  const [localClaimed, setLocalClaimed] = useState(false);

  const router = useRouter();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/connexion');

    // On récupère les données
    const [profRes, rewRes, taskRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('daily_rewards_config').select('*').order('day_number', { ascending: true }),
      supabase.from('tasks_config').select(`*, user_tasks_progress(progress, is_claimed)`)
    ]);

    if (profRes.data) {
        setProfile(profRes.data);
        // Vérifie si la date de DERNIÈRE RÉCLAMATION est aujourd'hui
        if (profRes.data.last_reward_claim) {
            const lastDate = new Date(profRes.data.last_reward_claim);
            const today = new Date();
            if (lastDate.toDateString() === today.toDateString()) {
                setLocalClaimed(true);
            }
        }
    }

    setRewardsConfig(rewRes.data || []);
    
    const tasksFormatted = taskRes.data?.map((t: any) => {
        const prog = t.user_tasks_progress?.[0];
        return {
            ...t,
            progress: prog?.progress || 0,
            is_claimed: prog?.is_claimed || false
        };
    }) || [];
    
    setUserTasks(tasksFormatted);
    setLoading(false);
  };

  const handleClaimDaily = async () => {
    if (!profile || claiming || localClaimed) return;
    setClaiming(true);
    
    try {
        console.log("Tentative de réclamation pour:", profile.id);

        // Appel RPC
        const { data, error } = await supabase.rpc('claim_daily_reward_v2', { p_user_id: profile.id });
        
        if (error) {
            console.error("Erreur RPC:", error);
            alert("Erreur technique: " + error.message);
            throw error;
        }
        
        if (!data.success) {
            alert(data.message); // Message: "Déjà réclamé"
            setLocalClaimed(true);
        } else {
            // SUCCÈS
            setLocalClaimed(true); // Bloque le bouton immédiatement
            
            // Mise à jour du profil local avec les nouvelles valeurs renvoyées par le RPC
            setProfile((prev: any) => ({
                ...prev,
                jetons_cp: data.new_cp,
                diamonds: data.new_diamonds,
                xp: data.new_xp,
                level: data.new_level, // Au cas où on level up
                login_streak: data.new_streak,
                last_reward_claim: new Date().toISOString()
            }));

            // Son de victoire
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3");
            audio.volume = 0.5;
            audio.play().catch(()=>{});
        }
    } catch (err: any) {
        console.error("Catch Error:", err);
    } finally {
        setClaiming(false);
    }
  };

  // Calcul du jour à afficher
  // Si déjà réclamé : On montre le jour actuel (ex: Jour 1)
  // Si pas encore réclamé : On montre le jour SUIVANT le streak actuel (ex: 0 + 1 = Jour 1)
  const displayStreak = localClaimed ? profile?.login_streak : (profile?.login_streak || 0) + 1;

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
                
                <h2 className="text-3xl font-black italic text-white mb-1">JOUR {displayStreak}</h2>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest mb-6 font-bold">Série en cours</p>
                
                <button 
                    onClick={handleClaimDaily}
                    disabled={localClaimed || claiming}
                    className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                        localClaimed 
                        ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5' 
                        : 'bg-emerald-500 text-black shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:bg-emerald-400'
                    }`}
                >
                    {claiming ? <Loader2 className="animate-spin" size={18}/> : localClaimed ? "REVIENS DEMAIN" : "RÉCLAMER BONUS"}
                </button>
              </div>

              {/* Grille des 30 jours */}
              <div className="grid grid-cols-5 gap-2 pb-10">
                {rewardsConfig.map((day) => {
                    // Calcul précis pour l'affichage visuel
                    // Passé : Jours inférieurs au streak actuel
                    const isPast = day.day_number <= profile?.login_streak;
                    // Futur immédiat (Le jour à réclamer) : Égal au streak + 1 (si pas encore réclamé)
                    const isNext = !localClaimed && day.day_number === (profile?.login_streak || 0) + 1;
                    const isMilestone = day.is_milestone;
                    
                    return (
                        <div key={day.day_number} className={`aspect-[4/5] rounded-xl border flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                            isPast ? 'bg-emerald-500/10 border-emerald-500/40 opacity-60' : 
                            isNext ? 'bg-white/10 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-105 z-10 animate-pulse' : 
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
               {userTasks.length === 0 ? <div className="text-center py-10 opacity-50 text-xs">Aucune tâche</div> : userTasks.map(t => (
                   <div key={t.id} className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                       <p className="text-xs font-bold">{t.description}</p>
                       <div className="flex justify-between items-center mt-2">
                           <span className="text-[10px] text-emerald-400">+{t.reward_amount} {t.reward_type}</span>
                           <span className="text-[10px] text-slate-500">{t.progress}/{t.target_count}</span>
                       </div>
                   </div>
               ))}
               
               {/* BANNIÈRE PUBLICITAIRE */}
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

// Composants UI
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

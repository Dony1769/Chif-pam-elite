"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Users, Timer, ChevronRight, 
  Zap, Brain, Lock, Loader2, ChevronLeft,
  Crown, TrendingUp, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'sonner'; // Installateur: npm install sonner

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
    
    // --- REALTIME NOTIFICATION & UPDATE ---
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'challenges' },
        (payload) => {
          toast.success("NOUVEAU DÉFI PUBLIÉ !", {
            description: payload.new.title,
            icon: <Bell className="text-emerald-500" />,
            style: { background: '#020617', border: '1px solid #10b981', color: '#fff' }
          });
          setChallenges(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/auth/login');

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: challs } = await supabase.from('challenges')
      .select('*, challenge_entries(count)')
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    setProfile(prof);
    setChallenges(challs || []);
    setLoading(false);
  };

  const calculateEntryFee = (baseFee: number) => {
    if (profile?.vip_status === 'monthly') return baseFee * 0.75;
    if (profile?.vip_status === 'weekly') return baseFee * 0.90;
    return baseFee;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
        <div className="absolute inset-0 blur-xl bg-emerald-500/20 animate-pulse" />
      </div>
      <p className="text-[10px] text-emerald-500 font-black italic uppercase tracking-[0.5em]">Initialisation Arena</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-black italic uppercase selection:bg-emerald-500 selection:text-black">
      <Toaster position="top-center" expand={true} />
      
      {/* HEADER PREMIUM */}
      <div className="flex items-center justify-between mb-12">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/client/home')}
          className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md"
        >
          <ChevronLeft size={20} />
        </motion.button>
        <div className="text-right">
          <h1 className="text-3xl tracking-tighter leading-none italic font-black">
            ARENA <span className="text-emerald-500">CHALLENGE</span>
          </h1>
          <p className="text-[7px] text-slate-500 tracking-[0.4em] mt-1">ÉLITE UNIQUEMENT</p>
        </div>
      </div>

      {/* VIP STATUS CARD */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 p-6 rounded-[2.5rem] mb-10 flex justify-between items-center"
      >
        <div>
          <p className="text-[8px] text-emerald-500 mb-1 tracking-widest">VOTRE PRIVILÈGE</p>
          <div className="flex items-center gap-2">
            <Crown size={20} className={profile?.vip_status !== 'free' ? "text-amber-400" : "text-slate-600"} />
            <p className="text-xl tracking-tighter">{profile?.vip_status === 'free' ? 'MEMBRE STANDARD' : `MEMBRE ${profile?.vip_status}`}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-slate-500 mb-1">RÉDUCTION</p>
          <p className="text-emerald-500 text-xl font-black">
            {profile?.vip_status === 'monthly' ? '-25%' : profile?.vip_status === 'weekly' ? '-10%' : '0%'}
          </p>
        </div>
      </motion.div>

      {/* CHALLENGES LIST */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {challenges.map((ch, i) => {
            const fee = calculateEntryFee(ch.entry_fee);
            return (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative bg-[#0a0f1e] border border-white/5 rounded-[3rem] p-7 overflow-hidden hover:border-emerald-500/30 transition-all duration-500"
              >
                {/* Background Glow */}
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-emerald-500/5 blur-[100px] group-hover:bg-emerald-500/10 transition-all" />

                <div className="flex justify-between items-start mb-8">
                  <div className="flex gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500">
                      {ch.game_type === 'quiz' ? <Brain className="text-blue-400" /> : ch.game_type === 'biometric' ? <Zap className="text-emerald-400" /> : <Lock className="text-amber-400" />}
                    </div>
                    <div>
                      <h3 className="text-lg tracking-tight leading-none mb-2">{ch.title}</h3>
                      <div className="flex items-center gap-2 bg-white/5 w-fit px-3 py-1 rounded-full border border-white/5">
                        <Users size={12} className="text-emerald-500" />
                        <span className="text-[8px] text-slate-400">{ch.challenge_entries?.[0]?.count || 0} PARTICIPANTS</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] text-slate-500 tracking-widest mb-1">GRAND PRIX</p>
                    <p className="text-2xl text-emerald-500 font-black">{ch.prize_pool} <span className="text-[10px]">HTG</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                   <div className="bg-black/40 p-5 rounded-[2rem] border border-white/5">
                      <p className="text-[7px] text-slate-500 mb-2 uppercase">Entrée</p>
                      <p className="text-lg font-black text-white">{fee.toFixed(0)} <span className="text-[10px] text-slate-500">HTG</span></p>
                   </div>
                   <div className="bg-black/40 p-5 rounded-[2rem] border border-white/5">
                      <p className="text-[7px] text-slate-500 mb-2 uppercase">Temps Restant</p>
                      <p className="text-xs text-rose-500 animate-pulse flex items-center gap-2">
                        <Timer size={14} /> CLÔTURE BIENTÔT
                      </p>
                   </div>
                </div>

                <button 
                  onClick={() => router.push(`/client/${ch.game_type === 'biometric' ? 'biometric-hack' : ch.game_type === 'quiz' ? 'quiz' : 'laser-vault'}?challengeId=${ch.id}`)}
                  className="w-full py-6 bg-white text-black rounded-[2.2rem] font-black text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98]"
                >
                  DÉMARRER LA MISSION <ChevronRight size={18} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

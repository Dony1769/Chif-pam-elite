"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Trophy, Zap, Brain, Lock, Loader2, ChevronLeft, Crown, Coins, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ArenaPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
    // Ecoute globale : si quelqu'un joue, le compteur de participants ou les scores changent
    const channel = supabase.channel('arena_main_hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_attempts' }, () => fetchData())
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/connexion');

    const [pRes, cRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('challenges')
        .select(`
          *,
          challenge_attempts (
            user_id,
            total_score
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    ]);

    setProfile(pRes.data);
    setChallenges(cRes.data || []);
    setLoading(false);
  };

  // Calcul des frais d'entrée en CP selon le rang VIP
  const calculateEntryFeeCP = (baseCP: number) => {
    if (profile?.vip_status === 'monthly') return Math.floor(baseCP * 0.70); // -30%
    if (profile?.vip_status === 'weekly') return Math.floor(baseCP * 0.85);  // -15%
    return baseCP;
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40}/></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-4xl tracking-tighter italic">ARENA <span className="text-emerald-500">MISSIONS</span></h1>
      </div>

      {/* CP HUD */}
      <div className="flex justify-between items-center mb-10 bg-white/5 p-5 rounded-[2rem] border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500">
            <Coins size={20}/>
          </div>
          <div>
            <p className="text-[8px] text-slate-500 tracking-[0.3em]">SOLDE JETONS CP</p>
            <p className="text-xl leading-none text-emerald-500">{profile?.jetons_cp?.toLocaleString()} <span className="text-[10px]">CP</span></p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-slate-500 tracking-[0.3em]">UNITÉ VIP</p>
          <p className={`flex items-center gap-2 justify-end ${profile?.vip_status !== 'free' ? 'text-amber-400' : 'text-slate-400'}`}>
             {profile?.vip_status !== 'free' && <Crown size={14} className="fill-current"/>}
             {profile?.vip_status || 'RECRUE'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {challenges.map((ch) => {
          const entryPriceCP = calculateEntryFeeCP(ch.entry_fee_cp_base);
          
          // NOUVELLE LOGIQUE : 
          // Grâce à la contrainte UNIQUE SQL, .length donne exactement le nombre de participants uniques.
          const participantsCount = ch.challenge_attempts?.length || 0;
          
          // On trouve mon score directement
          const myAttempt = ch.challenge_attempts?.find((a: any) => a.user_id === profile.id);
          const myTotalScore = myAttempt ? myAttempt.total_score : 0;

          return (
            <motion.div key={ch.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-emerald-500">
                    {ch.game_type === 'quiz' ? <Brain size={24}/> : ch.game_type === 'biometric' ? <Zap size={24}/> : <Lock size={24}/>}
                  </div>
                  <div>
                    <h3 className="text-lg tracking-tight leading-none">{ch.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                       <span className="flex items-center gap-1 text-[8px] text-slate-500"><Users size={10}/> {participantsCount}/{ch.max_participants}</span>
                       <span className="text-[8px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase">
                         MON CUMUL: {myTotalScore}
                       </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl text-emerald-500">{ch.prize_pool_cp} <span className="text-[10px]">CP</span></p>
                  <p className="text-[7px] text-slate-500 tracking-widest">CAGNOTTE CP</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  const routes: any = { quiz: 'quiz', biometric: 'biometric-hack', vault: 'laser-vault' };
                  router.push(`/client/${routes[ch.game_type]}?challengeId=${ch.id}&fee=${entryPriceCP}`);
                }}
                disabled={profile?.jetons_cp < entryPriceCP}
                className={`w-full py-5 rounded-[1.8rem] font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${profile?.jetons_cp < entryPriceCP ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:bg-emerald-500'}`}
              >
                {profile?.jetons_cp < entryPriceCP ? "SOLDE CP INSUFFISANT" : `PAYER ${entryPriceCP} CP & ENTRER`} <Zap size={16} fill={profile?.jetons_cp < entryPriceCP ? "none" : "black"}/>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

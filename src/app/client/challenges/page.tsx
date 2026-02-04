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
  const [isEntering, setIsEntering] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
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
        .select('*, challenge_attempts (user_id, total_score)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    ]);

    setProfile(pRes.data);
    setChallenges(cRes.data || []);
    setLoading(false);
  };

  const calculateEntryFeeCP = (baseCP: number) => {
    if (profile?.vip_status === 'monthly') return Math.floor(baseCP * 0.70);
    if (profile?.vip_status === 'weekly') return Math.floor(baseCP * 0.85);
    return baseCP;
  };

  // --- FONCTION CRUCIALE : INSCRIPTION ET PAIEMENT ---
  const handleEntry = async (challenge: any) => {
    const fee = calculateEntryFeeCP(challenge.entry_fee_cp_base);
    if (profile.jetons_cp < fee) return alert("SOLDE CP INSUFFISANT");
    
    setIsEntering(challenge.id);

    try {
      // 1. Déduction des CP
      const { error: payError } = await supabase
        .from('profiles')
        .update({ jetons_cp: profile.jetons_cp - fee })
        .eq('id', profile.id);

      if (payError) throw payError;

      // 2. Inscription ou incrémentation (UPSERT)
      // On utilise le "ON CONFLICT" géré par Supabase sur (challenge_id, user_id)
      const { error: attemptError } = await supabase.rpc('increment_challenge_attempt', {
         target_challenge_id: challenge.id,
         target_user_id: profile.id
      });

      // Si le RPC n'est pas encore créé, on fait un upsert manuel :
      if (attemptError) {
          const { data: existing } = await supabase
            .from('challenge_attempts')
            .select('attempts_count')
            .eq('challenge_id', challenge.id)
            .eq('user_id', profile.id)
            .single();

          await supabase.from('challenge_attempts').upsert({
            challenge_id: challenge.id,
            user_id: profile.id,
            attempts_count: (existing?.attempts_count || 0) + 1
          }, { onConflict: 'challenge_id,user_id' });
      }

      // 3. Redirection vers le jeu
      const routes: any = { quiz: 'quiz', biometric: 'biometric-hack', vault: 'laser-vault' };
      router.push(`/client/${routes[challenge.game_type]}?challengeId=${challenge.id}`);

    } catch (err: any) {
      console.error(err);
      alert("Erreur transactionnelle Arena");
      setIsEntering(null);
    }
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

      <div className="flex justify-between items-center mb-10 bg-white/5 p-5 rounded-[2rem] border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500">
            <Coins size={20}/>
          </div>
          <div>
            <p className="text-[8px] text-slate-500 tracking-[0.3em]">SOLDE JETONS CP</p>
            <p className="text-xl leading-none text-emerald-500">{profile?.jetons_cp?.toLocaleString()} CP</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-slate-500 tracking-[0.3em]">STATUT</p>
          <p className="text-amber-400 text-xs">{profile?.vip_status || 'RECRUE'}</p>
        </div>
      </div>

      <div className="space-y-6">
        {challenges.map((ch) => {
          const entryPriceCP = calculateEntryFeeCP(ch.entry_fee_cp_base);
          const participantsCount = ch.challenge_attempts?.length || 0;
          const myAttempt = ch.challenge_attempts?.find((a: any) => a.user_id === profile.id);

          return (
            <motion.div key={ch.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-emerald-500 text-xl">
                    {ch.game_type === 'quiz' ? <Brain /> : <Zap />}
                  </div>
                  <div>
                    <h3 className="text-lg leading-none">{ch.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                       <span className="flex items-center gap-1 text-[8px] text-slate-500"><Users size={10}/> {participantsCount} UNITÉS</span>
                       <span className="text-[8px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                         MON SCORE: {myAttempt?.total_score || 0}
                       </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl text-emerald-500 font-black">{ch.prize_pool_cp} CP</p>
                  <p className="text-[7px] text-slate-500 tracking-widest uppercase text-right">Cagnotte</p>
                </div>
              </div>

              <button 
                onClick={() => handleEntry(ch)}
                disabled={profile?.jetons_cp < entryPriceCP || isEntering === ch.id}
                className={`w-full py-5 rounded-[1.8rem] font-black flex items-center justify-center gap-3 transition-all ${
                    profile?.jetons_cp < entryPriceCP ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black hover:bg-emerald-500'
                }`}
              >
                {isEntering === ch.id ? <Loader2 className="animate-spin" /> : <>PAYER {entryPriceCP} CP & ENTRER <Zap size={16} fill="currentColor"/></>}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

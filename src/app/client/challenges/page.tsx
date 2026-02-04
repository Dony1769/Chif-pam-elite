"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Trophy, Zap, Brain, Lock, Loader2, ChevronLeft, Crown, Coins, Users, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ArenaPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [entryLoading, setEntryLoading] = useState<string | null>(null);
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
        .select(`*, challenge_attempts (user_id, total_score, attempts_count)`)
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

  const handleEntry = async (challenge: any, fee: number) => {
    if (profile.jetons_cp < fee) return alert("Pas assez de CP");
    setEntryLoading(challenge.id);

    try {
      // 1. Déduction des Jetons
      const { error: payError } = await supabase
        .from('profiles')
        .update({ jetons_cp: profile.jetons_cp - fee })
        .eq('id', profile.id);
      if (payError) throw payError;

      // 2. Inscription / Incrémentation (UPSERT)
      // On s'assure que la ligne existe pour que l'admin et le rang voient le joueur
      const { error: attError } = await supabase
        .from('challenge_attempts')
        .upsert({ 
          challenge_id: challenge.id, 
          user_id: profile.id,
          last_attempt_at: new Date().toISOString()
        }, { onConflict: 'challenge_id,user_id' });
      if (attError) throw attError;

      // 3. Redirection
      const routes: any = { quiz: 'quiz', biometric: 'biometric-hack', vault: 'laser-vault' };
      router.push(`/client/${routes[challenge.game_type]}?challengeId=${challenge.id}`);
    } catch (err: any) {
      alert("Erreur: " + err.message);
      setEntryLoading(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40}/></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-4xl tracking-tighter">ARENA <span className="text-emerald-500">MISSIONS</span></h1>
      </div>

      <div className="flex justify-between items-center mb-10 bg-white/5 p-5 rounded-[2rem] border border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><Coins size={20}/></div>
          <div>
            <p className="text-[8px] text-slate-500 tracking-widest">SOLDE CP</p>
            <p className="text-xl text-emerald-500">{profile?.jetons_cp?.toLocaleString()} CP</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {challenges.map((ch) => {
          const fee = calculateEntryFeeCP(ch.entry_fee_cp_base);
          const participants = ch.challenge_attempts?.length || 0;
          const myScore = ch.challenge_attempts?.find((a:any) => a.user_id === profile.id)?.total_score || 0;

          return (
            <motion.div key={ch.id} className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6">
              <div className="flex justify-between mb-6">
                <div>
                  <h3 className="text-lg">{ch.title}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">{participants} PARTICIPANTS | SCORE: {myScore}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl text-emerald-500">{ch.prize_pool_cp} CP</p>
                </div>
              </div>
              <button 
                onClick={() => handleEntry(ch, fee)}
                disabled={profile?.jetons_cp < fee || entryLoading === ch.id}
                className="w-full py-5 bg-white text-black rounded-3xl font-black disabled:opacity-30"
              >
                {entryLoading === ch.id ? <Loader2 className="animate-spin mx-auto"/> : `ENTRER (${fee} CP)`}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

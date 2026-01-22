"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Medal, ChevronLeft, Loader2, Star, Target, Zap, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function RankPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveChallenges();
  }, []);

  const fetchActiveChallenges = async () => {
    const { data } = await supabase.from('challenges').select('*').eq('is_active', true);
    if (data && data.length > 0) {
      setChallenges(data);
      setSelectedId(data[0].id);
      fetchBoard(data[0].id);
    }
    setLoading(false);
  };

  const fetchBoard = async (id: string) => {
    const { data } = await supabase
      .from('challenge_entries')
      .select(`total_score, attempts_count, profiles(username, avatar_url, vip_status)`)
      .eq('challenge_id', id)
      .order('total_score', { ascending: false });
    setLeaderboard(data || []);
  };

  if (loading) return <div className="min-h-screen bg-[#050508] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#050508] text-white p-6 pb-32 font-black italic uppercase">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10"><ChevronLeft/></button>
        <h1 className="text-xl text-emerald-500 tracking-tighter">CLASSEMENT DES ÉLITES</h1>
      </div>

      {/* SELECTEUR DE DÉFI PREMIUM */}
      <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar">
        {challenges.map(c => (
          <button 
            key={c.id} 
            onClick={() => { setSelectedId(c.id); fetchBoard(c.id); }}
            className={`flex-shrink-0 px-6 py-3 rounded-2xl border text-[10px] transition-all ${selectedId === c.id ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/10 text-slate-400'}`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* LISTE DES RANGS */}
      <div className="space-y-3">
        {leaderboard.map((entry, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            key={i} className={`flex items-center justify-between p-5 rounded-[2rem] border ${i === 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5'}`}
          >
            <div className="flex items-center gap-4">
              <span className={`text-lg ${i < 3 ? 'text-emerald-500' : 'text-slate-600'}`}>#{i + 1}</span>
              <div>
                <p className="text-xs flex items-center gap-2">
                    {entry.profiles.username}
                    {entry.profiles.vip_status !== 'free' && <Star size={10} className="fill-emerald-500 text-emerald-500"/>}
                </p>
                <p className="text-[7px] text-slate-500">{entry.attempts_count} TENTATIVES</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl text-emerald-500">{entry.total_score}</p>
              <p className="text-[7px] text-slate-500 tracking-widest">PTS CUMULÉS</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

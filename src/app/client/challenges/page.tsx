"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Brain, Fingerprint, Lock, Users, ChevronRight, Trophy, Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const GAME_MAP: any = {
  'quiz': { icon: <Brain className="text-blue-400"/>, name: 'Elite Quiz', color: 'from-blue-500/20' },
  'biometric-hack': { icon: <Fingerprint className="text-emerald-400"/>, name: 'Bio Hack', color: 'from-emerald-500/20' },
  'laser-vault': { icon: <Lock className="text-indigo-400"/>, name: 'Laser Vault', color: 'from-indigo-500/20' }
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    const { data } = await supabase
      .from('challenges')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    setChallenges(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase">
      <div className="p-6 flex justify-between items-center">
        <h1 className="text-xl tracking-tighter">Défis <span className="text-emerald-500">Actifs</span></h1>
        <button className="p-2 bg-emerald-500 text-black rounded-full"><Plus size={20}/></button>
      </div>

      <div className="p-6 space-y-4">
        {loading ? <Loader2 className="animate-spin mx-auto text-emerald-500" /> : 
         challenges.map((ch) => (
          <motion.div 
            key={ch.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push(`/client/${ch.game_id}?challenge=${ch.id}`)}
            className={`p-5 rounded-[2rem] bg-gradient-to-br ${GAME_MAP[ch.game_id].color} border border-white/5 flex items-center justify-between`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                {GAME_MAP[ch.game_id].icon}
              </div>
              <div>
                <h3 className="text-xs tracking-tight">{GAME_MAP[ch.game_id].name}</h3>
                <div className="flex items-center gap-2 mt-1">
                   <Users size={10} className="text-slate-500" />
                   <span className="text-[9px] text-slate-500">{ch.current_participants}/{ch.max_participants} JOUEURS</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-emerald-500 text-sm tracking-tighter">{ch.prize_pool} HTG</p>
              <p className="text-[8px] text-slate-500">PRIX TOTAL</p>
            </div>
          </motion.div>
        ))}

        {challenges.length === 0 && (
          <div className="text-center py-20 opacity-30">
            <Trophy size={48} className="mx-auto mb-4" />
            <p className="text-[10px]">Aucun défi ouvert pour le moment</p>
          </div>
        )}
      </div>
    </div>
  );
}

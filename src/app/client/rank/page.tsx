"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Medal, ChevronLeft, Loader2, 
  Search, Target, Flame, ShieldCheck,
  TrendingUp, Award, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalRankPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Récupérer le classement général (Limité au Top 50 pour la performance)
      // La logique anti-triche repose sur le fait que ces données viennent de la table 
      // challenge_entries qui est mise à jour par des RPC sécurisés côté serveur.
      const { data: entries, error } = await supabase
        .from('challenge_entries')
        .select(`
          score,
          profiles (
            id,
            username,
            avatar_url,
            vip_status
          ),
          challenges (
            title
          )
        `)
        .order('score', { ascending: false })
        .order('created_at', { ascending: true }) // Premier arrivé si égalité
        .limit(50);

      if (error) throw error;

      // 2. Formater les données
      setLeaders(entries || []);

      // 3. Trouver le rang de l'utilisateur actuel
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(prof);
        
        const userIdx = entries?.findIndex(e => e.profiles.id === user.id);
        if (userIdx !== -1) {
          setCurrentUserRank({ ...entries?.[userIdx], rank: userIdx + 1 });
        }
      }
    } catch (e) {
      console.error("Rank Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (index: number) => {
    if (index === 0) return "text-amber-400 border-amber-400/20 bg-amber-400/5";
    if (index === 1) return "text-slate-300 border-slate-300/20 bg-slate-300/5";
    if (index === 2) return "text-orange-500 border-orange-500/20 bg-orange-500/5";
    return "text-slate-500 border-white/5 bg-white/5";
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
      <p className="text-[10px] text-emerald-500/50 tracking-[0.3em] font-black italic uppercase">Calcul des performances...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-black italic uppercase overflow-x-hidden">
      
      {/* HEADER STATIQUE */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => router.push('/client/home')} 
          className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl tracking-tighter leading-none flex items-center gap-2">
            CLASSEMENT <ShieldCheck className="text-emerald-500" size={20} />
          </h1>
          <p className="text-[8px] text-slate-500 tracking-[0.2em] mt-1">VÉRIFIÉ PAR CHIF-PAM SECURE</p>
        </div>
      </div>

      {/* TOP 3 PODIUM VISUEL */}
      <div className="flex items-end justify-center gap-2 mb-12 mt-4 px-2">
        {/* Silver - 2nd */}
        {leaders[1] && (
          <div className="flex-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-2 border-slate-300 p-1 mb-2">
              <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                <User className="text-slate-300" />
              </div>
            </div>
            <div className="h-16 w-full bg-slate-300/10 border-t-2 border-slate-300 rounded-t-xl flex flex-col items-center justify-center">
              <p className="text-[8px] text-slate-300">2ND</p>
              <p className="text-[10px] truncate w-20 text-center">{leaders[1].profiles.username}</p>
            </div>
          </div>
        )}

        {/* Gold - 1st */}
        {leaders[0] && (
          <div className="flex-1 flex flex-col items-center scale-110">
            <Trophy className="text-amber-400 mb-2 animate-bounce" size={24} />
            <div className="w-16 h-16 rounded-full border-2 border-amber-400 p-1 mb-2 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
              <div className="w-full h-full rounded-full bg-amber-400/20 flex items-center justify-center overflow-hidden">
                <User className="text-amber-400" />
              </div>
            </div>
            <div className="h-24 w-full bg-amber-400/10 border-t-2 border-amber-400 rounded-t-xl flex flex-col items-center justify-center">
              <p className="text-[10px] text-amber-400">CHAMPION</p>
              <p className="text-[12px] truncate w-20 text-center">{leaders[0].profiles.username}</p>
            </div>
          </div>
        )}

        {/* Bronze - 3rd */}
        {leaders[2] && (
          <div className="flex-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-2 border-orange-500 p-1 mb-2">
              <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                <User className="text-orange-500" />
              </div>
            </div>
            <div className="h-14 w-full bg-orange-500/10 border-t-2 border-orange-500 rounded-t-xl flex flex-col items-center justify-center">
              <p className="text-[8px] text-orange-500">3RD</p>
              <p className="text-[10px] truncate w-20 text-center">{leaders[2].profiles.username}</p>
            </div>
          </div>
        )}
      </div>

      {/* LISTE DES RANGS */}
      <div className="space-y-3 mb-24">
        {leaders.map((entry, index) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            key={index}
            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${getRankColor(index)}`}
          >
            <div className="flex items-center gap-4">
              <span className="text-lg w-6 font-black italic">#{index + 1}</span>
              <div>
                <p className="text-sm tracking-tight flex items-center gap-2">
                  {entry.profiles.username}
                  {entry.profiles.vip_status !== 'free' && <Award size={12} className="text-emerald-500" />}
                </p>
                <p className="text-[7px] opacity-50 tracking-widest">{entry.challenges?.title || "DÉFI GÉNÉRAL"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-white tracking-widest">{entry.score.toLocaleString()} PTS</p>
              <div className="flex items-center justify-end gap-1">
                <TrendingUp size={8} className="text-emerald-500" />
                <p className="text-[6px] text-emerald-500">VÉRIFIÉ</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* FOOTER FIXE: TON RANG ACTUEL */}
      {currentUserRank && (
        <div className="fixed bottom-24 left-6 right-6 z-50">
          <motion.div 
            initial={{ y: 100 }} animate={{ y: 0 }}
            className="bg-emerald-600 p-4 rounded-3xl flex items-center justify-between shadow-[0_20px_40px_rgba(16,185,129,0.3)] border border-white/20"
          >
            <div className="flex items-center gap-4">
              <div className="bg-black/20 p-2 rounded-xl">
                 <Medal className="text-white" size={24} />
              </div>
              <div>
                <p className="text-[8px] text-emerald-200">TON RANG ACTUEL</p>
                <p className="text-lg text-white">#{currentUserRank.rank} GLOBAL</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-emerald-200 uppercase">Ton Meilleur Score</p>
              <p className="text-xl text-white">{currentUserRank.score} PTS</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

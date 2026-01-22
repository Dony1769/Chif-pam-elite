"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox, Loader2, CheckCheck, Bell, Sparkles, Trophy, Zap } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClientNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { 
    fetchNotifications();

    // REALTIME: Écoute les nouvelles notifications
    const channel = supabase.channel('notif_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');
      const { data } = await supabase.from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-emerald-500">
        <Loader2 className="animate-spin" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-20">
      {/* HEADER FIXE */}
      <div className="p-6 sticky top-0 bg-[#020617]/95 backdrop-blur-2xl z-20 border-b border-emerald-500/10 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl tracking-tighter">CENTRE_D_ALERTES</h1>
          <div className="w-10" />
        </div>
        
        <div className="flex gap-2">
            <button onClick={markAllAsRead} className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
              <CheckCheck size={14} className="text-emerald-500" /> TOUT LIRE
            </button>
            <button className="p-4 rounded-2xl bg-emerald-500 text-black text-[10px] flex items-center gap-2 font-black">
              <Bell size={14} /> PUSH_ACTIVE
            </button>
        </div>
      </div>

      {/* LISTE DES NOTIFICATIONS */}
      <div className="p-6 space-y-4">
        <AnimatePresence mode="popLayout">
          {notifications.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-40 text-slate-700">
              <Inbox size={60} strokeWidth={1} className="opacity-20 mb-4" />
              <p className="text-[10px] tracking-[0.5em]">FRÉQUENCE_VIDE</p>
            </motion.div>
          ) : (
            notifications.map((n, index) => (
              <motion.div 
                key={n.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`relative p-6 rounded-[2rem] border overflow-hidden transition-all ${
                  n.is_read 
                  ? 'bg-white/2 border-white/5 opacity-40' 
                  : 'bg-gradient-to-br from-slate-900 to-black border-emerald-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
                }`}
              >
                {!n.is_read && (
                    <div className="absolute top-0 right-0 p-2">
                        <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                    </div>
                )}
                
                <div className="flex gap-4 items-start">
                  <div className={`p-3 rounded-xl ${n.title.includes('VIC') ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {n.title.includes('VIC') ? <Trophy size={20}/> : <Zap size={20}/>}
                  </div>
                  <div>
                    <h3 className="text-sm tracking-tighter leading-none mb-1">{n.title}</h3>
                    <p className="text-[11px] lowercase not-italic text-slate-400 leading-relaxed">{n.content}</p>
                    <p className="text-[7px] text-slate-600 mt-3 tracking-widest">
                        {new Date(n.created_at).toLocaleTimeString()} — RÉSEAU_ARENA
                    </p>
                  </div>
                </div>

                {/* Effet VIP Brillance pour les non-lus */}
                {!n.is_read && (
                    <motion.div 
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent skew-x-12"
                    />
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

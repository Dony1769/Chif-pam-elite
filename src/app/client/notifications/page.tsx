"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox, Loader2, CheckCheck, Bell, Trophy, Shield, Flame, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FilterType = 'TOUT' | 'VICTOIRES' | 'DÉFIS' | 'SYSTÈME';

const VAPID_PUBLIC_KEY = "BEbxxcO2dGwTgPFasWQ0bZGSIoAhAbYPDB7X0p5cIp4eU6Qg2ZVe6Zyrky30AcvqGkHGU_SZZQGAtBrI8DK17gw";

export default function ClientNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [liveChallenges, setLiveChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('TOUT');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  // --- LE MOTEUR QUI FAIT DESCENDRE LA BANNIÈRE (COMME TON BOUTON) ---
  const triggerImmediateBanner = async (title: string, body: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    
    const registration = await navigator.serviceWorker.ready;
    // On envoie exactement les mêmes data que ton sw.js attend
    registration.showNotification(title, {
      body: body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [300, 100, 300],
      tag: "chif-pam-notif",
      renotify: true,
      data: { url: "/client/notifications" }
    });
  };

  useEffect(() => { 
    fetchAllData();
    checkPushSubscription();

    // --- ECOUTEUR RADAR : ACTION IMMÉDIATE ---
    const channel = supabase.channel('notif_radar_sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const n = payload.new;
        setNotifications(prev => [n, ...prev]);
        // Déclenche la bannière système immédiatement
        triggerImmediateBanner(n.title || "CHIF PAM ⚡", n.content);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenges' }, (payload) => {
        const c = payload.new;
        setLiveChallenges(prev => [c, ...prev]);
        // Déclenche la bannière pour les défis
        triggerImmediateBanner("NOUVEAU DÉFI 🔥", c.title);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');
      const [nRes, cRes] = await Promise.all([
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('challenges').select('*').eq('is_active', true).order('created_at', { ascending: false })
      ]);
      setNotifications(nRes.data || []);
      setLiveChallenges(cRes.data || []);
    } finally { setLoading(false); }
  };

  const checkPushSubscription = async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(!!sub);
    }
  };

  const togglePush = async () => {
    setIsRegistering(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from('push_subscriptions').upsert({ user_id: user.id, subscription: sub.toJSON() });
        
        triggerImmediateBanner("NOTIFICATIONS ACTIVÉES", "C'est ici que tu verras tes messages ! ✅");
        setPushEnabled(true);
      }
    } finally { setIsRegistering(false); }
  };

  const urlBase64ToUint8Array = (bs: string) => {
    const pad = '='.repeat((4 - bs.length % 4) % 4);
    const b64 = (bs + pad).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from([...window.atob(b64)].map(c => c.charCodeAt(0)));
  };

  const allAlerts = useMemo(() => {
    const mappedC = liveChallenges.map(c => ({ id: `c-${c.id}`, title: `DÉFI : ${c.title}`, content: `Gagne ${c.prize_pool} HTG !`, created_at: c.created_at, is_read: false, is_challenge: true, link: '/client/challenges' }));
    return [...mappedC, ...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [notifications, liveChallenges]);

  const filteredAlerts = allAlerts.filter(n => {
    if (activeFilter === 'TOUT') return true;
    if (activeFilter === 'VICTOIRES') return n.title.includes('VIC') || n.title.includes('GAGNÉ');
    if (activeFilter === 'DÉFIS') return n.is_challenge;
    return !n.is_challenge && !n.title.includes('VIC');
  });

  const counts = useMemo(() => ({
    TOUT: allAlerts.filter(n => !n.is_read).length,
    VICTOIRES: allAlerts.filter(n => !n.is_read && (n.title.includes('VIC') || n.title.includes('GAGNÉ'))).length,
    DÉFIS: allAlerts.filter(n => !n.is_read && n.is_challenge).length,
    SYSTÈME: allAlerts.filter(n => !n.is_read && !n.is_challenge && !n.title.includes('VIC')).length,
  }), [allAlerts]);

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-emerald-500"><Loader2 className="animate-spin" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-20">
      <div className="p-6 sticky top-0 bg-[#020617]/95 backdrop-blur-2xl z-20 border-b border-emerald-500/10 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all"><ArrowLeft size={20} /></button>
          <div className="text-center">
            <h1 className="text-xl tracking-tighter">CENTRE_D_ALERTES</h1>
            <p className="text-[7px] text-emerald-500/50 tracking-[0.4em]">RADAR_ACTIF_SYNCHRONISÉ</p>
          </div>
          <button onClick={async () => {
             const { data: { user } } = await supabase.auth.getUser();
             if (user) await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
             setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
          }} className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500"><CheckCheck size={20} /></button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {(['TOUT', 'VICTOIRES', 'DÉFIS', 'SYSTÈME'] as FilterType[]).map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)} className={`relative px-6 py-3 rounded-2xl text-[9px] tracking-widest border transition-all ${activeFilter === f ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 text-slate-500 border-white/5'}`}>
              {f} {counts[f] > 0 && <span className="ml-1 bg-black text-emerald-500 px-1 rounded">{counts[f]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.map((n) => (
            <motion.div key={n.id} layout initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={`relative p-6 rounded-[2rem] border ${n.is_challenge ? 'bg-blue-900/10 border-blue-500/30' : n.is_read ? 'opacity-40 border-white/5' : 'bg-white/5 border-emerald-500/30'}`} onClick={() => n.link && router.push(n.link)}>
               {!n.is_read && <div className="absolute top-4 right-4 flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative h-2 w-2 rounded-full bg-emerald-500"></span></div>}
               <div className="flex gap-4 items-start">
                  <div className={`p-3 rounded-xl ${n.is_challenge ? 'bg-blue-500 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>{n.is_challenge ? <Flame size={20}/> : <Shield size={20}/>}</div>
                  <div>
                    <h3 className={`text-sm ${n.is_challenge ? 'text-blue-400' : ''}`}>{n.title}</h3>
                    <p className="text-[11px] lowercase not-italic text-slate-400 leading-relaxed">{n.content}</p>
                  </div>
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-center pointer-events-none">
          <button onClick={togglePush} className={`pointer-events-auto px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center gap-3 transition-all ${pushEnabled ? 'bg-slate-800 text-emerald-500 border border-emerald-500/20' : 'bg-emerald-500 text-black shadow-xl'}`}>
              {pushEnabled ? <Bell size={16} /> : <BellOff size={16} />}
              {pushEnabled ? 'PUSH_ACTIF' : 'ACTIVER_PUSH'}
          </button>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox, Loader2, CheckCheck, Bell, Trophy, Shield, Flame, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FilterType = 'TOUT' | 'VICTOIRES' | 'DÉFIS' | 'SYSTÈME';

// Ta clé P-256
const VAPID_PUBLIC_KEY = "BEbxxcO2dGwTgPFasWQ0bZGSIoAhAbYPDB7X0p5cIp4eU6Qg2ZVe6Zyrky30AcvqGkHGU_SZZQGAtBrI8DK17gw";

export default function ClientNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [liveChallenges, setLiveChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('TOUT');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  // --- LE MOTEUR DE BANNIÈRE (L'ACTION QUE TU VOIS QUAND TU CLIQUES) ---
  const sendNativePush = async (title: string, body: string) => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
      const swReg = await navigator.serviceWorker.ready;
      swReg.showNotification(title, {
        body: body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png", // C'est ici que le badge rouge est géré par le système
        vibrate: [200, 100, 200],
        tag: "new-update",
        renotify: true,
        data: { url: "/client/notifications" }
      } as any);
    }
  };

  useEffect(() => { 
    fetchAllData();
    checkPushSubscription();

    // --- L'ECOUTEUR RADAR : ENVOIE LES MESSAGES DIRECTEMENT AU SYSTÈME ---
    const channel = supabase.channel('realtime_push_sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const n = payload.new;
        setNotifications(prev => [n, ...prev]);
        
        // ACTION : Envoi immédiat à la bannière du téléphone
        sendNativePush(n.title || "CHIF PAM", n.content);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenges' }, (payload) => {
        const c = payload.new;
        setLiveChallenges(prev => [c, ...prev]);
        
        // ACTION : Envoi immédiat pour les défis
        sendNativePush("NOUVEAU DÉFI 🔥", c.title);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [notifs, challs] = await Promise.all([
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('challenges').select('*').eq('is_active', true).order('created_at', { ascending: false })
      ]);
      setNotifications(notifs.data || []);
      setLiveChallenges(challs.data || []);
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
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from('push_subscriptions').upsert({ user_id: user.id, subscription: sub.toJSON() });
        
        // Test immédiat comme tu l'as aimé
        sendNativePush("NOTIFICATIONS ACTIVÉES ✅", "Vous recevrez vos alertes ici.");
        setPushEnabled(true);
      }
    } catch (e) { console.error(e); } finally { setIsRegistering(false); }
  };

  const urlBase64ToUint8Array = (bs: string) => {
    const pad = '='.repeat((4 - bs.length % 4) % 4);
    const b64 = (bs + pad).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from([...window.atob(b64)].map(c => c.charCodeAt(0)));
  };

  // --- FILTRAGE UI ---
  const allAlerts = useMemo(() => {
    const challs = liveChallenges.map(c => ({ id: c.id, title: `DÉFI : ${c.title}`, content: `Pool: ${c.prize_pool} HTG`, created_at: c.created_at, is_read: false, is_challenge: true }));
    return [...challs, ...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [notifications, liveChallenges]);

  const filtered = allAlerts.filter(n => {
    if (activeFilter === 'TOUT') return true;
    if (activeFilter === 'VICTOIRES') return n.title.includes('VIC') || n.title.includes('GAGNÉ');
    if (activeFilter === 'DÉFIS') return n.is_challenge;
    return !n.is_challenge && !n.title.includes('VIC');
  });

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-emerald-500"><Loader2 className="animate-spin" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-20">
      <div className="p-6 sticky top-0 bg-[#020617]/95 backdrop-blur-2xl z-20 border-b border-emerald-500/10 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all"><ArrowLeft size={20} /></button>
          <h1 className="text-xl tracking-tighter text-center">CENTRE_D_ALERTES</h1>
          <button onClick={async () => {
             const { data: { user } } = await supabase.auth.getUser();
             if (user) await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
             setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
          }} className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500"><CheckCheck size={20} /></button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {(['TOUT', 'VICTOIRES', 'DÉFIS', 'SYSTÈME'] as FilterType[]).map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)} className={`px-6 py-3 rounded-2xl text-[9px] tracking-widest border transition-all ${activeFilter === f ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 text-slate-500 border-white/5'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-40 opacity-20"><Bell size={60} /><p className="text-[10px] mt-4 tracking-widest">VIDE</p></div>
          ) : (
            filtered.map((n) => (
              <motion.div key={n.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-6 rounded-[2rem] border ${n.is_read ? 'opacity-40 border-white/5' : 'border-emerald-500/30 bg-white/5'}`}>
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    {n.is_challenge ? <Flame size={20}/> : <Shield size={20}/>}
                  </div>
                  <div>
                    <h3 className="text-sm mb-1">{n.title}</h3>
                    <p className="text-[11px] lowercase not-italic text-slate-400">{n.content}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-center pointer-events-none">
          <button onClick={togglePush} disabled={isRegistering} className={`pointer-events-auto px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center gap-3 active:scale-95 transition-all ${pushEnabled ? 'bg-slate-800 text-emerald-500 border border-emerald-500/20' : 'bg-emerald-500 text-black shadow-xl shadow-emerald-500/20'}`}>
              {isRegistering ? <Loader2 size={16} className="animate-spin" /> : pushEnabled ? <Bell size={16} /> : <BellOff size={16} />}
              {pushEnabled ? 'PUSH_ACTIF' : 'ACTIVER_PUSH'}
          </button>
      </div>
    </div>
  );
}

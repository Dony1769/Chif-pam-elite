"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox, Loader2, CheckCheck, Bell, Trophy, Shield, Flame, BellOff, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FilterType = 'TOUT' | 'VICTOIRES' | 'DÉFIS' | 'SYSTÈME';

type NotificationRow = {
  id: string;
  title: string | null;
  content: string | null;
  message?: string | null;
  created_at: string;
  is_read: boolean;
  link?: string | null;
};

type ChallengeRow = {
  id: string;
  title: string;
  prize_pool_cp: number;
  created_at: string;
  ends_at: string | null;
  is_active: boolean;
};

type AlertItem = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_challenge: boolean;
  is_victory: boolean;
  link?: string;
};

type NotificationOptionsWithVibrate = NotificationOptions & {
  vibrate?: number[];
  renotify?: boolean;
  data?: { url: string };
};

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BEbxxcO2dGwTgPFasWQ0bZGSIoAhAbYPDB7X0p5cIp4eU6Qg2ZVe6Zyrky30AcvqGkHGU_SZZQGAtBrI8DK17gw";

export default function ClientNotifications() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [liveChallenges, setLiveChallenges] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('TOUT');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const router = useRouter();

  // --- FONCTION D'ENVOI LOCAL (Quand l'app est ouverte) ---
  const sendNativePush = async (title: string, body: string) => {
    if (typeof window === 'undefined' || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      const swReg = await navigator.serviceWorker.ready;
      if (!swReg) return;

      const options: NotificationOptionsWithVibrate = {
        body: body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        vibrate: [200, 100, 200],
        tag: "chif-pam-notif",
        renotify: true,
        data: { url: "/client/notifications" }
      };

      await swReg.showNotification(title, options);
    } catch (err) {
      console.error("Erreur affichage notif:", err);
    }
  };

  const fetchAllData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');
      setUserId(user.id);

      const nowIso = new Date().toISOString();

      const [notifsRes, challengesRes] = await Promise.all([
        supabase
          .from('notifications')
          .select('id, title, content, created_at, is_read')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('challenges')
          .select('id, title, prize_pool_cp, created_at, ends_at, is_active')
          .eq('is_active', true)
          .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
          .order('created_at', { ascending: false })
      ]);

      if (notifsRes.error) {
        console.error('notifications list query failed', notifsRes.error);
      }

      setNotifications((notifsRes.data || []) as NotificationRow[]);
      setLiveChallenges((challengesRes.data || []) as ChallengeRow[]);
    } finally { 
      setLoading(false); 
    }
  }, [router]);

  const checkPushSubscription = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(!!sub && Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    fetchAllData();
    checkPushSubscription();
  }, [checkPushSubscription, fetchAllData]);

  useEffect(() => {
    if (!userId || !isTabVisible) return;

    // RADAR TEMPS RÉEL
    const channel = supabase.channel('notif_radar_sync')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${userId}` 
      }, (payload) => {
        const n = payload.new as NotificationRow;
        setNotifications(prev => [n, ...prev.filter((item) => item.id !== n.id)]);
        sendNativePush(n.title || "CHIF PAM ⚡", n.content || n.message || "Nouvelle info");
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'challenges' 
      }, (payload) => {
        const c = payload.new as ChallengeRow;
        const now = new Date();
        const isExpired = c.ends_at && new Date(c.ends_at) <= now;

        if (payload.eventType === 'DELETE' || !c.is_active || isExpired) {
          // Si le défi est désactivé, supprimé ou expiré : on le retire
          setLiveChallenges(prev => prev.filter(item => item.id !== c.id));
        } else {
          // Si c'est un nouveau défi actif et non expiré
          setLiveChallenges(prev => [c, ...prev.filter(item => item.id !== c.id)]);
          if (payload.eventType === 'INSERT') {
            sendNativePush("NOUVEAU DÉFI 🔥", c.title);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isTabVisible, userId]);

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
        if (user) {
          const { error } = await supabase.from('push_subscriptions').upsert({ 
            user_id: user.id, 
            subscription: sub.toJSON() 
          }, { onConflict: 'subscription' }); 
            
          if (!error) {
            sendNativePush("NOTIFICATIONS ACTIVÉES ✅", "Le radar est actif.");
            setPushEnabled(true);
          } else {
            alert("Erreur sauvegarde abonnement");
          }
        }
      } else {
        alert("Permission refusée. Vérifiez les paramètres de votre navigateur.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur technique lors de l'abonnement.");
    } finally { 
      setIsRegistering(false); 
    }
  };

  const urlBase64ToUint8Array = (bs: string) => {
    const pad = '='.repeat((4 - bs.length % 4) % 4);
    const b64 = (bs + pad).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from([...window.atob(b64)].map(c => c.charCodeAt(0)));
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const allAlerts = useMemo<AlertItem[]>(() => {
    const now = new Date();

    // On ne conserve que les défis strictement actifs et non expirés
    const validChallenges = liveChallenges.filter(c => {
      if (!c.is_active) return false;
      if (c.ends_at && new Date(c.ends_at) <= now) return false;
      return true;
    });

    const mappedChallenges: AlertItem[] = validChallenges.map((c) => ({
      id: `challenge-${c.id}`,
      title: `NOUVEAU DÉFI : ${c.title}`,
      content: `Récompense : ${c.prize_pool_cp} CP. Bonne chance !`,
      created_at: c.created_at,
      is_read: false,
      is_challenge: true,
      is_victory: false,
      link: '/client/challenges'
    }));

    const normalizedNotifs: AlertItem[] = notifications.map((n) => ({
      ...n,
      title: n.title || 'ALERTE',
      content: n.content || n.message || 'Nouvelle information',
      is_challenge: false,
      link: n.link ?? undefined,
      is_victory: Boolean(
        n.title?.includes('VIC') ||
        n.title?.includes('🥇') ||
        n.title?.includes('🥈') ||
        n.title?.includes('🥉') ||
        n.message?.includes('CP')
      )
    }));

    return [...mappedChallenges, ...normalizedNotifs].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications, liveChallenges]);

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter(n => {
      if (activeFilter === 'TOUT') return true;
      if (activeFilter === 'VICTOIRES') return n.is_victory;
      if (activeFilter === 'DÉFIS') return n.is_challenge;
      if (activeFilter === 'SYSTÈME') return !n.is_challenge && !n.is_victory;
      return true;
    });
  }, [allAlerts, activeFilter]);

  const counts = useMemo(() => ({
    TOUT: allAlerts.filter(n => !n.is_read).length,
    VICTOIRES: allAlerts.filter(n => !n.is_read && n.is_victory).length,
    DÉFIS: allAlerts.filter(n => !n.is_read && n.is_challenge).length,
    SYSTÈME: allAlerts.filter(n => !n.is_read && !n.is_challenge && !n.is_victory).length,
  }), [allAlerts]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-emerald-500">
      <Loader2 className="animate-spin" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-20">
      
      <div className="p-6 sticky top-0 bg-[#020617]/95 backdrop-blur-2xl z-20 border-b border-emerald-500/10 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-xl tracking-tighter">CENTRE_D_ALERTES</h1>
            <p className="text-[7px] text-emerald-500/50 tracking-[0.4em]">RADAR_ACTIF_SYNCHRONISÉ</p>
          </div>
          <button onClick={handleMarkAllAsRead} className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500 active:scale-90 transition-all">
            <CheckCheck size={20} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {(['TOUT', 'VICTOIRES', 'DÉFIS', 'SYSTÈME'] as FilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`relative px-6 py-3 rounded-2xl text-[9px] tracking-widest transition-all flex items-center gap-2 whitespace-nowrap border ${
                activeFilter === filter ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 text-slate-500 border-white/5'
              }`}
            >
              {filter}
              {counts[filter] > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${activeFilter === filter ? 'bg-black text-emerald-500' : 'bg-emerald-500 text-black'}`}>
                  {counts[filter]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center py-40 text-slate-700 opacity-20">
              <Inbox size={60} strokeWidth={1} />
              <p className="text-[10px] tracking-[0.5em] mt-4">AUCUNE ALERTE</p>
            </div>
          ) : (
            filteredAlerts.map((n) => (
              <motion.div 
                key={n.id}
                layout
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={`relative p-6 rounded-4xl border overflow-hidden cursor-pointer transition-all ${
                  n.is_challenge 
                  ? 'bg-gradient-to-br from-blue-900/30 to-black border-blue-500/50' 
                  : n.is_victory 
                  ? 'bg-gradient-to-br from-emerald-900/40 via-black to-black border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                  : n.is_read ? 'bg-white/2 border-white/5 opacity-40' : 'bg-slate-900/40 border-white/10'
                }`}
                onClick={() => n.link && router.push(n.link)}
              >
                {!n.is_read && (
                  <div className="absolute top-4 right-4">
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                )}
                
                <div className="flex gap-4 items-start">
                  <div className={`p-3 rounded-xl ${
                    n.is_challenge ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' :
                    n.is_victory ? 'bg-emerald-500 text-black animate-pulse' : 'bg-white/5 text-slate-400'
                  }`}>
                    {n.is_challenge ? <Flame size={20}/> : n.is_victory ? <Trophy size={20}/> : <Shield size={20}/>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-sm tracking-tighter leading-none pr-6 ${n.is_challenge ? 'text-blue-400' : n.is_victory ? 'text-emerald-400 font-black' : ''}`}>
                        {n.title}
                      </h3>
                      {n.is_victory && <Coins size={12} className="text-emerald-500" />}
                    </div>
                    <p className={`text-[11px] lowercase not-italic leading-relaxed ${n.is_victory ? 'text-white' : 'text-slate-400'}`}>
                      {n.content}
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-[7px] text-slate-600 tracking-widest">{new Date(n.created_at).toLocaleTimeString()}</p>
                      {n.is_challenge && <p className="text-[7px] text-blue-500 tracking-widest animate-pulse font-bold">VOIR_DÉFI_MAINTENANT</p>}
                      {n.is_victory && <p className="text-[7px] text-emerald-500 tracking-widest font-bold">SOLDE_MIS_À_JOUR</p>}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-center pointer-events-none">
        <button 
          onClick={togglePush}
          disabled={isRegistering}
          className={`pointer-events-auto px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-2xl ${
            pushEnabled ? 'bg-slate-800 text-emerald-500 border border-emerald-500/20' : 'bg-emerald-500 text-black shadow-emerald-500/40'
          }`}
        >
          {isRegistering ? <Loader2 size={16} className="animate-spin" /> : pushEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          {pushEnabled ? 'PUSH_ACTIF' : 'ACTIVER_PUSH'}
        </button>
      </div>
    </div>
  );
}

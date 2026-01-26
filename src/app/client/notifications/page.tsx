"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox, Loader2, CheckCheck, Bell, Trophy, Zap, Shield, Cpu, Filter, Flame, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FilterType = 'TOUT' | 'VICTOIRES' | 'DÉFIS' | 'SYSTÈME';

// REMPLACE par ta nouvelle clé publique VAPID générée précédemment
const VAPID_PUBLIC_KEY = "BEbxxcO2dGwTgPFasWQ0bZGSIoAhAbYPDB7X0p5cIp4eU6Qg2ZVe6Zyrky30AcvqGkHGU_SZZQGAtBrI8DK17gw";

export default function ClientNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [liveChallenges, setLiveChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('TOUT');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  // --- FONCTION POUR DÉCLENCHER LE PUSH LOCAL ---
  const triggerLocalNotification = (title: string, body: string) => {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body: body,
          icon: '/icons/icon-192.png', // Assure-toi que ce fichier existe
          badge: '/icons/icon-192.png',
          vibrate: [200, 100, 200],
          data: { url: '/client/notifications' }
        });
      });
    }
  };

  useEffect(() => { 
    fetchAllData();
    checkPushSubscription();

    // --- SYNCHRONISATION TEMPS RÉEL + PUSH LOCAL ---
    const channel = supabase.channel('notif_radar_sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const newNotif = payload.new;
        setNotifications(prev => [newNotif, ...prev]);
        
        // On active le push visuel sur le téléphone dès que la ligne est insérée
        triggerLocalNotification(newNotif.title || "CHIF PAM ⚡", newNotif.content);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenges' }, (payload) => {
        const newChallenge = payload.new;
        setLiveChallenges(prev => [newChallenge, ...prev]);
        
        // Push local pour les nouveaux défis
        triggerLocalNotification("NOUVEAU DÉFI 🔥", newChallenge.title);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const [notifsRes, challengesRes] = await Promise.all([
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('challenges').select('*').eq('is_active', true).order('created_at', { ascending: false })
      ]);

      setNotifications(notifsRes.data || []);
      setLiveChallenges(challengesRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIQUE WEB PUSH (ABONNEMENT) ---
  const checkPushSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setPushEnabled(!!subscription);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  };

  const togglePush = async () => {
    try {
      setIsRegistering(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (pushEnabled) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
          setPushEnabled(false);
        }
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return alert("Veuillez autoriser les notifications");

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          subscription: subscription.toJSON()
        });
        
        triggerLocalNotification("CHIF PAM ⚡", "Notifications activées avec succès !");
        setPushEnabled(true);
      }
    } catch (err) {
      console.error("Erreur Push:", err);
    } finally {
      setIsRegistering(false);
    }
  };

  // --- CALCULS DES COMPTEURS ET FILTRES ---
  const allAlerts = useMemo(() => {
    const mappedChallenges = liveChallenges.map(c => ({
      id: `challenge-${c.id}`,
      title: `NOUVEAU DÉFI : ${c.title}`,
      content: `Récompense : ${c.prize_pool} HTG. Bonne chance !`,
      created_at: c.created_at,
      is_read: false,
      is_challenge: true,
      link: '/client/challenges'
    }));
    return [...mappedChallenges, ...notifications].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications, liveChallenges]);

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter(n => {
      if (activeFilter === 'TOUT') return true;
      if (activeFilter === 'VICTOIRES') return n.title.includes('VIC') || n.title.includes('GAGNÉ');
      if (activeFilter === 'DÉFIS') return n.is_challenge || n.title.includes('DÉFI');
      if (activeFilter === 'SYSTÈME') return !n.is_challenge && !n.title.includes('VIC') && !n.title.includes('DÉFI');
      return true;
    });
  }, [allAlerts, activeFilter]);

  const counts = useMemo(() => ({
    TOUT: allAlerts.filter(n => !n.is_read).length,
    VICTOIRES: allAlerts.filter(n => !n.is_read && (n.title.includes('VIC') || n.title.includes('GAGNÉ'))).length,
    DÉFIS: allAlerts.filter(n => !n.is_read && (n.is_challenge || n.title.includes('DÉFI'))).length,
    SYSTÈME: allAlerts.filter(n => !n.is_read && (!n.is_challenge && !n.title.includes('VIC') && !n.title.includes('DÉFI'))).length,
  }), [allAlerts]);

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
      {/* Header & Filtres */}
      <div className="p-6 sticky top-0 bg-[#020617]/95 backdrop-blur-2xl z-20 border-b border-emerald-500/10 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-xl tracking-tighter">CENTRE_D_ALERTES</h1>
            <p className="text-[7px] text-emerald-500/50 tracking-[0.4em]">RADAR_ACTIF_SYNCHRONISÉ</p>
          </div>
          <button onClick={markAllAsRead} className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500">
            <CheckCheck size={20} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {(['TOUT', 'VICTOIRES', 'DÉFIS', 'SYSTÈME'] as FilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`relative px-6 py-3 rounded-2xl text-[9px] tracking-widest transition-all flex items-center gap-2 whitespace-nowrap border ${
                activeFilter === filter 
                ? 'bg-emerald-500 text-black border-emerald-500' 
                : 'bg-white/5 text-slate-500 border-white/5'
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

      {/* Liste des notifications */}
      <div className="p-6 space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center py-40 text-slate-700">
              <Inbox size={60} strokeWidth={1} className="opacity-20 mb-4" />
              <p className="text-[10px] tracking-[0.5em]">AUCUNE ALERTE {activeFilter}</p>
            </div>
          ) : (
            filteredAlerts.map((n) => (
              <motion.div 
                key={n.id}
                layout
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={`relative p-6 rounded-[2rem] border overflow-hidden cursor-pointer ${
                  n.is_challenge 
                  ? 'bg-gradient-to-br from-blue-900/20 to-black border-blue-500/50' 
                  : n.is_read 
                    ? 'bg-white/2 border-white/5 opacity-40' 
                    : 'bg-gradient-to-br from-slate-900 to-black border-emerald-500/30'
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
                    n.is_challenge ? 'bg-blue-500 text-white animate-pulse' :
                    n.title.includes('VIC') ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {n.is_challenge ? <Flame size={20}/> : 
                     n.title.includes('VIC') ? <Trophy size={20}/> : <Shield size={20}/>}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm tracking-tighter leading-none mb-1 pr-6 ${n.is_challenge ? 'text-blue-400 font-black' : ''}`}>
                        {n.title}
                    </h3>
                    <p className="text-[11px] lowercase not-italic text-slate-400 leading-relaxed">{n.content}</p>
                    <div className="flex justify-between items-center mt-3">
                        <p className="text-[7px] text-slate-600 tracking-widest">
                            {new Date(n.created_at).toLocaleTimeString()}
                        </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Bouton de contrôle flottant */}
      <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-center pointer-events-none">
          <button 
            onClick={togglePush}
            disabled={isRegistering}
            className={`pointer-events-auto px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-2xl ${
              pushEnabled 
              ? 'bg-slate-800 text-emerald-500 border border-emerald-500/20' 
              : 'bg-emerald-500 text-black shadow-emerald-500/40'
            }`}
          >
              {isRegistering ? (
                <Loader2 size={16} className="animate-spin" />
              ) : pushEnabled ? (
                <Bell size={16} />
              ) : (
                <BellOff size={16} />
              )}
              {isRegistering ? 'CONFIGURATION...' : pushEnabled ? 'PUSH_ACTIF' : 'ACTIVER_PUSH'}
          </button>
      </div>
    </div>
  );
}


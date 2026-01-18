"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox, Loader2, CheckCheck, Bell } from 'lucide-react';
import Link from 'next/link';
import { subscribeUserToPush } from "@/lib/push";

export default function ClientNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const enablePush = async () => {
    try {
        const sub = await subscribeUserToPush();
        if (sub) {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from("push_subscriptions").upsert({ 
            user_id: user?.id, 
            subscription: JSON.parse(JSON.stringify(sub)) 
          });
          alert("Notifications activées ! ✅");
        }
    } catch (err) {
        console.error("Push Error:", err);
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase">
      <div className="p-6 sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-20 border-b border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/client/home" className="p-2 bg-slate-900 rounded-full"><ArrowLeft size={20} /></Link>
          {notifications.some(n => !n.is_read) && (
            <button onClick={markAllAsRead} className="text-[10px] text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full flex items-center gap-2">
              <CheckCheck size={14} /> TOUT LIRE
            </button>
          )}
        </div>
        <button onClick={enablePush} className="w-full p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-500 flex items-center justify-center gap-2">
          <Bell size={14} /> ACTIVER LES NOTIFICATIONS MOBILE
        </button>
      </div>

      <div className="p-6 space-y-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-slate-700">
            <Inbox size={48} />
            <p className="text-[10px] mt-4">AUCUNE ALERTE</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`p-5 rounded-2xl border ${n.is_read ? 'bg-slate-900/30 border-white/5 opacity-50' : 'bg-slate-900 border-emerald-500/20'}`}>
              <h3 className="text-sm">{n.title}</h3>
              <p className="text-[11px] lowercase not-italic text-slate-400 mt-1">{n.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

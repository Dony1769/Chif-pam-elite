"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Bell, ArrowLeft, CheckCircle2, MailOpen, 
  Trash2, Clock, Inbox, Loader2 
} from 'lucide-react';
import Link from 'next/link';

export default function ClientNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-10">
      {/* HEADER FIXE */}
      <div className="p-6 flex items-center justify-between sticky top-0 bg-[#020617]/80 backdrop-blur-xl z-20 border-b border-white/5">
        <div className="flex items-center gap-4">
          <Link href="/client/home" className="p-2 bg-white/5 rounded-full">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl tracking-tighter">Mes <span className="text-emerald-500">Alertes</span></h1>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllAsRead} className="text-[10px] text-emerald-500 tracking-widest border-b border-emerald-500/30">
            Tout lire
          </button>
        )}
      </div>

      <div className="p-6 space-y-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-4">
            <Inbox size={60} strokeWidth={1} />
            <p className="text-xs tracking-[0.3em]">Aucune notification</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif.id}
              onClick={() => !notif.is_read && markAsRead(notif.id)}
              className={`p-6 rounded-[2rem] border transition-all active:scale-[0.98] ${
                notif.is_read 
                ? 'bg-slate-900/40 border-white/5 opacity-60' 
                : 'bg-slate-900 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${notif.is_read ? 'bg-slate-700' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className="text-[10px] tracking-widest text-slate-500">
                    {new Date(notif.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {!notif.is_read && <span className="text-[8px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-bold">Nouveau</span>}
              </div>

              <h3 className={`text-sm mb-1 ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>
                {notif.title}
              </h3>
              <p className="text-[11px] lowercase not-italic text-slate-500 leading-relaxed">
                {notif.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


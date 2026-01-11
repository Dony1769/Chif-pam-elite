"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox, Loader2, CheckCheck } from 'lucide-react';
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
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-10">
      <div className="p-6 flex items-center justify-between sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-20 border-b border-white/5">
        <div className="flex items-center gap-4">
          <Link href="/client/home" className="p-2 bg-slate-900 rounded-full border border-white/10"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl tracking-tighter">Alertes</h1>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllAsRead} className="flex items-center gap-2 text-[10px] text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full">
            <CheckCheck size={14} /> Tout lire
          </button>
        )}
      </div>

      <div className="p-6 space-y-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-700 space-y-4">
            <Inbox size={64} strokeWidth={1} />
            <p className="text-[10px] tracking-[0.5em]">Aucun message</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => !n.is_read && markAsRead(n.id)}
              className={`p-6 rounded-[2rem] border transition-all ${n.is_read ? 'bg-slate-900/30 border-white/5 opacity-50' : 'bg-slate-900 border-emerald-500/20 shadow-lg shadow-emerald-500/5'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[8px] text-slate-500 tracking-widest">
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
                {!n.is_read && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />}
              </div>
              <h3 className="text-sm mb-1">{n.title}</h3>
              <p className="text-[11px] lowercase not-italic text-slate-400 leading-tight">{n.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Bell, CheckCircle2, Loader2, Users } from 'lucide-react';

export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
// /app/admin/notifications/page.tsx
const broadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Voulez-vous envoyer ce message à TOUS les clients ?")) return;
    
    setLoading(true);
    try {
      const { data: users } = await supabase.from('profiles').select('id');
      
      if (users) {
        // A. Insertion Base de données (pour l'historique dans l'app)
        const payload = users.map(u => ({
          user_id: u.id,
          title: title.toUpperCase(),
          content: message,
          is_read: false
        }));
        await supabase.from('notifications').insert(payload);

        // B. Envoi Push Mobile (pour la barre de notif)
        await fetch('/api/push', {
          method: 'POST',
          body: JSON.stringify({ title, message }),
        });

        setSent(true);
        setTitle(''); setMessage('');
        setTimeout(() => setSent(false), 3000);
      }
    } catch (error) {
      alert("Erreur lors de la diffusion.");
    } finally {
      setLoading(false);
    }
};

  const broadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Voulez-vous envoyer ce message à TOUS les clients ?")) return;
    
    setLoading(true);
    try {
      const { data: users, error: userError } = await supabase.from('profiles').select('id');
      if (userError) throw userError;

      if (users && users.length > 0) {
        const payload = users.map(u => ({
          user_id: u.id,
          title: title.toUpperCase(),
          content: message,
          is_read: false
        }));

        const { error: insertError } = await supabase.from('notifications').insert(payload);
        if (insertError) throw insertError;

        setSent(true);
        setTitle('');
        setMessage('');
        setTimeout(() => setSent(false), 3000);
      }
    } catch (error: any) {
      alert("Erreur critique : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-12 max-w-2xl mx-auto space-y-10 text-white font-black italic uppercase">
      <div className="space-y-2">
        <h1 className="text-4xl flex items-center gap-4">
          <Bell className="text-emerald-500" size={40} /> Diffusion
        </h1>
        <p className="text-slate-500 text-[10px] tracking-[0.4em]">Alerte générale en temps réel</p>
      </div>

      <form onSubmit={broadcastNotification} className="bg-slate-900 p-8 lg:p-12 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl">
        <div className="space-y-4">
          <label className="text-[10px] text-emerald-500 tracking-widest px-2">Sujet de l'alerte</label>
          <input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="EX: MAINTENANCE DU SYSTÈME"
            className="w-full bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all text-sm"
            required
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] text-emerald-500 tracking-widest px-2">Message aux joueurs</label>
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Écrivez votre message ici..."
            rows={5}
            className="w-full bg-slate-950 border border-white/10 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all text-sm lowercase not-italic"
            required
          />
        </div>

        <button 
          disabled={loading || sent}
          className="w-full bg-emerald-500 text-slate-950 p-6 rounded-2xl flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
        >
          {loading ? <Loader2 className="animate-spin" /> : sent ? <CheckCircle2 /> : <Send size={22} />}
          <span className="tracking-tighter">{sent ? "MESSAGE ENVOYÉ" : "DIFFUSER AUX CLIENTS"}</span>
        </button>
      </form>
    </div>
  );
}

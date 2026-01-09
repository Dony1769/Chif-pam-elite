"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Bell, CheckCircle2, Loader2 } from 'lucide-react';

export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const broadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // On récupère tous les IDs des profils
      const { data: users } = await supabase.from('profiles').select('id');

      if (users) {
        const notifications = users.map(user => ({
          user_id: user.id,
          title: title,
          content: message,
          type: 'system',
          is_read: false
        }));

        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;

        setSent(true);
        setTitle('');
        setMessage('');
        setTimeout(() => setSent(false), 3000);
      }
    } catch (error: any) {
      alert("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 text-white font-black italic uppercase">
      <h1 className="text-2xl flex items-center gap-3">
        <Bell className="text-emerald-500" /> Alerte <span className="text-emerald-500">Générale</span>
      </h1>

      <form onSubmit={broadcastNotification} className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
        <div>
          <label className="text-[10px] text-slate-500 block mb-2 tracking-widest">Titre de l'annonce</label>
          <input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="EX: MAINTENANCE PRÉVUE"
            className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all"
            required
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-500 block mb-2 tracking-widest">Message détaillé</label>
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Votre message ici..."
            rows={4}
            className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all lowercase not-italic"
            required
          />
        </div>

        <button 
          disabled={loading || sent}
          className="w-full bg-emerald-500 text-slate-950 p-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : sent ? <CheckCircle2 /> : <Send size={20} />}
          <span>{sent ? "ENVOYÉ AVEC SUCCÈS" : "DIFFUSER À TOUS LES CLIENTS"}</span>
        </button>
      </form>
    </div>
  );
}

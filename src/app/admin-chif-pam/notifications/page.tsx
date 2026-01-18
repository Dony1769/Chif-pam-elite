"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Bell, CheckCircle2, Loader2 } from 'lucide-react';

// SUPPRIMEZ l'export const viewport ici !

export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Diffuser à TOUS les clients ?")) return;
    
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

        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, message }),
        });

        setSent(true);
        setTitle(''); 
        setMessage('');
        setTimeout(() => setSent(false), 3000);
      }
    } catch (error) {
      console.error("Erreur de diffusion:", error);
      alert("Erreur de diffusion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-white uppercase italic font-black">
      {/* Optionnel : Si vous tenez au theme-color sur cette page spécifiquement */}
      <head>
        <meta name="theme-color" content="#020617" />
      </head>
      
      <h1 className="text-3xl flex items-center gap-4 mb-8">
        <Bell className="text-emerald-500" /> DIFFUSION
      </h1>
      <form onSubmit={handleBroadcast} className="bg-slate-900 p-8 rounded-[2rem] border border-white/5 space-y-6">
        <div className="space-y-2">
           <label className="text-[10px] text-emerald-500 ml-2">Titre</label>
           <input 
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="EX: MAINTENANCE"
            className="w-full bg-black/50 p-4 rounded-xl border border-white/10 outline-none"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] text-emerald-500 ml-2">Message</label>
          <textarea 
            value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Contenu..." rows={4}
            className="w-full bg-black/50 p-4 rounded-xl border border-white/10 outline-none"
            required
          />
        </div>
        <button disabled={loading || sent} className="w-full bg-emerald-500 text-black p-5 rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" /> : sent ? <CheckCircle2 /> : <Send size={20} />}
          {sent ? "MESSAGE ENVOYÉ" : "DIFFUSER AUX CLIENTS"}
        </button>
      </form>
    </div>
  );
}

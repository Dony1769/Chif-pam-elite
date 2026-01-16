"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Bell, CheckCircle2, Loader2 } from 'lucide-react';

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
      const { data: users } = await supabase.from('profiles').select('id');
      
      if (users && users.length > 0) {
        // 1. Database internal notif
        const payload = users.map(u => ({
          user_id: u.id,
          title: title.toUpperCase(),
          content: message,
          is_read: false
        }));
        await supabase.from('notifications').insert(payload);

        // 2. Real-time Push
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, message }),
        });

        setSent(true);
        setTitle(''); setMessage('');
        setTimeout(() => setSent(false), 3000);
      }
    } catch (error) {
      alert("Erreur de diffusion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-white uppercase italic font-black">
      <h1 className="text-3xl flex items-center gap-4 mb-8">
        <Bell className="text-emerald-500" /> DIFFUSION
      </h1>
      <form onSubmit={handleBroadcast} className="bg-slate-900 p-8 rounded-[2rem] border border-white/5 space-y-6">
        <input 
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de l'alerte"
          className="w-full bg-black/50 p-4 rounded-xl border border-white/10 outline-none focus:border-emerald-500"
          required
        />
        <textarea 
          value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Message..." rows={4}
          className="w-full bg-black/50 p-4 rounded-xl border border-white/10 outline-none focus:border-emerald-500"
          required
        />
        <button disabled={loading || sent} className="w-full bg-emerald-500 text-black p-5 rounded-xl font-bold flex justify-center items-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : sent ? <CheckCircle2 /> : <Send size={20} />}
          {sent ? "ENVOYÉ" : "DIFFUSER"}
        </button>
      </form>
    </div>
  );
}
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

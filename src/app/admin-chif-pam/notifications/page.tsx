"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Bell, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    // Petite sécurité pour éviter les envois accidentels
    if (!title.trim() || !message.trim()) return;
    if (!window.confirm("Diffuser ce message à TOUS les clients ?")) return;
    
    setLoading(true);
    try {
      // 1. Récupérer tous les utilisateurs
      const { data: users, error: userError } = await supabase.from('profiles').select('id');
      if (userError) throw userError;

      if (users && users.length > 0) {
        // 2. Préparer les notifications pour la base de données
        const payload = users.map(u => ({
          user_id: u.id,
          title: title.toUpperCase(),
          content: message,
          is_read: false,
          type: 'system' // Ajout du type pour la cohérence
        }));

        // 3. Insérer en masse (batch insert)
        const { error: insertError } = await supabase.from('notifications').insert(payload);
        if (insertError) throw insertError;

        // 4. Envoyer les Push Notifications (Web Push)
        // On ne bloque pas l'interface si le push échoue, c'est un bonus
        try {
            await fetch('/api/push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, message }),
            });
        } catch (pushError) {
            console.error("Erreur envoi push (non bloquant):", pushError);
        }

        setSent(true);
        setTitle(''); 
        setMessage('');
        setTimeout(() => setSent(false), 3000);
      }
    } catch (error: any) {
      console.error("Erreur de diffusion:", error);
      alert("Erreur: " + (error.message || "Impossible de diffuser"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-white font-sans">
      <h1 className="text-3xl flex items-center gap-4 mb-8 font-black italic uppercase">
        <Bell className="text-emerald-500" size={32} /> DIFFUSION GÉNÉRALE
      </h1>
      
      <form onSubmit={handleBroadcast} className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-[2rem] border border-white/5 space-y-6 shadow-2xl">
        <div className="space-y-2">
           <label className="text-[10px] text-emerald-500 ml-4 font-black uppercase tracking-widest">Titre du message</label>
           <input 
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="EX: MAINTENANCE PRÉVUE"
            className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-emerald-500 transition-colors font-bold text-white placeholder:text-slate-600"
            required
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] text-emerald-500 ml-4 font-black uppercase tracking-widest">Contenu</label>
          <textarea 
            value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Écrivez votre message ici..." rows={5}
            className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 outline-none focus:border-emerald-500 transition-colors font-bold text-white placeholder:text-slate-600 resize-none"
            required
          />
        </div>

        <button 
            disabled={loading || sent} 
            className={`w-full p-5 rounded-2xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${sent ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'}`}
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : sent ? (
            <>
                <CheckCircle2 size={20} />
                <span>Envoyé avec succès</span>
            </>
          ) : (
            <>
                <Send size={18} />
                <span>Envoyer à tout le monde</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

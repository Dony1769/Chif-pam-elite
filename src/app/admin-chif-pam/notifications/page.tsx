"use client";

import React, { useState } from 'react';
import { AdminNotificationsService } from '@/services/admin/notifications';
import { Send, Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';

export default function AdminNotifications() {
  const { confirm, notify } = useAppFeedback();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    // Petite sécurité pour éviter les envois accidentels
    if (!title.trim() || !message.trim()) return;
    if (!(await confirm("Diffuser ce message à TOUS les clients ?"))) return;
    
    setLoading(true);
    try {
      const result = await AdminNotificationsService.broadcast(title, message);
      if (!result.success) {
        throw new Error(result.message);
      }

      setSent(true);
      setTitle('');
      setMessage('');
      setTimeout(() => setSent(false), 3000);
    } catch (error: any) {
      console.error("Erreur de diffusion:", error);
      notify("Erreur: " + (error.message || "Impossible de diffuser"), 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-white font-sans">
      <h1 className="text-3xl flex items-center gap-4 mb-8 font-black italic uppercase">
        <Bell className="text-emerald-500" size={32} /> DIFFUSION GÉNÉRALE
      </h1>
      
      <form onSubmit={handleBroadcast} className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-4xl border border-white/5 space-y-6 shadow-2xl">
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

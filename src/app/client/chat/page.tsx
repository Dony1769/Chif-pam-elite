"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, User, Loader2 } from 'lucide-react';

const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_ID || '9e141172-93db-4df4-a72b-47b89211b46e';

type Message = {
  id?: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  is_admin?: boolean;
  created_at?: string;
};

export default function ClientChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: any = null;

    const initChat = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        setUser(authUser);
        await fetchMessages(authUser.id);
        setLoading(false);

        // CONFIGURATION REALTIME AMÉLIORÉE
        // On écoute tous les nouveaux messages insérés dans la table
        channel = supabase.channel(`chat-client-${authUser.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
            },
            (payload: any) => {
              const msg = payload.new as Message;
              
              // On vérifie si le message appartient à la conversation de cet utilisateur
              const isRelevant = msg.sender_id === authUser.id || msg.receiver_id === authUser.id;

              if (isRelevant) {
                setMessages((prev) => {
                  // Évite les doublons visuels
                  if (prev.find(m => m.id === msg.id)) return prev;
                  return [...prev, msg];
                });
              }
            }
          )
          .subscribe();

      } catch (err) {
        console.error('Erreur initChat:', err);
      }
    };

    initChat();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Scroll automatique vers le bas à chaque nouveau message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async (userId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (!error) setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const msg: Message = {
      content: newMessage.trim(),
      sender_id: user.id,
      receiver_id: ADMIN_ID,
      is_admin: false,
    };

    const currentMessage = newMessage;
    setNewMessage(''); // Vide l'input immédiatement pour l'UX

    try {
      const { error } = await supabase.from('messages').insert([msg]);
      if (error) {
        setNewMessage(currentMessage); // Restaure le texte en cas d'erreur
        console.error('Erreur envoi:', error);
      }
    } catch (err) {
      console.error('sendMessage error:', err);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#020617]">
      <Loader2 className="animate-spin text-emerald-500 mb-4" />
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Connexion au support...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-[85vh] p-4 text-white animate-in fade-in duration-700">
      {/* HEADER : STYLE ÉLITE */}
      <div className="bg-slate-900/80 p-5 rounded-t-[2.5rem] border-x border-t border-white/10 flex items-center gap-4 backdrop-blur-md">
        <div className="relative">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <User className="text-emerald-500" size={24} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase text-white tracking-[0.15em]">Support Chif-Pam</p>
          <p className="text-[9px] text-emerald-500 uppercase font-bold tracking-widest">Agent en ligne</p>
        </div>
      </div>

      {/* ZONE DE MESSAGES */}
      <div className="flex-1 bg-slate-900/20 border-x border-white/5 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Posez votre première question</p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={m.id || i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-xl border ${
                m.is_admin
                  ? 'bg-slate-800 text-white rounded-tl-none border-white/5'
                  : 'bg-emerald-600 text-white font-medium rounded-tr-none border-emerald-400/30'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* BARRE DE SAISIE */}
      <div className="bg-slate-950 p-4 rounded-b-[2.5rem] border border-white/10 flex gap-3 shadow-2xl">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Écrivez ici..."
          className="flex-1 bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-600"
        />
        <button
          onClick={sendMessage}
          className="p-4 bg-emerald-500 text-slate-950 rounded-2xl hover:bg-emerald-400 active:scale-90 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

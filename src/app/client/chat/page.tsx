"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Send, User, Loader2, ChevronLeft } from 'lucide-react';

const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";

// --- COMPOSANT LOGO MINI ---
const LogoTiny = () => (
  <svg viewBox="0 0 100 100" className="w-6 h-6 drop-shadow-[0_0_5px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="12" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ClientChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const initChat = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);
      const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`).order('created_at', { ascending: true });
      setMessages(data || []);
      setLoading(false);
      const channel = supabase.channel(`chat-${authUser.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const msg = payload.new;
          if (msg.sender_id === authUser.id || msg.receiver_id === authUser.id) {
            setMessages((prev) => [...prev, msg]);
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    };
    initChat();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const content = newMessage.trim();
    setNewMessage('');
    const { error } = await supabase.from('messages').insert([{
      content: content,
      sender_id: user.id,
      receiver_id: ADMIN_ID,
      is_admin: false
    }]);
    if (error) {
      console.error(error);
      setNewMessage(content);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#020617] space-y-4">
      <LogoTiny />
      <Loader2 className="animate-spin text-emerald-500/20" />
    </div>
  );

  return (
    <div className="flex flex-col h-[90vh] p-4 text-white animate-in fade-in duration-500">
      
      {/* Header AVEC BOUTON RETOUR (POINT 6) */}
      <div className="bg-slate-900/80 p-5 rounded-t-[2.5rem] border border-white/10 flex items-center justify-between backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center active:scale-90 transition-all border border-white/5"
          >
            <ChevronLeft size={20} className="text-emerald-500" />
          </button>
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <User className="text-emerald-500" size={18} />
          </div>
          <p className="text-[11px] font-black uppercase italic tracking-widest">Support <span className="text-emerald-500">Pam</span></p>
        </div>
        <LogoTiny />
      </div>

      {/* Messages */}
      <div className="flex-1 bg-slate-900/20 border-x border-white/5 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm font-medium italic ${m.is_admin ? 'bg-slate-800 rounded-tl-none border border-white/5' : 'bg-emerald-600 rounded-tr-none shadow-lg shadow-emerald-900/20'}`}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input - LOOK PREMIUM (POINT 2) */}
      <div className="bg-slate-950 p-4 rounded-b-[2.5rem] border border-white/10 flex gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <input 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
          placeholder="Écrivez ici..." 
          className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500 transition-all italic font-bold" 
        />
        <button 
          onClick={sendMessage} 
          className="p-4 bg-emerald-500 text-slate-950 rounded-2xl active:scale-90 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

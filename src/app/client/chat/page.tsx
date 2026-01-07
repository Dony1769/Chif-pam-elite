"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, User, Loader2 } from 'lucide-react';

const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";

export default function ClientChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);
      
      // Fetch initial
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .order('created_at', { ascending: true });
      
      setMessages(data || []);
      setLoading(false);

      // Realtime pour le client
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

  if (loading) return <div className="h-screen flex flex-col items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500 mb-4" /></div>;

  return (
    <div className="flex flex-col h-[85vh] p-4 text-white">
      {/* Header */}
      <div className="bg-slate-900/80 p-5 rounded-t-[2.5rem] border border-white/10 flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20"><User className="text-emerald-500" /></div>
        <div><p className="text-[11px] font-black uppercase">Support Chif-Pam</p></div>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-slate-900/20 border-x border-white/5 overflow-y-auto p-6 space-y-6">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm ${m.is_admin ? 'bg-slate-800' : 'bg-emerald-600'}`}>{m.content}</div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="bg-slate-950 p-4 rounded-b-[2.5rem] border border-white/10 flex gap-3">
        <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Écrivez ici..." className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500" />
        <button onClick={sendMessage} className="p-4 bg-emerald-500 text-slate-950 rounded-2xl"><Send size={20} /></button>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Loader2, User } from 'lucide-react';

const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_ID || '9e141172-93db-4df4-a72b-47b89211b46e';

export default function ClientChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      if (authUser) {
        fetchMessages(authUser.id);
        setupRealtime(authUser.id);
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async (userId: string) => {
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const setupRealtime = (userId: string) => {
    return supabase.channel(`chat-${userId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${userId}` 
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const msg = {
      content: newMessage,
      sender_id: user.id,
      receiver_id: ADMIN_ID,
      is_admin: false
    };
    const { error } = await supabase.from('messages').insert([msg]);
    if (!error) {
      setMessages([...messages, { ...msg, created_at: new Date().toISOString() }]);
      setNewMessage('');
    }
  };

  return (
    <div className="flex flex-col h-[85vh] p-4 animate-in fade-in duration-700">
      <div className="bg-slate-900/80 p-4 rounded-t-4xl border-x border-t border-white/5 flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
          <User className="text-emerald-500" size={20} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Support Elite</p>
          <p className="text-[8px] text-slate-500 uppercase font-bold">En ligne</p>
        </div>
      </div>

      <div className="flex-1 bg-slate-900/30 border-x border-white/5 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-xs ${
              m.is_admin 
              ? 'bg-slate-800 text-white rounded-tl-none border border-white/5' 
              : 'bg-emerald-500 text-slate-950 font-bold rounded-tr-none'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="bg-slate-950 p-4 rounded-b-4xl border border-white/5 flex gap-2">
        <input 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Posez votre question..."
          className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-4 text-xs outline-none focus:border-emerald-500 transition-all"
        />
        <button onClick={sendMessage} className="p-3 bg-emerald-500 text-slate-950 rounded-xl active:scale-95 transition-all">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
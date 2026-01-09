"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, User, ChevronLeft, Image as ImageIcon, X } from 'lucide-react';

export default function ClientChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const notificationAudio = typeof window !== "undefined" ? new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3") : null;

  useEffect(() => {
    const initChat = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);
      
      const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`).order('created_at', { ascending: true });
      setMessages(data || []);

      const channel = supabase.channel(`client-${authUser.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.new.receiver_id === authUser.id) {
            notificationAudio?.play().catch(() => {});
            setMessages((prev) => [...prev, payload.new]);
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    };
    initChat();
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const text = newMessage.trim();
    setNewMessage('');
    const { data } = await supabase.from('messages').insert([{ content: text, sender_id: user.id, receiver_id: "9e141172-93db-4df4-a72b-47b89211b46e", is_admin: false }]).select().single();
    if (data) setMessages(prev => [...prev, data]);
  };

  return (
    <div className="flex flex-col h-[94vh] bg-[#020617] text-white">
      {fullscreenImage && (
        <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center" onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} className="max-w-full max-h-full object-contain" />
          <button className="absolute top-5 right-5 text-white bg-white/10 p-2 rounded-full"><X /></button>
        </div>
      )}

      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-white/10 flex items-center gap-4">
        <ChevronLeft className="text-emerald-500" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center font-black text-slate-950">P</div>
          <p className="text-sm font-black italic text-emerald-500 uppercase">Support Pam</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-xl ${m.is_admin ? 'bg-slate-800 rounded-tl-none border border-white/5' : 'bg-emerald-600 rounded-tr-none'}`}>
              {m.image_url && <img src={m.image_url} onClick={() => setFullscreenImage(m.image_url)} className="rounded-xl mb-2 max-w-full" />}
              <p className="text-sm font-bold italic leading-snug">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-950/90 border-t border-white/10 flex gap-2">
        <button className="p-3 text-emerald-500 bg-white/5 rounded-full"><ImageIcon size={20} /></button>
        <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Message..." className="flex-1 bg-slate-900 rounded-full px-5 text-sm outline-none border border-white/5" />
        <button onClick={sendMessage} className="p-3 bg-emerald-500 text-slate-950 rounded-full shadow-lg"><Send size={20} /></button>
      </div>
    </div>
  );
}


"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Image as ImageIcon, Mic, Loader2, User, Phone } from 'lucide-react';

export default function AdminChat() {
  const [convs, setConvs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";

  useEffect(() => {
    fetchConvs();
    const sub = supabase.channel('admin-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchConvs())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
        if(selected && p.new.conversation_id === selected.id) setMessages(prev => [...prev, p.new]);
    }).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [selected]);

  const fetchConvs = async () => {
    const { data } = await supabase.from('conversations').select('*, profiles:client_id(phone, username)').order('last_message_at', { ascending: false });
    setConvs(data || []);
  };

  const selectUser = async (c: any) => {
    setSelected(c);
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', c.id).order('created_at', { ascending: true });
    setMessages(data || []);
    await supabase.from('conversations').update({ unread_count_admin: 0 }).eq('id', c.id);
  };

  const send = async () => {
    if (!text.trim() || !selected) return;
    await supabase.from('messages').insert([{
      conversation_id: selected.id,
      sender_id: ADMIN_ID,
      receiver_id: selected.client_id,
      content: text,
      is_admin: true
    }]);
    setText("");
  };

  useEffect(() => { scroll.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="flex h-screen bg-[#020617] text-white font-black italic uppercase overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-slate-900/20">
        <div className="p-6 border-b border-white/5 text-emerald-500 tracking-widest text-xl">CHATS</div>
        <div className="flex-1 overflow-y-auto">
          {convs.map(c => (
            <button key={c.id} onClick={() => selectUser(c)} className={`w-full p-4 flex items-center gap-4 border-b border-white/5 transition-all ${selected?.id === c.id ? 'bg-emerald-500/10 border-r-4 border-r-emerald-500' : ''}`}>
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center"><Phone size={18}/></div>
              <div className="text-left flex-1 truncate">
                <p className="text-xs">{c.profiles?.phone || 'Inconnu'}</p>
                <p className="text-[10px] opacity-40 lowercase not-italic truncate">{c.last_message}</p>
              </div>
              {c.unread_count_admin > 0 && <span className="bg-rose-500 w-5 h-5 rounded-full text-[10px] flex items-center justify-center">{c.unread_count_admin}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.is_admin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-4 rounded-3xl ${m.is_admin ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                    {m.image_url && <img src={m.image_url} className="rounded-xl mb-2 max-h-60" />}
                    <p className="text-xs lowercase not-italic font-bold">{m.content}</p>
                  </div>
                </div>
              ))}
              <div ref={scroll} />
            </div>
            <div className="p-6 bg-slate-950/50 border-t border-white/5 flex gap-4">
              <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} className="flex-1 bg-slate-900 rounded-2xl px-6 py-4 outline-none border border-white/5 focus:border-emerald-500/50" placeholder="RÉPONDRE AU CLIENT..." />
              <button onClick={send} className="px-8 bg-emerald-500 text-slate-950 rounded-2xl font-black">ENVOYER</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center opacity-10">SÉLECTIONNEZ UNE DISCUSSION</div>
        )}
      </div>
    </div>
  );
}


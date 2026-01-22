"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, ChevronLeft, Image as ImageIcon, Mic, X, Loader2, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClientChat() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";

  useEffect(() => {
    init();
    const sub = supabase.channel('client-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
      setChat(prev => [...prev, p.new]);
      resetUnread();
    }).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const init = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${u?.id},receiver_id.eq.${u?.id}`).order('created_at', { ascending: true });
    setChat(data || []);
    setLoading(false);
    resetUnread();
  };

  const resetUnread = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    await supabase.from('conversations').update({ unread_count_client: 0 }).eq('client_id', u?.id);
  };

  const send = async (content: string, type: 'text' | 'image' | 'voice' = 'text', url?: string) => {
    if (!content.trim() && !url) return;
    const { data: conv } = await supabase.from('conversations').select('id').eq('client_id', user.id).single();
    await supabase.from('messages').insert([{
      conversation_id: conv?.id,
      sender_id: user.id,
      receiver_id: ADMIN_ID,
      content: type === 'text' ? content : `[${type}]`,
      image_url: type === 'image' ? url : null,
      voice_url: type === 'voice' ? url : null,
      is_admin: false
    }]);
    setMsg("");
  };

  useEffect(() => { scroll.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-white font-black italic uppercase overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-slate-900/50">
        <button onClick={() => router.back()}><ChevronLeft className="text-emerald-500" /></button>
        <span className="tracking-tighter">Support Elite</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${m.is_admin ? 'bg-slate-800' : 'bg-emerald-600'}`}>
              {m.image_url && <img src={m.image_url} className="rounded-lg mb-2" />}
              {m.voice_url && <audio src={m.voice_url} controls className="w-full h-8" />}
              <p className="text-xs lowercase not-italic leading-tight">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={scroll} />
      </div>

      <div className="p-4 bg-slate-950 border-t border-white/5 flex gap-2 items-center">
        <button className="p-3 bg-white/5 rounded-xl text-emerald-500"><ImageIcon size={20}/></button>
        <button className="p-3 bg-white/5 rounded-xl text-emerald-500"><Mic size={20}/></button>
        <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send(msg)} className="flex-1 bg-slate-900 rounded-xl px-4 py-3 text-xs outline-none border border-white/5" placeholder="MESSAGE..." />
        <button onClick={()=>send(msg)} className="p-3 bg-emerald-500 text-slate-950 rounded-xl"><Send size={20}/></button>
      </div>
    </div>
  );
}


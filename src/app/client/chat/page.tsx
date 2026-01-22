"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, ChevronLeft, Image as ImageIcon, Loader2, CheckCheck, Mic } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";

export default function ClientChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);
      
      // Charger messages
      const { data } = await supabase.from('messages')
        .select('*').or(`sender_id.eq.${u.id},receiver_id.eq.${u.id}`)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      
      // Reset compteur sur last_messages
      await supabase.from('last_messages').update({ unread_count: 0 }).eq('user_id', u.id);
      setLoading(false);
    };
    init();

    const channel = supabase.channel('client-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        // Si admin envoie, on reset le compteur car on est sur la page
        if (payload.new.sender_id === ADMIN_ID) {
            supabase.from('last_messages').update({ unread_count: 0 }).eq('user_id', payload.new.receiver_id).then();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (content: string, type = 'text', url = '') => {
    if (!content.trim() && !url) return;
    const msg = { sender_id: user.id, receiver_id: ADMIN_ID, content, image_url: type === 'img' ? url : null, is_admin: false };
    
    // 1. Insert message
    await supabase.from('messages').insert([msg]);
    
    // 2. Update Sync Table (Pour l'admin)
    const { data: exists } = await supabase.from('last_messages').select('unread_count').eq('user_id', user.id).single();
    const newCount = (exists?.unread_count || 0) + 1;
    
    await supabase.from('last_messages').upsert({
      user_id: user.id,
      last_content: content,
      unread_count: newCount,
      sender_id: user.id,
      updated_at: new Date().toISOString()
    });
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-white">
      <div className="p-4 bg-slate-900 flex items-center gap-4 border-b border-white/5">
        <button onClick={() => router.back()}><ChevronLeft /></button>
        <span className="font-black italic uppercase tracking-tighter text-emerald-500">Support Elite</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${m.is_admin ? 'bg-slate-800' : 'bg-emerald-600'}`}>
              {m.image_url && <img src={m.image_url} className="rounded-lg mb-2" />}
              <p className="text-xs font-bold">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-slate-950 flex gap-2">
        <input 
          value={newMessage} onChange={e => setNewMessage(e.target.value)}
          className="flex-1 bg-slate-900 p-4 rounded-xl outline-none text-xs font-bold"
          placeholder="Message..."
        />
        <button onClick={() => send(newMessage)} className="p-4 bg-emerald-500 text-black rounded-xl"><Send size={20}/></button>
      </div>
    </div>
  );
}

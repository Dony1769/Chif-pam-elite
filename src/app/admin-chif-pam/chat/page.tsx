"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Search, User as UserIcon } from 'lucide-react';

const ADMIN_ID = '9e141172-93db-4df4-a72b-47b89211b46e';

export default function AdminChat() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    // Realtime global pour les notifications de nouveaux clients
    const channel = supabase.channel('admin-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (selectedUser) fetchMessages(selectedUser);
  }, [selectedUser]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchConversations = async () => {
    const { data } = await supabase.from('profiles').select('*').order('last_active', { ascending: false });
    setProfiles(data || []);
  };

  const fetchMessages = async (userId: string) => {
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const sendResponse = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    const { error } = await supabase.from('messages').insert([{
      content: newMessage,
      sender_id: ADMIN_ID,
      receiver_id: selectedUser,
      is_admin: true
    }]);
    if (!error) {
      setMessages([...messages, { content: newMessage, is_admin: true, created_at: new Date().toISOString() }]);
      setNewMessage('');
    }
  };

  return (
    <div className="flex h-[80vh] gap-4 p-4">
      {/* Liste des conversations */}
      <div className="w-1/3 bg-slate-900/50 rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/5 font-black uppercase text-[10px] tracking-widest text-slate-500">Messages Clients</div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {profiles.map(p => (
            <button key={p.id} onClick={() => setSelectedUser(p.id)} className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${selectedUser === p.id ? 'bg-emerald-500 text-slate-950' : 'hover:bg-white/5'}`}>
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-[10px]">{p.phone.slice(-2)}</div>
              <div className="text-left">
                <p className="text-xs font-bold">+{p.phone}</p>
                <p className={`text-[8px] uppercase font-black ${selectedUser === p.id ? 'text-slate-900' : 'text-emerald-500'}`}>Actif</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Zone de Chat */}
      <div className="flex-1 bg-slate-900/30 rounded-[3.5rem] border border-white/5 flex flex-col overflow-hidden relative">
        {selectedUser ? (
          <>
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.is_admin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-4 rounded-3xl text-xs ${
                    m.is_admin 
                    ? 'bg-emerald-500 text-slate-950 font-bold rounded-tr-none' 
                    : 'bg-slate-800 text-white rounded-tl-none border border-white/5'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div className="p-6 bg-slate-950 flex gap-3">
              <input 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendResponse()}
                placeholder="Répondre au client..."
                className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-emerald-500 transition-all"
              />
              <button onClick={sendResponse} className="p-4 bg-emerald-500 text-slate-950 rounded-2xl active:scale-95 transition-all">
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 italic">
            <UserIcon size={48} className="opacity-10 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Sélectionnez une conversation pour répondre</p>
          </div>
        )}
      </div>
    </div>
  );
}
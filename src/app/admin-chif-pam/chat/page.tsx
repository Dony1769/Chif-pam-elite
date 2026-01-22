"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Send, User as UserIcon, ImageIcon, CheckCheck, Volume2 } from "lucide-react";

const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";

export default function AdminChat() {
  const [syncList, setSyncList] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSyncList();
    const channel = supabase.channel('admin-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'last_messages' }, () => fetchSyncList())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.new.sender_id === selectedUser || payload.new.receiver_id === selectedUser) {
              setMessages(prev => [...prev, payload.new]);
          }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedUser]);

  const fetchSyncList = async () => {
    const { data } = await supabase.from('last_messages')
      .select('*, profiles:user_id(phone)')
      .order('updated_at', { ascending: false });
    setSyncList(data || []);
  };

  const selectUser = async (uid: string) => {
    setSelectedUser(uid);
    const { data } = await supabase.from('messages')
      .select('*').or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    // Marquer comme lu
    await supabase.from('last_messages').update({ unread_count: 0 }).eq('user_id', uid);
  };

  const sendResponse = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    const content = newMessage;
    setNewMessage("");

    await supabase.from('messages').insert([{
      content, sender_id: ADMIN_ID, receiver_id: selectedUser, is_admin: true
    }]);

    await supabase.from('last_messages').upsert({
      user_id: selectedUser,
      last_content: content,
      unread_count: 0,
      sender_id: ADMIN_ID,
      updated_at: new Date().toISOString()
    });
  };

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div className="flex h-screen bg-[#020617] text-white p-4 gap-4 overflow-hidden">
      {/* Sidebar Sync List */}
      <div className="w-80 bg-slate-900/50 rounded-3xl border border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5 font-black uppercase italic text-emerald-500">Conversations</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {syncList.map((chat) => (
            <button key={chat.user_id} onClick={() => selectUser(chat.user_id)} className={`w-full p-4 rounded-2xl flex items-center justify-between ${selectedUser === chat.user_id ? 'bg-emerald-500 text-black' : 'bg-white/5'}`}>
              <div className="text-left">
                <p className="text-xs font-black">{chat.profiles?.phone || 'Client'}</p>
                <p className="text-[10px] opacity-70 truncate w-40">{chat.last_content}</p>
              </div>
              {chat.unread_count > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-1 rounded-full animate-bounce">{chat.unread_count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-slate-900/20 rounded-3xl border border-white/5 flex flex-col">
        {selectedUser ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                  <div className={`p-3 rounded-2xl max-w-[70%] ${m.is_admin ? "bg-emerald-600" : "bg-slate-800"}`}>
                    <p className="text-xs font-bold">{m.content}</p>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div className="p-4 flex gap-2">
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendResponse()} className="flex-1 bg-slate-900 p-4 rounded-xl outline-none" placeholder="Répondre..."/>
              <button onClick={sendResponse} className="p-4 bg-emerald-500 text-black rounded-xl"><Send/></button>
            </div>
          </>
        ) : <div className="flex-1 flex items-center justify-center opacity-20 italic">Sélectionnez un client</div>}
      </div>
    </div>
  );
}


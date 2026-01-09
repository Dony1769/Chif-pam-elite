"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Send, User, Loader2, ChevronLeft, Image as ImageIcon, CheckCheck } from 'lucide-react';

const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";

export default function ClientChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const initChat = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);
      
      const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`).order('created_at', { ascending: true });
      setMessages(data || []);
      setLoading(false);

      const channel = supabase.channel(`client-chat-${authUser.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.new.sender_id === authUser.id || payload.new.receiver_id === authUser.id) {
            setMessages((prev) => [...prev, payload.new]);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setUploading(true);
      const filePath = `${user.id}/${Math.random()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('chat-attachments').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);

      await supabase.from('messages').insert([{
        content: "📷 Photo",
        image_url: publicUrl,
        sender_id: user.id,
        receiver_id: ADMIN_ID,
        is_admin: false
      }]);
    } catch (err) { alert("Erreur d'envoi"); } finally { setUploading(false); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const text = newMessage.trim();
    setNewMessage('');
    await supabase.from('messages').insert([{ content: text, sender_id: user.id, receiver_id: ADMIN_ID, is_admin: false }]);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="flex flex-col h-[94vh] bg-[#020617] text-white">
      {/* Header Premium */}
      <div className="p-4 bg-slate-900/90 backdrop-blur-md border-b border-white/10 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-full transition-all"><ChevronLeft className="text-emerald-500" /></button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center font-black text-slate-950">P</div>
          <div>
            <p className="text-sm font-black uppercase italic tracking-tighter text-emerald-500">Support Chif-Pam</p>
            <p className="text-[9px] text-emerald-500/60 uppercase font-bold animate-pulse">En ligne</p>
          </div>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'} animate-in fade-in duration-300`}>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-lg ${m.is_admin ? 'bg-slate-800 rounded-tl-none' : 'bg-emerald-600 rounded-tr-none'}`}>
              {m.image_url && <img src={m.image_url} className="rounded-xl mb-2 max-w-full" alt="image" />}
              <p className="text-sm font-bold italic">{m.content}</p>
              <p className="text-[8px] mt-1 opacity-50 text-right">{new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input bar WhatsApp style */}
      <div className="p-4 bg-slate-950/90 border-t border-white/10 flex gap-2 items-center">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        <button onClick={() => fileInputRef.current?.click()} className="p-3 text-emerald-500 bg-white/5 rounded-full">
           {uploading ? <Loader2 className="animate-spin" /> : <ImageIcon size={20} />}
        </button>
        <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Message..." className="flex-1 bg-slate-900 border-none rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
        <button onClick={sendMessage} className="p-3 bg-emerald-500 text-slate-950 rounded-full shadow-lg shadow-emerald-500/20 active:scale-90 transition-all"><Send size={20} /></button>
      </div>
    </div>
  );
}


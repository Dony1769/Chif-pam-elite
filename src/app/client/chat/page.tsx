"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Send, User, Loader2, ChevronLeft, Image as ImageIcon, CheckCheck, X } from 'lucide-react';

const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";

export default function ClientChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
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

      const channel = supabase.channel(`chat-${authUser.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${authUser.id}` }, (payload) => {
            setMessages((prev) => [...prev, payload.new]);
            supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    };
    initChat();
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setUploading(true);
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      await supabase.storage.from('chat-attachments').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);

      await supabase.from('messages').insert([{
        content: "📷 Photo",
        image_url: publicUrl,
        sender_id: user.id,
        receiver_id: ADMIN_ID,
        is_admin: false
      }]);
    } catch (err) { alert("Erreur"); } finally { setUploading(false); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const text = newMessage.trim();
    setNewMessage('');
    await supabase.from('messages').insert([{ content: text, sender_id: user.id, receiver_id: ADMIN_ID, is_admin: false }]);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="flex flex-col h-[94vh] bg-[#020617] text-white overflow-hidden">
      {/* MODAL IMAGE */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center p-2" onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} className="max-w-full max-h-full object-contain" alt="Plein écran" />
          <button className="absolute top-5 right-5 bg-white/10 p-2 rounded-full"><X /></button>
        </div>
      )}

      {/* Header */}
      <div className="p-4 bg-slate-900/90 border-b border-white/10 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2"><ChevronLeft className="text-emerald-500" /></button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center font-black text-slate-950">P</div>
          <p className="text-sm font-black uppercase italic text-emerald-500">Support Chif-Pam</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-lg ${m.is_admin ? 'bg-slate-800 rounded-tl-none' : 'bg-emerald-600 rounded-tr-none'}`}>
              {m.image_url && (
                <img src={m.image_url} onClick={() => setFullscreenImage(m.image_url)} className="rounded-xl mb-2 max-w-full cursor-pointer active:scale-95 transition-transform" alt="img" />
              )}
              <p className="text-sm font-bold italic leading-snug">{m.content}</p>
              <div className="text-[8px] opacity-40 text-right mt-1">{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-950/90 border-t border-white/10 flex gap-2 items-center">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        <button onClick={() => fileInputRef.current?.click()} className="p-3 text-emerald-500 bg-white/5 rounded-full">
           {uploading ? <Loader2 className="animate-spin" /> : <ImageIcon size={20} />}
        </button>
        <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Message..." className="flex-1 bg-slate-900 rounded-full px-5 py-3 text-sm outline-none font-bold" />
        <button onClick={sendMessage} className="p-3 bg-emerald-500 text-slate-950 rounded-full active:scale-90"><Send size={20} /></button>
      </div>
    </div>
  );
}

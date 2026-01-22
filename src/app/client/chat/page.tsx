"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Send, ChevronLeft, Image as ImageIcon, X, Loader2, CheckCheck } from 'lucide-react';

export default function ClientChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const notificationAudio = typeof window !== "undefined" ? new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3") : null;

  // FONCTION CLÉ : Marquer comme lu
  const markAsRead = async (userId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);
  };

  useEffect(() => {
    const initChat = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);
      
      // 1. Marquer les messages comme lus dès l'entrée
      await markAsRead(authUser.id);

      // 2. Charger l'historique
      const { data } = await supabase.from('messages')
        .select('*')
        .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .order('created_at', { ascending: true });
      setMessages(data || []);

      // 3. Écoute temps réel
      const channel = supabase.channel(`chat-sync-${authUser.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, async (payload) => {
          // Si c'est un message reçu, on joue le son et on marque comme lu direct
          if (payload.new.receiver_id === authUser.id) {
            notificationAudio?.play().catch(() => {});
            await markAsRead(authUser.id);
          }
          setMessages((prev) => [...prev, payload.new]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    initChat();
  }, []);

  useEffect(() => { 
    if (messages.length) {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); 
    }
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      const filePath = `client/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);

      const { data: insertedMsg } = await supabase.from('messages').insert([{
        content: "📷 Photo",
        image_url: publicUrl,
        sender_id: user.id,
        receiver_id: "9e141172-93db-4df4-a72b-47b89211b46e", // Ton ID Admin
        is_admin: false,
        is_read: false
      }]).select().single();

      if (insertedMsg) setMessages(prev => [...prev, insertedMsg]);
    } catch (err) {
      alert("Erreur envoi image");
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const text = newMessage.trim();
    setNewMessage('');
    
    const { data } = await supabase.from('messages').insert([{ 
      content: text, 
      sender_id: user.id, 
      receiver_id: "9e141172-93db-4df4-a72b-47b89211b46e", 
      is_admin: false,
      is_read: false 
    }]).select().single();
    
    if (data) setMessages(prev => [...prev, data]);
  };

  return (
    <div className="flex flex-col h-[100vh] bg-[#020617] text-white overflow-hidden font-black italic uppercase">
      {/* Zoom Image */}
      <AnimatePresence>
        {fullscreenImage && (
            <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
                <img src={fullscreenImage} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
                <button className="absolute top-8 right-8 text-white bg-white/10 p-3 rounded-full"><X /></button>
            </div>
        )}
      </AnimatePresence>

      {/* Header Premium */}
      <div className="p-5 bg-slate-900/80 backdrop-blur-xl border-b border-emerald-500/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl text-emerald-500 active:scale-90 transition-all">
                <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-2xl flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/20">P</div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-slate-900 rounded-full"></div>
                </div>
                <div>
                    <p className="text-sm tracking-tighter text-emerald-500">Support Pam</p>
                    <p className="text-[8px] tracking-widest opacity-50">Réponse instantanée</p>
                </div>
            </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[80%] space-y-2`}>
                <div className={`p-4 rounded-3xl shadow-2xl ${
                m.is_admin 
                    ? 'bg-slate-800 rounded-tl-none border border-white/5' 
                    : 'bg-emerald-600 rounded-tr-none text-white'
                }`}>
                {m.image_url && (
                    <img 
                    src={m.image_url} 
                    onClick={() => setFullscreenImage(m.image_url)} 
                    className="rounded-2xl mb-3 max-w-full cursor-zoom-in hover:brightness-110 transition-all" 
                    alt="attachment"
                    />
                )}
                <p className="text-xs font-black leading-relaxed lowercase not-italic">{m.content}</p>
                </div>
                <div className={`flex items-center gap-2 ${m.is_admin ? 'justify-start' : 'justify-end'} px-1`}>
                    <p className="text-[7px] opacity-30 tracking-[0.2em]">
                        {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </p>
                    {!m.is_admin && <CheckCheck size={10} className={m.is_read ? "text-blue-400" : "text-white/20"} />}
                </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input de saisie */}
      <div className="p-6 bg-slate-950/80 backdrop-blur-md border-t border-white/5 flex gap-3 items-center">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-4 text-emerald-500 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"
        >
          {uploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
        </button>
        
        <input 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
          placeholder="Message..." 
          className="flex-1 bg-slate-900 rounded-2xl px-6 py-4 text-xs font-bold outline-none border border-white/5 focus:border-emerald-500/40 transition-all" 
        />
        
        <button 
          onClick={sendMessage} 
          className="p-4 bg-emerald-500 text-slate-950 rounded-2xl shadow-[0_10px_20px_rgba(16,185,129,0.3)] active:scale-90 transition-all"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

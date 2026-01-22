"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Send, ChevronLeft, Image as ImageIcon, X, Loader2 } from 'lucide-react';

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

  // FONCTION CRUCIALE : Marquer les messages comme lus
  const markAsRead = async (userId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', userId)
      .eq('is_admin', true) // On ne marque que les messages de l'admin
      .eq('is_read', false);
  };

  useEffect(() => {
    const initChat = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);
      
      // 1. Marquer les anciens messages comme lus dès l'entrée
      await markAsRead(authUser.id);

      // 2. Chargement initial
      const { data } = await supabase.from('messages')
        .select('*')
        .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .order('created_at', { ascending: true });
      setMessages(data || []);

      // 3. Écoute en temps réel
      const channel = supabase.channel(`client-chat-${authUser.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${authUser.id}` 
        }, async (payload) => {
          notificationAudio?.play().catch(() => {});
          
          // Si on reçoit un message alors qu'on est sur la page, on le marque lu direct en DB
          await supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id);
          
          setMessages((prev) => [...prev, { ...payload.new, is_read: true }]);
        })
        .subscribe();

      return () => { 
        supabase.removeChannel(channel);
        // On re-marque comme lu en sortant par sécurité
        markAsRead(authUser.id);
      };
    };
    initChat();
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      const filePath = `client/${user.id}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      const { data: insertedMsg } = await supabase.from('messages').insert([{
        content: "📷 Photo",
        image_url: publicUrl,
        sender_id: user.id,
        receiver_id: "9e141172-93db-4df4-a72b-47b89211b46e", // ID de l'admin
        is_admin: false,
        is_read: false
      }]).select().single();

      if (insertedMsg) setMessages(prev => [...prev, insertedMsg]);
    } catch (err) {
      console.error(err);
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
    <div className="flex flex-col h-screen bg-[#020617] text-white overflow-hidden font-black italic uppercase">
      {/* Zoom Image */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} className="max-w-full max-h-full object-contain rounded-3xl" />
          <button className="absolute top-5 right-5 text-white bg-white/10 p-2 rounded-full"><X /></button>
        </div>
      )}

      {/* Header Premium */}
      <div className="p-5 bg-slate-900/90 backdrop-blur-xl border-b border-white/5 flex items-center gap-4">
        <button 
          onClick={() => router.back()} 
          className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all text-emerald-500"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center font-black text-slate-950 text-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">P</div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-slate-900 rounded-full"></div>
          </div>
          <div>
            <p className="text-sm tracking-tighter text-emerald-500">Support Pam</p>
            <p className="text-[8px] text-emerald-500/50 tracking-widest mt-0.5">SÉCURISÉ // EN LIGNE</p>
          </div>
        </div>
      </div>

      {/* Zone des messages - Design Matrix */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/20 to-[#020617]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] p-4 rounded-[2rem] shadow-2xl transition-all relative overflow-hidden ${
              m.is_admin 
                ? 'bg-slate-900 rounded-tl-none border border-white/5 text-slate-100' 
                : 'bg-emerald-600 rounded-tr-none text-white shadow-emerald-900/20'
            }`}>
              {m.image_url && (
                <img 
                  src={m.image_url} 
                  onClick={() => setFullscreenImage(m.image_url)} 
                  className="rounded-2xl mb-3 max-w-full cursor-zoom-in hover:brightness-110 transition-all" 
                  alt="Pièce jointe"
                />
              )}
              <p className="text-sm font-black leading-snug whitespace-pre-wrap lowercase not-italic">{m.content}</p>
              <p className="text-[7px] mt-2 opacity-40 text-right tracking-[0.2em]">
                {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input Elite */}
      <div className="p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 flex gap-3 items-center">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-4 text-emerald-500 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 active:scale-90 transition-all"
        >
          {uploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
        </button>
        
        <input 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
          placeholder="ÉCRIRE AU SUPPORT..." 
          className="flex-1 bg-white/5 rounded-2xl px-6 py-4 text-xs font-black outline-none border border-white/5 focus:border-emerald-500/50 transition-all placeholder:text-slate-700" 
        />
        
        <button 
          onClick={sendMessage} 
          className="p-4 bg-emerald-500 text-slate-950 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-90 transition-all"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

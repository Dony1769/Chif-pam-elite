"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Send, ChevronLeft, Image as ImageIcon, X, Loader2, CheckCheck } from 'lucide-react';

export default function ClientChat() {
  const router = useRouter();
  const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notificationAudio = typeof window !== "undefined" ? new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3") : null;

  // PERFECTION 650% : Une seule source de vérité (la table messages)
  const markAsRead = async (userId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', ADMIN_ID)
        .eq('is_read', false);
      // La VUE latest_message_per_conversation se mettra à jour instantanément côté SQL
    } catch (error) {
      console.error("Sync Error:", error);
    }
  };

  useEffect(() => {
    const initChat = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);
      
      await markAsRead(authUser.id);

      const { data } = await supabase.from('messages')
        .select('*')
        .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .order('created_at', { ascending: true });
      setMessages(data || []);

      const channel = supabase.channel(`chat-sync-${authUser.id}`)
        .on('postgres_changes', { 
          event: '*', // INSERT pour les nouveaux messages, UPDATE pour les vus (CheckCheck)
          schema: 'public', 
          table: 'messages'
        }, async (payload) => {
          if (payload.eventType === 'INSERT') {
            const msg = payload.new;
            if (msg.sender_id === ADMIN_ID && msg.receiver_id === authUser.id) {
              notificationAudio?.play().catch(() => {});
              await markAsRead(authUser.id); // On marque comme lu immédiatement si on est sur la page
            }
            setMessages((prev) => [...prev, msg]);
          } 
          
          if (payload.eventType === 'UPDATE') {
            // Pour mettre à jour les icônes de lecture (CheckCheck) en temps réel
            setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
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
    
    const { data } = await supabase.from('messages').insert([{ 
      content: text, 
      sender_id: user.id, 
      receiver_id: ADMIN_ID, 
      is_admin: false,
      is_read: false 
    }]).select().single();
    
    if (data) setMessages(prev => [...prev, data]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setUploading(true);
      const filePath = `client/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);

      await supabase.from('messages').insert([{
        content: "📷 Photo",
        image_url: publicUrl,
        sender_id: user.id,
        receiver_id: ADMIN_ID,
        is_admin: false,
        is_read: false
      }]);
    } catch (err) { alert("Erreur d'envoi"); } finally { setUploading(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-white font-black italic uppercase">
      {/* Zoom Image */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl shadow-emerald-500/10" alt="fullscreen" />
        </div>
      )}

      {/* Header Premium */}
      <div className="p-5 bg-slate-900/80 backdrop-blur-md border-b border-emerald-500/10 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-3 text-emerald-500 bg-white/5 rounded-2xl active:scale-90 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-2xl flex items-center justify-center text-slate-950 font-black text-xl">P</div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-slate-900 rounded-full animate-pulse"></div>
          </div>
          <div>
            <p className="text-sm tracking-tighter text-emerald-500">Support Pam</p>
            <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Membre du staff</p>
          </div>
        </div>
      </div>

      {/* Zone Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] space-y-1`}>
                <div className={`p-4 rounded-[1.5rem] shadow-xl ${m.is_admin ? 'bg-slate-800 rounded-tl-none border border-white/5' : 'bg-emerald-600 rounded-tr-none shadow-emerald-900/20'}`}>
                  {m.image_url && <img src={m.image_url} onClick={() => setFullscreenImage(m.image_url)} className="rounded-xl mb-3 cursor-zoom-in hover:brightness-110 transition-all" alt="attachment" />}
                  <p className="text-xs font-bold leading-relaxed lowercase not-italic tracking-tight">{m.content}</p>
                </div>
                <div className={`flex items-center gap-2 px-1 ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
                    <span className="text-[7px] opacity-30 tracking-widest">{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    {!m.is_admin && <CheckCheck size={10} className={m.is_read ? "text-emerald-400" : "text-white/20"} />}
                </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input Premium */}
      <div className="p-6 bg-slate-950 border-t border-white/5 flex gap-3 items-center">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        <button onClick={() => fileInputRef.current?.click()} className="p-4 text-emerald-500 bg-white/5 rounded-[1.2rem]">
          {uploading ? <Loader2 className="animate-spin" /> : <ImageIcon size={22} />}
        </button>
        <input 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Écrivez ici..." 
          className="flex-1 bg-slate-900 rounded-[1.2rem] px-6 py-4 text-xs font-bold outline-none border border-white/5 focus:border-emerald-500/30 transition-all" 
        />
        <button onClick={sendMessage} className="p-4 bg-emerald-500 text-slate-950 rounded-[1.2rem]">
          <Send size={22} />
        </button>
      </div>
    </div>
  );
}

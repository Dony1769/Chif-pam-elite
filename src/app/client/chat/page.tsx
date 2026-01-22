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

  // FONCTION CRUCIALE : Le client marque comme lus les messages reçus de l'admin
  const markAdminMessagesAsRead = async (userId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', userId) // C'est moi qui reçoit
      .eq('sender_id', ADMIN_ID)  // C'est l'admin qui envoie
      .eq('is_read', false);
    
    if (error) console.error("Erreur de marquage:", error);
  };

  useEffect(() => {
    const initChat = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);
      
      // 1. On marque tout comme lu dès qu'il entre
      await markAdminMessagesAsRead(authUser.id);

      // 2. Charger l'historique complet
      const { data } = await supabase.from('messages')
        .select('*')
        .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .order('created_at', { ascending: true });
      setMessages(data || []);

      // 3. Temps réel
      const channel = supabase.channel(`chat-sync-${authUser.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, async (payload) => {
          // Si l'admin m'envoie un message alors que je suis sur la page
          if (payload.new.sender_id === ADMIN_ID && payload.new.receiver_id === authUser.id) {
            notificationAudio?.play().catch(() => {});
            // On le marque immédiatement comme lu en base de données
            await markAdminMessagesAsRead(authUser.id);
          }
          setMessages((prev) => [...prev, payload.new]);
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

      const { data: insertedMsg } = await supabase.from('messages').insert([{
        content: "📷 Photo",
        image_url: publicUrl,
        sender_id: user.id,
        receiver_id: ADMIN_ID,
        is_admin: false,
        is_read: false
      }]).select().single();
      if (insertedMsg) setMessages(prev => [...prev, insertedMsg]);
    } catch (err) { alert("Erreur d'envoi"); } finally { setUploading(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-white font-black italic uppercase">
      {/* Zoom Image */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      )}

      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-emerald-500/10 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 text-emerald-500 bg-white/5 rounded-xl"><ChevronLeft /></button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-slate-950">P</div>
          <div>
            <p className="text-xs text-emerald-500">Support Pam</p>
            <p className="text-[8px] opacity-50">En ligne</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl ${m.is_admin ? 'bg-slate-800' : 'bg-emerald-600'}`}>
              {m.image_url && <img src={m.image_url} onClick={() => setFullscreenImage(m.image_url)} className="rounded-lg mb-2 cursor-pointer" />}
              <p className="text-xs lowercase not-italic">{m.content}</p>
              <div className="flex justify-end items-center gap-1 mt-1">
                <span className="text-[7px] opacity-40">{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                {!m.is_admin && <CheckCheck size={10} className={m.is_read ? "text-blue-400" : "text-white/20"} />}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-950 border-t border-white/5 flex gap-2">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white/5 text-emerald-500 rounded-xl">
          {uploading ? <Loader2 className="animate-spin" /> : <ImageIcon />}
        </button>
        <input 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Message..." 
          className="flex-1 bg-slate-900 rounded-xl px-4 text-xs outline-none border border-white/5" 
        />
        <button onClick={sendMessage} className="p-3 bg-emerald-500 text-slate-950 rounded-xl"><Send /></button>
      </div>
    </div>
  );
}


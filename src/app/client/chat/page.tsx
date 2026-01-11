"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation'; // Pour le bouton retour
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
  
  // Notification sonore lors de la réception d'un message admin
  const notificationAudio = typeof window !== "undefined" ? new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3") : null;

  useEffect(() => {
    const initChat = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);
      
      // Chargement initial des messages
      const { data } = await supabase.from('messages')
        .select('*')
        .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .order('created_at', { ascending: true });
      setMessages(data || []);

      // Écoute en temps réel des messages entrants uniquement
      const channel = supabase.channel(`client-chat-${authUser.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${authUser.id}` 
        }, (payload) => {
          notificationAudio?.play().catch(() => {});
          setMessages((prev) => [...prev, payload.new]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    initChat();
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Fonction pour envoyer des images (Client vers Admin)
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
        receiver_id: "9e141172-93db-4df4-a72b-47b89211b46e",
        is_admin: false
      }]).select().single();

      if (insertedMsg) setMessages(prev => [...prev, insertedMsg]);
    } catch (err) {
      alert("Erreur lors de l'envoi de l'image");
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
      is_admin: false 
    }]).select().single();
    
    if (data) setMessages(prev => [...prev, data]);
  };

  return (
    <div className="flex flex-col h-[100vh] sm:h-[94vh] bg-[#020617] text-white overflow-hidden">
      {/* Zoom Image */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} className="max-w-full max-h-full object-contain rounded-lg" />
          <button className="absolute top-5 right-5 text-white bg-white/10 p-2 rounded-full"><X /></button>
        </div>
      )}

      {/* Header avec bouton retour fonctionnel */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-white/10 flex items-center gap-4">
        <button 
          onClick={() => router.back()} 
          className="p-2 hover:bg-white/5 rounded-full transition-colors text-emerald-500"
        >
          <ChevronLeft size={28} />
        </button>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center font-black text-slate-950">P</div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
          </div>
          <div>
            <p className="text-sm font-black italic text-emerald-500 uppercase leading-none">Support Pam</p>
            <p className="text-[10px] text-emerald-500/60 font-bold uppercase mt-1">En ligne</p>
          </div>
        </div>
      </div>

      {/* Zone des messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-xl transition-all ${
              m.is_admin 
                ? 'bg-slate-800 rounded-tl-none border border-white/5 text-slate-100' 
                : 'bg-emerald-600 rounded-tr-none text-white'
            }`}>
              {m.image_url && (
                <img 
                  src={m.image_url} 
                  onClick={() => setFullscreenImage(m.image_url)} 
                  className="rounded-xl mb-2 max-w-full cursor-zoom-in hover:opacity-90 transition-opacity" 
                  alt="Pièce jointe"
                />
              )}
              <p className="text-sm font-bold italic leading-snug whitespace-pre-wrap">{m.content}</p>
              <p className="text-[9px] mt-1 opacity-50 text-right">
                {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input de saisie avec Upload */}
      <div className="p-4 bg-slate-950 border-t border-white/10 flex gap-2 items-center">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept="image/*" 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-3 text-emerald-500 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
        >
          {uploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
        </button>
        
        <input 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
          placeholder="Tapez votre message..." 
          className="flex-1 bg-slate-900 rounded-full px-5 py-3 text-sm outline-none border border-white/5 focus:border-emerald-500/50 transition-all" 
        />
        
        <button 
          onClick={sendMessage} 
          className="p-3 bg-emerald-500 text-slate-950 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

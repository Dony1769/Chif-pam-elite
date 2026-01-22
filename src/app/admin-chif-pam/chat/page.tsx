"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User as UserIcon, Loader2, Image as ImageIcon, CheckCheck, X, Volume2 } from "lucide-react";

const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";

export default function AdminChat() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notificationAudio = typeof window !== "undefined" ? new Audio("/sounds/win.mp3") : null;

  // 1. CHARGEMENT INITIAL
  useEffect(() => {
    fetchConversations();

    const channel = supabase.channel('admin-sync-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const { eventType, new: newMsg } = payload;

        if (eventType === 'INSERT') {
          // Si le message est pour l'admin
          if (newMsg.receiver_id === ADMIN_ID) {
            // SI ON EST SUR LA CONVERSATION : On ajoute et on marque comme lu
            if (selectedUser === newMsg.sender_id) {
              setMessages(prev => [...prev, newMsg]);
              markAsRead(newMsg.sender_id); 
            } else {
              // SINON : On fait pinger et on incrémente le badge
              notificationAudio?.play().catch(() => {});
              setUnreadCounts(prev => ({ ...prev, [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1 }));
            }
          }
        }

        if (eventType === 'UPDATE') {
          // Synchro des CheckCheck (lecture par le client)
          setMessages(prev => prev.map(m => m.id === newMsg.id ? newMsg : m));
          // Si le client lit ses messages, on reset son badge côté admin
          if (newMsg.receiver_id === ADMIN_ID && newMsg.is_read === true) {
            setUnreadCounts(prev => ({ ...prev, [newMsg.sender_id]: 0 }));
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedUser]); // Crucial : on ré-écoute avec le bon selectedUser

  // 2. ACTIONS DE DONNÉES
  const fetchConversations = async () => {
    const { data: pData } = await supabase.from("profiles").select("id, phone").neq("id", ADMIN_ID);
    
    // On utilise la VUE pour les badges au démarrage
    const { data: vData } = await supabase.from("latest_message_per_conversation")
      .select("sender_id, is_read, receiver_id")
      .eq("receiver_id", ADMIN_ID)
      .eq("is_read", false);

    const counts: Record<string, number> = {};
    vData?.forEach(m => counts[m.sender_id] = (counts[m.sender_id] || 0) + 1);
    
    setUnreadCounts(counts);
    setProfiles(pData || []);
    setLoading(false);
  };

  const markAsRead = async (uid: string) => {
    if (!uid) return;
    // Update immédiat du badge en local (UI)
    setUnreadCounts(prev => ({ ...prev, [uid]: 0 }));
    // Update en DB
    await supabase.from("messages").update({ is_read: true })
      .eq("sender_id", uid).eq("receiver_id", ADMIN_ID).eq("is_read", false);
  };

  const fetchMessages = async (uid: string) => {
    const { data } = await supabase.from("messages").select("*")
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${ADMIN_ID}),and(sender_id.eq.${ADMIN_ID},receiver_id.eq.${uid})`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser);
      markAsRead(selectedUser);
    }
  }, [selectedUser]);

  useEffect(() => { 
    scrollRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  // 3. ENVOI DE MESSAGE (OPTIMISTIC UI)
  const sendResponse = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    const text = newMessage.trim();
    setNewMessage("");

    // On crée l'objet message "fictif" pour affichage immédiat
    const optimisticMsg = {
      id: Math.random(),
      content: text,
      sender_id: ADMIN_ID,
      receiver_id: selectedUser,
      is_admin: true,
      is_read: false,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]); // Boost de perfection : affichage instantané

    const { data, error } = await supabase.from("messages").insert([{
      content: text, sender_id: ADMIN_ID, receiver_id: selectedUser, is_admin: true, is_read: false
    }]).select().single();

    if (error) {
        alert("Erreur d'envoi");
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } else {
        // On remplace le fictif par le vrai message de la DB
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;
    try {
      setUploading(true);
      const filePath = `admin/${Date.now()}_${file.name}`;
      await supabase.storage.from('chat-attachments').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);

      const { data } = await supabase.from("messages").insert([{
        content: "📷 Photo", image_url: publicUrl, sender_id: ADMIN_ID, receiver_id: selectedUser, is_admin: true, is_read: false
      }]).select().single();
      
      if (data) setMessages(prev => [...prev, data]);
    } catch (err) { alert("Erreur d'envoi"); } finally { 
      setUploading(false); 
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sortedProfiles = [...profiles].sort((a, b) => (unreadCounts[b.id] || 0) - (unreadCounts[a.id] || 0));

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="flex h-screen gap-4 p-4 text-white font-sans bg-[#020617] overflow-hidden">
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
            <img src={fullscreenImage} className="max-w-full max-h-full rounded-xl object-contain shadow-2xl" alt="zoom" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <div className="w-80 bg-slate-900/40 rounded-[2rem] border border-white/5 flex flex-col backdrop-blur-xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-xl font-black italic uppercase tracking-tighter">Support Admin</h3>
          <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[10px] opacity-50 font-black">Live</span></div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sortedProfiles.map((p) => (
            <button key={p.id} onClick={() => setSelectedUser(p.id)} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${selectedUser === p.id ? "bg-emerald-500 text-slate-950" : "hover:bg-white/5 border border-white/5"}`}>
              <div className="relative">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black border ${selectedUser === p.id ? "bg-slate-950 text-emerald-500 border-transparent" : "bg-slate-800 text-emerald-500 border-white/10"}`}>{p.phone?.slice(-2)}</div>
                {unreadCounts[p.id] > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">{unreadCounts[p.id]}</div>}
              </div>
              <div className="text-left"><p className="text-sm font-black italic uppercase">{p.phone}</p></div>
            </button>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 bg-slate-900/20 rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden relative backdrop-blur-sm">
        {selectedUser ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] p-4 rounded-[1.5rem] ${m.is_admin ? "bg-emerald-600 rounded-tr-none" : "bg-slate-800 rounded-tl-none border border-white/5"}`}>
                    {m.image_url && <img src={m.image_url} onClick={() => setFullscreenImage(m.image_url)} className="rounded-xl mb-3 cursor-zoom-in" alt="chat" />}
                    <p className="text-xs font-bold leading-relaxed lowercase not-italic tracking-tight">{m.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-2 opacity-40 text-[8px]">
                      {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 
                      {m.is_admin && <CheckCheck size={12} className={m.is_read ? "text-blue-300" : "text-white"} />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div className="p-6 bg-slate-950/80 border-t border-white/5 flex gap-3">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              <button onClick={() => fileInputRef.current?.click()} className="p-4 text-emerald-500 bg-white/5 rounded-2xl">{uploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}</button>
              <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendResponse()} placeholder="Répondre..." className="flex-1 bg-slate-900 rounded-2xl px-6 py-4 outline-none border border-white/5 text-xs font-bold uppercase italic" />
              <button onClick={sendResponse} className="p-4 bg-emerald-500 text-slate-950 rounded-2xl"><Send size={22} /></button>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20"><UserIcon size={80} className="text-emerald-500 mb-4" /><p className="font-black uppercase text-[10px] tracking-[0.3em]">Sélectionnez un client</p></div>
        )}
      </div>
    </div>
  );
}


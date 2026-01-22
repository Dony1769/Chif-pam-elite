"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
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

  // INITIALISATION & REALTIME GLOBAL
  useEffect(() => {
    fetchConversations();

    const channel = supabase.channel('admin-sync-ultra')
      .on('postgres_changes', { 
        event: '*', // On écoute TOUT (Insert pour nouveaux messages, Update pour lectures)
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        handleRealtimeChanges(payload);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedUser]); // On réabonne si le selectedUser change pour la logique de lecture

  const handleRealtimeChanges = (payload: any) => {
    const { eventType, new: newMsg, old: oldMsg } = payload;

    if (eventType === 'INSERT') {
      // Si c'est un message reçu par l'admin
      if (newMsg.receiver_id === ADMIN_ID) {
        if (selectedUser === newMsg.sender_id) {
          setMessages((prev) => [...prev, newMsg]);
          markAsRead(newMsg.sender_id);
        } else {
          notificationAudio?.play().catch(() => {});
          setUnreadCounts(prev => ({ ...prev, [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1 }));
        }
      }
    }

    if (eventType === 'UPDATE') {
      // Si un message envoyé par l'admin est marqué comme "lu" par le client
      // On met à jour l'UI des CheckCheck
      setMessages(prev => prev.map(m => m.id === newMsg.id ? newMsg : m));
      
      // Si c'est un client qui a marqué ses messages comme lus (via sa page chat)
      if (newMsg.receiver_id === ADMIN_ID && newMsg.is_read === true) {
        setUnreadCounts(prev => ({ ...prev, [newMsg.sender_id]: 0 }));
      }
    }
  };

  const fetchConversations = async () => {
    // Récupérer les profils
    const { data: pData } = await supabase.from("profiles").select("id, phone").neq("id", ADMIN_ID);
    
    // Récupérer les comptes non lus directement depuis la VUE (plus rapide)
    const { data: vData } = await supabase
      .from("latest_message_per_conversation")
      .select("sender_id")
      .eq("receiver_id", ADMIN_ID)
      .eq("is_read", false);

    const counts: Record<string, number> = {};
    vData?.forEach(m => counts[m.sender_id] = (counts[m.sender_id] || 0) + 1);
    
    setUnreadCounts(counts);
    setProfiles(pData || []);
    setLoading(false);
  };

  const markAsRead = async (uid: string) => {
    // Cette action met à jour "messages" -> déclenche la VUE -> met à jour la Home du client
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", uid)
      .eq("receiver_id", ADMIN_ID)
      .eq("is_read", false);
    
    setUnreadCounts(prev => ({ ...prev, [uid]: 0 }));
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

  const sendResponse = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    const text = newMessage.trim();
    setNewMessage("");
    
    await supabase.from("messages").insert([{
      content: text, 
      sender_id: ADMIN_ID, 
      receiver_id: selectedUser, 
      is_admin: true,
      is_read: false
    }]);
    // Note: On ne setMessages pas ici, le Realtime (handleRealtimeChanges) s'en chargera pour garantir la synchro
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;
    try {
      setUploading(true);
      const filePath = `admin/${Date.now()}_${file.name}`;
      await supabase.storage.from('chat-attachments').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);

      await supabase.from("messages").insert([{
        content: "📷 Photo", 
        image_url: publicUrl, 
        sender_id: ADMIN_ID, 
        receiver_id: selectedUser, 
        is_admin: true,
        is_read: false
      }]);
    } catch (err) { alert("Erreur d'envoi"); } finally { 
      setUploading(false); 
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sortedProfiles = [...profiles].sort((a, b) => {
    const unreadA = unreadCounts[a.id] || 0;
    const unreadB = unreadCounts[b.id] || 0;
    return unreadB - unreadA;
  });

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="flex h-screen gap-4 p-4 text-white font-sans bg-[#020617] overflow-hidden">
      {/* FULLSCREEN IMAGE ZOOM */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4" 
            onClick={() => setFullscreenImage(null)}
          >
            <img src={fullscreenImage} className="max-w-full max-h-full rounded-xl object-contain shadow-2xl" alt="zoom" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <div className="w-80 bg-slate-900/40 rounded-[2rem] border border-white/5 flex flex-col backdrop-blur-xl shadow-xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-xl font-black italic uppercase tracking-tighter">Support Admin</h3>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[10px] opacity-50 uppercase font-black">Live</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sortedProfiles.map((p) => (
            <button key={p.id} onClick={() => setSelectedUser(p.id)} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${selectedUser === p.id ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" : "hover:bg-white/5 border border-white/5"}`}>
              <div className="relative">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black border ${selectedUser === p.id ? "bg-slate-950 border-transparent text-emerald-500" : "bg-slate-800 border-white/10 text-emerald-500"}`}>
                  {p.phone?.slice(-2)}
                </div>
                {unreadCounts[p.id] > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900">
                    {unreadCounts[p.id]}
                  </div>
                )}
              </div>
              <div className="text-left">
                <p className={`text-sm font-black italic uppercase ${selectedUser === p.id ? "text-slate-900" : "text-white"}`}>{p.phone}</p>
                <p className={`text-[9px] font-bold ${selectedUser === p.id ? "text-slate-800" : "text-slate-500"}`}>Utilisateur Client</p>
              </div>
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
                  <div className={`max-w-[70%] p-4 rounded-[1.5rem] shadow-xl ${m.is_admin ? "bg-emerald-600 rounded-tr-none" : "bg-slate-800 rounded-tl-none border border-white/5"}`}>
                    {m.image_url && (
                      <img src={m.image_url} onClick={() => setFullscreenImage(m.image_url)} className="rounded-xl mb-3 cursor-zoom-in hover:brightness-110 transition-all shadow-sm" alt="chat" />
                    )}
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
            
            <div className="p-6 bg-slate-950/80 border-t border-white/5 flex gap-3 items-center">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              <button onClick={() => fileInputRef.current?.click()} className="p-4 text-emerald-500 bg-white/5 rounded-2xl">
                {uploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
              </button>
              <input 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && sendResponse()} 
                placeholder="Répondre au client..." 
                className="flex-1 bg-slate-900 rounded-2xl px-6 py-4 outline-none border border-white/5 focus:border-emerald-500/50 text-xs font-bold uppercase italic" 
              />
              <button onClick={sendResponse} className="p-4 bg-emerald-500 text-slate-950 rounded-2xl shadow-lg shadow-emerald-500/20">
                <Send size={22} />
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
            <UserIcon size={80} className="text-emerald-500 mb-4" />
            <p className="font-black uppercase text-[10px] tracking-[0.3em]">En attente de sélection...</p>
          </div>
        )}
      </div>
    </div>
  );
}


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
  
  // Audio stable
  const notificationAudio = typeof window !== "undefined" ? new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3") : null;

  useEffect(() => {
    fetchConversations();
    const channel = supabase.channel('admin-main-room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id !== ADMIN_ID) {
            notificationAudio?.play().catch(() => {});
            if (selectedUser === newMsg.sender_id) {
              setMessages((prev) => [...prev, newMsg]);
              markAsRead(newMsg.sender_id);
            } else {
              setUnreadCounts(prev => ({ ...prev, [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1 }));
            }
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser);
      markAsRead(selectedUser);
    }
  }, [selectedUser]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchConversations = async () => {
    const { data: pData } = await supabase.from("profiles").select("id, phone").neq("id", ADMIN_ID);
    const { data: uData } = await supabase.from("messages").select("sender_id").eq("receiver_id", ADMIN_ID).eq("is_read", false);
    const counts: Record<string, number> = {};
    uData?.forEach(m => counts[m.sender_id] = (counts[m.sender_id] || 0) + 1);
    setUnreadCounts(counts);
    setProfiles(pData || []);
    setLoading(false);
  };

  const markAsRead = async (uid: string) => {
    await supabase.from("messages").update({ is_read: true }).eq("sender_id", uid).eq("receiver_id", ADMIN_ID).eq("is_read", false);
    setUnreadCounts(prev => ({ ...prev, [uid]: 0 }));
  };

  const fetchMessages = async (uid: string) => {
    const { data } = await supabase.from("messages").select("*")
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${ADMIN_ID}),and(sender_id.eq.${ADMIN_ID},receiver_id.eq.${uid})`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  // --- CORRECTION : Logique complète d'envoi d'image ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;
    try {
      setUploading(true);
      const filePath = `admin/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);

      const { data: insertedMsg } = await supabase.from("messages").insert([{
        content: "📷 Photo", 
        image_url: publicUrl, 
        sender_id: ADMIN_ID, 
        receiver_id: selectedUser, 
        is_admin: true
      }]).select().single();
      
      if (insertedMsg) setMessages(prev => [...prev, insertedMsg]);
    } catch (err) { 
      alert("Erreur d'envoi"); 
    } finally { 
      setUploading(false); 
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset de l'input
    }
  };

  const sendResponse = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    const text = newMessage.trim();
    setNewMessage("");
    const { data: insertedMsg } = await supabase.from("messages").insert([{
      content: text, sender_id: ADMIN_ID, receiver_id: selectedUser, is_admin: true
    }]).select().single();
    if (insertedMsg) setMessages(prev => [...prev, insertedMsg]);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="flex h-[90vh] gap-4 p-4 text-white font-sans bg-[#020617]">
      {fullscreenImage && (
        <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setFullscreenImage(null)}>
          <button className="absolute top-10 right-10 text-white hover:scale-110 transition-transform"><X size={35} /></button>
          <img src={fullscreenImage} className="max-w-full max-h-full rounded-xl object-contain shadow-2xl" alt="zoom" />
        </div>
      )}

      {/* Sidebar */}
      <div className="w-80 bg-slate-900/40 rounded-[2rem] border border-white/5 flex flex-col backdrop-blur-xl shadow-xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-xl font-black italic uppercase tracking-tighter">Messages</h3>
          <Volume2 size={16} className="text-emerald-500 opacity-50" />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {profiles.map((p) => (
            <button key={p.id} onClick={() => setSelectedUser(p.id)} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${selectedUser === p.id ? "bg-emerald-500/20 border-emerald-500/50 border shadow-lg shadow-emerald-500/5" : "hover:bg-white/5 border border-transparent"}`}>
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-black border border-white/10 text-emerald-500">{p.phone?.slice(-2)}</div>
                {unreadCounts[p.id] > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">{unreadCounts[p.id]}</div>}
              </div>
              <div className="text-left"><p className="text-sm font-bold truncate">{p.phone}</p></div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-slate-900/20 rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden relative backdrop-blur-sm shadow-2xl">
        {selectedUser ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl shadow-xl ${m.is_admin ? "bg-emerald-600 rounded-tr-none" : "bg-slate-800 rounded-tl-none border border-white/5"}`}>
                    {m.image_url && (
                      <img 
                        src={m.image_url} 
                        onClick={() => setFullscreenImage(m.image_url)} 
                        className="rounded-xl mb-2 max-w-full cursor-zoom-in hover:opacity-90 transition-all border border-black/10 shadow-sm" 
                        alt="chat" 
                      />
                    )}
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1 opacity-40 text-[9px]">
                      {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 
                      {m.is_admin && <CheckCheck size={12} className={m.is_read ? "text-blue-300" : ""} />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            
            {/* Input Bar */}
            <div className="p-4 bg-slate-950/80 border-t border-white/5 flex gap-3 items-center">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={uploading}
                className="p-4 text-slate-400 bg-white/5 rounded-2xl hover:text-emerald-500 transition-colors"
              >
                {uploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
              </button>
              <input 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && sendResponse()} 
                placeholder="Répondre..." 
                className="flex-1 bg-slate-900 rounded-2xl px-6 py-4 outline-none border border-white/5 focus:border-emerald-500/50 transition-all text-sm" 
              />
              <button 
                onClick={sendResponse} 
                className="p-4 bg-emerald-500 text-slate-950 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Send size={22} />
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-10">
            <UserIcon size={80} />
            <p className="font-black uppercase text-xs mt-4 tracking-widest">Séléctionnez une discussion</p>
          </div>
        )}
      </div>
    </div>
  );
}

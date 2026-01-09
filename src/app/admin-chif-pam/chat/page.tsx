"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Send, User as UserIcon, Loader2, Image as ImageIcon, Paperclip, CheckCheck } from "lucide-react";

const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";

export default function AdminChat() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchConversations();
    const channel = supabase.channel('admin-chat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new;
          if (selectedUser === newMsg.sender_id || selectedUser === newMsg.receiver_id) {
            setMessages((prev) => [...prev, newMsg]);
            if (newMsg.sender_id !== ADMIN_ID) markAsRead(selectedUser!);
          } else {
            fetchConversations(); // Update sidebar list and unread badges
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

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    // Utilisation de la table latest_message_per_conversation pour un chargement rapide
    const { data: convs } = await supabase.from("latest_message_per_conversation").select("*").order('created_at', { ascending: false });
    const { data: profilesData } = await supabase.from("profiles").select("id, phone, username").neq("id", ADMIN_ID);
    
    // Calcul des messages non lus
    const { data: unreadData } = await supabase.from("messages").select("sender_id").eq("receiver_id", ADMIN_ID).eq("is_read", false);
    const counts: Record<string, number> = {};
    unreadData?.forEach(msg => counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1);
    
    setUnreadCounts(counts);
    setProfiles(profilesData || []);
    setLoading(false);
  };

  const markAsRead = async (userId: string) => {
    await supabase.from("messages").update({ is_read: true })
      .eq("sender_id", userId).eq("receiver_id", ADMIN_ID).eq("is_read", false);
    setUnreadCounts(prev => ({ ...prev, [userId]: 0 }));
  };

  const fetchMessages = async (userId: string) => {
    const { data } = await supabase.from("messages").select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${ADMIN_ID}),and(sender_id.eq.${ADMIN_ID},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `admin/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);

      await supabase.from("messages").insert([{
        content: "📷 Photo",
        image_url: publicUrl,
        sender_id: ADMIN_ID,
        receiver_id: selectedUser,
        is_admin: true
      }]);
    } catch (error) {
      alert("Erreur lors de l'envoi de l'image");
    } finally {
      setUploading(false);
    }
  };

  const sendResponse = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    const text = newMessage.trim();
    setNewMessage("");
    await supabase.from("messages").insert([{
      content: text,
      sender_id: ADMIN_ID,
      receiver_id: selectedUser,
      is_admin: true
    }]);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="flex h-[90vh] gap-4 p-4 text-white font-sans bg-[#020617]">
      {/* SIDEBAR - DESIGN WHATSAPP DARK */}
      <div className="w-96 bg-slate-900/50 rounded-[2rem] border border-white/5 flex flex-col overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="p-6 border-b border-white/5 bg-slate-900/80">
          <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Messages</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {profiles.map((p) => (
            <button key={p.id} onClick={() => setSelectedUser(p.id)} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${selectedUser === p.id ? "bg-emerald-500/20 border-emerald-500/50 border" : "hover:bg-white/5 border border-transparent"}`}>
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 font-black text-emerald-500">{p.phone?.slice(-2)}</div>
                {unreadCounts[p.id] > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">{unreadCounts[p.id]}</div>}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold truncate">{p.phone || "Client anonyme"}</p>
                <p className="text-[10px] text-slate-500 font-medium">Cliquer pour discuter</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CHAT ZONE - DESIGN PREMIUM */}
      <div className="flex-1 bg-slate-900/30 rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden backdrop-blur-md shadow-2xl relative">
        {selectedUser ? (
          <>
            <div className="p-5 border-b border-white/5 bg-slate-900/60 flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><UserIcon className="text-emerald-500" size={20} /></div>
               <p className="font-bold text-sm tracking-widest uppercase">{profiles.find(p => p.id === selectedUser)?.phone}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] group relative ${m.is_admin ? "items-end" : "items-start"}`}>
                    <div className={`p-4 rounded-[1.8rem] shadow-xl ${m.is_admin ? "bg-emerald-600 rounded-tr-none text-white" : "bg-slate-800 rounded-tl-none text-slate-100"}`}>
                      {m.image_url ? (
                        <img src={m.image_url} alt="Attachment" className="rounded-xl max-w-full mb-2 border border-black/20" />
                      ) : null}
                      <p className="text-sm leading-relaxed font-medium">{m.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 opacity-50">
                        <span className="text-[9px]">{new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        {m.is_admin && <CheckCheck size={12} className={m.is_read ? "text-blue-300" : ""} />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div className="p-4 bg-slate-950/90 border-t border-white/5 flex gap-3 items-center">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl transition-all">
                {uploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
              </button>
              <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendResponse()} placeholder="Tapez votre message..." className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500 transition-all font-medium" />
              <button onClick={sendResponse} className="p-4 bg-emerald-500 text-slate-950 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"><Send size={22} /></button>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
            <div className="p-10 bg-slate-800/20 rounded-full border border-white/5"><UserIcon size={60} /></div>
            <p className="text-xs font-black uppercase tracking-[0.3em]">Ouvrez une conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}

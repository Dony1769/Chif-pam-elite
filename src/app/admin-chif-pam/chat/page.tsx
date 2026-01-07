"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Send, User as UserIcon, Loader2 } from "lucide-react";

const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";

export default function AdminChat() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();

    // Écoute globale des nouveaux messages pour mettre à jour la liste des profils ou le chat actif
    const channel = supabase
      .channel('admin-chat-global')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => {
          const newMsg = payload.new;
          
          // Si le message concerne l'utilisateur actuellement sélectionné, on l'ajoute
          if (selectedUser === newMsg.sender_id || selectedUser === newMsg.receiver_id) {
            setMessages((prev) => [...prev, newMsg]);
          }
          // On rafraîchit la liste des conversations pour remonter le dernier client actif
          fetchConversations();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedUser]); // On réabonne si l'utilisateur sélectionné change pour plus de sécurité

  useEffect(() => {
    if (selectedUser) fetchMessages(selectedUser);
  }, [selectedUser]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    // On récupère les profils
    const { data: profilesData, error } = await supabase
      .from("profiles")
      .select("id, phone, username, created_at")
      .neq("id", ADMIN_ID);

    if (error) return console.error(error);
    setProfiles(profilesData || []);
    setLoading(false);
  };

  const fetchMessages = async (userId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${ADMIN_ID}),and(sender_id.eq.${ADMIN_ID},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });

    if (!error) setMessages(data || []);
  };

  const sendResponse = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    const msg = {
      content: newMessage.trim(),
      sender_id: ADMIN_ID,
      receiver_id: selectedUser,
      is_admin: true,
    };

    const { error } = await supabase.from("messages").insert([msg]);
    if (!error) setNewMessage("");
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="flex h-[85vh] gap-6 p-6 text-white font-sans">
      {/* SIDEBAR */}
      <div className="w-80 bg-slate-900/40 rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden backdrop-blur-md">
        <div className="p-6 border-b border-white/10"><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Clients</h3></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {profiles.map((p) => (
            <button key={p.id} onClick={() => setSelectedUser(p.id)} className={`w-full p-4 rounded-3xl flex items-center gap-4 transition-all border ${selectedUser === p.id ? "bg-emerald-600 border-emerald-400" : "bg-slate-950/50 border-white/5"}`}>
              <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-[10px] font-black">{p.phone?.slice(-2) || "??"}</div>
              <div className="text-left">
                <p className="text-xs font-black truncate w-32">{p.phone || "Client"}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CHAT ZONE */}
      <div className="flex-1 bg-slate-900/20 rounded-[3rem] border border-white/10 flex flex-col overflow-hidden backdrop-blur-sm relative">
        {selectedUser ? (
          <>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] p-5 rounded-[2rem] text-sm ${m.is_admin ? "bg-emerald-600 rounded-tr-none" : "bg-slate-800 rounded-tl-none"}`}>{m.content}</div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div className="p-6 bg-slate-950/80 flex gap-4">
              <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendResponse()} placeholder="Répondre..." className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500" />
              <button onClick={sendResponse} className="p-4 bg-emerald-500 text-slate-950 rounded-2xl"><Send size={22} /></button>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20"><UserIcon size={80} /><p className="text-[10px] font-black uppercase">Sélectionnez un client</p></div>
        )}
      </div>
    </div>
  );
}

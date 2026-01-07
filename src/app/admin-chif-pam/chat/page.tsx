"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Send, User as UserIcon, Loader2 } from "lucide-react";

const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_ID || "9e141172-93db-4df4-a72b-47b89211b46e";

type Profile = {
  id: string;
  phone?: string;
  last_active?: string;
  [key: string]: any;
};

type Message = {
  id?: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  is_admin?: boolean;
  created_at?: string;
  [key: string]: any;
};

export default function AdminChat() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedUserRef = useRef<string | null>(null);

  // Synchronisation du ref pour le Realtime
  useEffect(() => {
    selectedUserRef.current = selectedUser;
    if (selectedUser) fetchMessages(selectedUser);
  }, [selectedUser]);

  useEffect(() => {
    initAdmin();

    // CANAL UNIQUE : Ecoute globale des nouveaux messages
    const channel = supabase
      .channel('admin-global-chat')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => {
          const msg = payload.new as Message;
          
          // 1. Refresh la liste des profils pour l'ordre d'activité
          fetchConversations();

          // 2. Si le message concerne la conversation ouverte, on l'ajoute
          const isRelevant = 
            (msg.sender_id === selectedUserRef.current && msg.receiver_id === ADMIN_ID) ||
            (msg.sender_id === ADMIN_ID && msg.receiver_id === selectedUserRef.current);

          if (isRelevant) {
            setMessages((prev) => {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initAdmin = async () => {
    setLoading(true);
    await fetchConversations();
    setLoading(false);
  };

  const fetchConversations = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", ADMIN_ID)
      .order("last_active", { ascending: false });
    setProfiles(data || []);
  };

  const fetchMessages = async (userId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
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
    if (error) console.error("Erreur envoi:", error);
    else setNewMessage("");
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#020617]">
      <Loader2 className="animate-spin text-emerald-500" />
    </div>
  );

  return (
    <div className="flex h-[85vh] gap-6 p-6 text-white font-sans">
      {/* SIDEBAR : LISTE DES CLIENTS */}
      <div className="w-80 bg-slate-900/40 rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden backdrop-blur-md">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Conversations</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedUser(p.id)}
              className={`w-full p-4 rounded-3xl flex items-center gap-4 transition-all border ${
                selectedUser === p.id 
                ? "bg-emerald-600 border-emerald-400 shadow-lg shadow-emerald-900/20" 
                : "bg-slate-950/50 border-white/5 hover:border-white/20"
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-[10px] font-black border border-white/10">
                {p.phone?.slice(-2) || "??"}
              </div>
              <div className="text-left">
                <p className="text-xs font-black truncate w-32">{p.phone ? `+${p.phone}` : "Client Anonyme"}</p>
                <span className={`text-[8px] font-bold uppercase tracking-widest ${selectedUser === p.id ? 'text-emerald-100' : 'text-emerald-500'}`}>
                   • Actif
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ZONE DE CHAT PRINCIPALE */}
      <div className="flex-1 bg-slate-900/20 rounded-[3rem] border border-white/10 flex flex-col overflow-hidden backdrop-blur-sm relative">
        {selectedUser ? (
          <>
            {/* Header Chat */}
            <div className="p-6 bg-slate-950/40 border-b border-white/10 flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[10px] font-black uppercase tracking-widest">Discussion sécurisée</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] p-5 rounded-[2rem] text-sm leading-relaxed shadow-2xl ${
                    m.is_admin 
                    ? "bg-emerald-600 text-white rounded-tr-none border border-emerald-400/30" 
                    : "bg-slate-800 text-white rounded-tl-none border border-white/10"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* Input Bar */}
            <div className="p-6 bg-slate-950/80 border-t border-white/10 flex gap-4">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendResponse()}
                placeholder="Écrire votre réponse..."
                className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-600"
              />
              <button 
                onClick={sendResponse} 
                className="p-4 bg-emerald-500 text-slate-950 rounded-2xl hover:bg-emerald-400 active:scale-90 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Send size={22} />
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-6 opacity-20">
            <UserIcon size={80} className="text-slate-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">En attente de sélection</p>
          </div>
        )}
      </div>
    </div>
  );
}

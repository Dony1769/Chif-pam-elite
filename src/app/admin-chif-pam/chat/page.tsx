"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, User as UserIcon } from 'lucide-react';

const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_ID || '9e141172-93db-4df4-a72b-47b89211b46e';

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
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Realtime refs so we can clean up channels
  const globalChannelRef = useRef<any>(null);
  const convoChannelRef = useRef<any>(null);

  // Fetch conversations & create a global channel for new messages to admin (updates conversation list)
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await fetchConversations();

      try {
        const channel = supabase.channel(`admin-inbox-${ADMIN_ID}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `receiver_id=eq.${ADMIN_ID}`,
            },
            (payload: any) => {
              const newMsg = payload?.new;
              if (!newMsg) return;
              // Refresh conversation list so last_active/order reflects new activity
              fetchConversations();

              // If this incoming message belongs to the currently opened conversation, append it
              if (mounted && selectedUser && (newMsg.sender_id === selectedUser || newMsg.receiver_id === selectedUser)) {
                setMessages((prev) => [...prev, newMsg]);
              }
            }
          );

        // subscribe (await if subscribe returns a promise)
        const sub: any = channel.subscribe();
        if (sub && typeof sub.then === 'function') {
          await sub;
        }

        globalChannelRef.current = channel;
      } catch (err) {
        console.error('Error creating admin global realtime channel:', err);
      }
    };

    init();

    return () => {
      mounted = false;
      const ch = globalChannelRef.current;
      if (ch) {
        try {
          if (typeof ch.unsubscribe === 'function') {
            ch.unsubscribe();
          } else if (typeof supabase.removeChannel === 'function') {
            supabase.removeChannel(ch);
          }
        } catch (err) {
          console.warn('Error cleaning up global admin channel:', err);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // When selectedUser changes: fetch messages for that user and open a per-conversation channel
  useEffect(() => {
    let mounted = true;

    const setupConversationChannel = async () => {
      // Cleanup previous convo channel
      const prev = convoChannelRef.current;
      if (prev) {
        try {
          if (typeof prev.unsubscribe === 'function') {
            prev.unsubscribe();
          } else if (typeof supabase.removeChannel === 'function') {
            supabase.removeChannel(prev);
          }
        } catch (err) {
          console.warn('Error removing previous convo channel:', err);
        }
        convoChannelRef.current = null;
      }

      if (!selectedUser) {
        setMessages([]);
        return;
      }

      await fetchMessages(selectedUser);

      try {
        // Create a conversation-specific channel. We don't rely on a single filter because we want to catch both sides.
        const convoChannel = supabase.channel(`convo-${selectedUser}-${ADMIN_ID}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
            },
            (payload: any) => {
              const newMsg = payload?.new;
              if (!newMsg) return;

              // Only append messages that belong to this conversation (sender/receiver matches pair)
              const belongsToConvo =
                (newMsg.sender_id === selectedUser && newMsg.receiver_id === ADMIN_ID) ||
                (newMsg.sender_id === ADMIN_ID && newMsg.receiver_id === selectedUser);

              if (mounted && belongsToConvo) {
                setMessages((prev) => [...prev, newMsg]);
              }
            }
          );

        const sub: any = convoChannel.subscribe();
        if (sub && typeof sub.then === 'function') {
          await sub;
        }

        convoChannelRef.current = convoChannel;
      } catch (err) {
        console.error('Error creating conversation channel:', err);
      }
    };

    setupConversationChannel();

    return () => {
      mounted = false;
      const ch = convoChannelRef.current;
      if (ch) {
        try {
          if (typeof ch.unsubscribe === 'function') {
            ch.unsubscribe();
          } else if (typeof supabase.removeChannel === 'function') {
            supabase.removeChannel(ch);
          }
        } catch (err) {
          console.warn('Error cleaning up convo channel on unmount/selection change:', err);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from<Profile>('profiles')
        .select('*')
        .neq('id', ADMIN_ID)
        .order('last_active', { ascending: false });

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }
      setProfiles(data || []);
    } catch (err) {
      console.error('fetchConversations error:', err);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from<Message>('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }
      setMessages(data || []);
    } catch (err) {
      console.error('fetchMessages error:', err);
    }
  };

  const sendResponse = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    const msg: Message = {
      content: newMessage.trim(),
      sender_id: ADMIN_ID,
      receiver_id: selectedUser,
      is_admin: true,
    };

    try {
      const { data, error } = await supabase.from('messages').insert([msg]).select().single();
      if (error) {
        console.error('Error sending admin message:', error);
        return;
      }

      const sent = (data as Message) || { ...msg, created_at: new Date().toISOString() };
      setMessages((prev) => [...prev, sent]);
      setNewMessage('');
      // Update conversation list ordering / last_active
      fetchConversations();
    } catch (err) {
      console.error('sendResponse error:', err);
    }
  };

  return (
    <div className="flex h-[80vh] gap-4 p-4">
      {/* Liste des conversations */}
      <div className="w-1/3 bg-slate-900/50 rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/5 font-black uppercase text-[10px] tracking-widest text-slate-500">Messages Clients</div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {profiles.map((p) => {
            const isSelected = selectedUser === p.id;
            const phone = p.phone ?? '';
            return (
              <button
                key={p.id}
                onClick={() => setSelectedUser(p.id)}
                className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${isSelected ? 'bg-emerald-500 text-slate-950' : 'hover:bg-slate-800/50'}`}
                aria-pressed={isSelected}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-[10px]">
                  {phone ? phone.slice(-2) : '??'}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold">{phone ? `+${phone}` : 'Utilisateur'}</p>
                  <p className={`text-[8px] uppercase font-black ${isSelected ? 'text-slate-900' : 'text-emerald-500'}`}>Actif</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Zone de Chat */}
      <div className="flex-1 bg-slate-900/30 rounded-[3.5rem] border border-white/5 flex flex-col overflow-hidden relative">
        {selectedUser ? (
          <>
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {messages.map((m, i) => (
                <div key={m.id ?? m.created_at ?? i} className={`flex ${m.is_admin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-4 rounded-3xl text-xs ${
                    m.is_admin 
                    ? 'bg-emerald-500 text-slate-950 font-bold rounded-tr-none' 
                    : 'bg-slate-800 text-white rounded-tl-none border border-white/5'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div className="p-6 bg-slate-950 flex gap-3">
              <input 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendResponse()}
                placeholder="Répondre au client..."
                className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-emerald-500 transition-all"
                aria-label="Répondre au client"
              />
              <button onClick={sendResponse} className="p-4 bg-emerald-500 text-slate-950 rounded-2xl active:scale-95 transition-all" aria-label="Envoyer réponse">
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 italic">
            <UserIcon size={48} className="opacity-10 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Sélectionnez une conversation pour répondre</p>
          </div>
        )}
      </div>
    </div>
  );
        }

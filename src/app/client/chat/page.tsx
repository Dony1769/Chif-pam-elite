"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, User } from 'lucide-react';

const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_ID || '9e141172-93db-4df4-a72b-47b89211b46e';

type Message = {
  id?: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  is_admin?: boolean;
  created_at?: string;
};

export default function ClientChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: any = null;
    const initChat = async () => {
      try {
        const {
          data: { user: authUser },
          error: getUserError,
        } = await supabase.auth.getUser();

        if (getUserError) {
          console.error('Error getting user:', getUserError);
          return;
        }

        setUser(authUser);

        if (authUser) {
          await fetchMessages(authUser.id);

          // create channel, attach handler, then subscribe
          channel = supabase.channel(`chat-${authUser.id}`);
          channel.on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `receiver_id=eq.${authUser.id}`,
            },
            (payload: any) => {
              if (payload?.new) {
                setMessages((prev) => [...prev, payload.new]);
              }
            }
          );
          // subscribe (await if subscribe returns a promise)
          try {
            // subscribe may return a promise or the channel itself depending on version
            const sub: any = channel.subscribe();
            if (sub && typeof sub.then === 'function') {
              await sub;
            }
          } catch (subErr) {
            console.error('Error subscribing to realtime:', subErr);
          }
        }
      } catch (err) {
        console.error('initChat error:', err);
      }
    };
    initChat();

    return () => {
      // cleanup subscription on unmount
      if (channel) {
        try {
          // unsubscribe (some versions support unsubscribe(), others supabase.removeChannel)
          if (typeof channel.unsubscribe === 'function') {
            channel.unsubscribe();
          } else if (typeof supabase.removeChannel === 'function') {
            supabase.removeChannel(channel);
          }
        } catch (err) {
          console.warn('Error during channel cleanup:', err);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const msg: Message = {
      content: newMessage.trim(),
      sender_id: user.id,
      receiver_id: ADMIN_ID,
      is_admin: false,
    };

    try {
      const { data, error } = await supabase.from('messages').insert([msg]).select().single();
      if (error) {
        console.error('Error sending message:', error);
        return;
      }

      // prefer server-returned row (with id, created_at) if available
      const sent = (data as Message) || { ...msg, created_at: new Date().toISOString() };

      setMessages((prev) => [...prev, sent]);
      setNewMessage('');
    } catch (err) {
      console.error('sendMessage error:', err);
    }
  };

  return (
    <div className="flex flex-col h-[85vh] p-4 animate-in fade-in duration-700">
      <div className="bg-slate-900/80 p-4 rounded-t-4xl border-x border-t border-white/5 flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
          <User className="text-emerald-500" size={20} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Support Elite</p>
          <p className="text-[8px] text-slate-500 uppercase font-bold">En ligne</p>
        </div>
      </div>

      <div className="flex-1 bg-slate-900/30 border-x border-white/5 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={m.id ?? m.created_at ?? i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[80%] p-4 rounded-2xl text-xs ${
                m.is_admin
                  ? 'bg-slate-800 text-white rounded-tl-none border border-white/5'
                  : 'bg-emerald-500 text-slate-950 font-bold rounded-tr-none'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="bg-slate-950 p-4 rounded-b-4xl border border-white/5 flex gap-2">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Posez votre question..."
          className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-4 text-xs outline-none focus:border-emerald-500 transition-all"
          aria-label="Votre message"
        />
        <button
          onClick={sendMessage}
          className="p-3 bg-emerald-500 text-slate-950 rounded-xl active:scale-95 transition-all"
          aria-label="Envoyer"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { ChatMessage, Conversation } from '@/types/chat';

export default function AdminChat() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [conversations, setConversations] = useState<(Conversation & { profiles: any })[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger les conversation
  useEffect(() => {
    const fetchConvs = async () => {
      // On join avec la table profiles pour avoir le nom/email
      const { data } = await supabase
        .from('conversations')
        .select('*, profiles(email, username)') // Assure-toi que ces colonnes existent dans profiles
        .order('updated_at', { ascending: false });
      
      if (data) setConversations(data as any);
    };
    fetchConvs();

    // Realtime pour remonter les conversations actives
    const channel = supabase.channel('admin_convs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchConvs)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Charger les messages quand on clique sur une conv
  useEffect(() => {
    if (!activeConv) return;

    const fetchMessages = async () => {
      // ICI PAS DE FILTRE DE TEMPS (Admin voit tout)
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', activeConv)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as ChatMessage[]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
    };
    fetchMessages();

    const channel = supabase.channel(`admin_chat_${activeConv}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeConv}` }, 
      (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv]);

  const sendAdminReply = async () => {
    if (!activeConv || !reply.trim()) return;
    await supabase.from('chat_messages').insert({
      conversation_id: activeConv,
      sender_type: 'admin',
      type: 'text',
      content: reply
    });
    setReply("");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Liste */}
      <div className="w-80 bg-white border-r overflow-y-auto">
        <div className="p-4 bg-gray-50 font-bold border-b">Discussions</div>
        {conversations.map(c => (
          <div 
            key={c.id} 
            onClick={() => setActiveConv(c.id)}
            className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${activeConv === c.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
          >
            <div className="font-bold text-sm">{c.profiles?.username || c.profiles?.email || 'Utilisateur'}</div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(c.updated_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* Zone de Chat */}
      <div className="flex-1 flex flex-col">
        {activeConv ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#e5ddd5]">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[60%] p-3 rounded-lg shadow text-sm ${msg.sender_type === 'admin' ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
                    {msg.type === 'text' && <p>{msg.content}</p>}
                    {msg.type === 'image' && <img src={msg.content} className="rounded max-w-xs" />}
                    {msg.type === 'audio' && <audio controls src={msg.content} />}
                    <div className="text-[10px] text-right text-gray-500 mt-1">
                       {new Date(msg.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 bg-white border-t flex gap-2">
              <input 
                value={reply} 
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendAdminReply()}
                className="flex-1 p-3 border rounded-lg" 
                placeholder="Réponse admin..." 
              />
              <button onClick={sendAdminReply} className="bg-blue-600 text-white px-6 rounded-lg font-bold">Envoyer</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminChatPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Charger la liste des conversations (triées par mise à jour)
  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*, profiles(username, email)')
      .order('updated_at', { ascending: false });

    if (error) console.error("Erreur convs:", error.message);
    else setConversations(data || []);
  };

  useEffect(() => {
    fetchConversations();
    
    // Realtime pour remonter les convs en haut de liste quand un message arrive
    const channel = supabase.channel('admin_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchConversations)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 2. Charger les messages d'une conversation sélectionnée
  useEffect(() => {
    if (!activeConv) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', activeConv.id)
        .order('created_at', { ascending: true });

      if (error) console.error("Erreur msgs:", error.message);
      else setMessages(data || []);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
    };

    fetchMessages();

    // Realtime pour les nouveaux messages dans cette conv
    const channel = supabase.channel(`admin_conv_${activeConv.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages', 
        filter: `conversation_id=eq.${activeConv.id}` 
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv]);

  // 3. Envoyer une réponse (Texte seulement pour l'admin ici)
  const sendReply = async () => {
    if (!replyText.trim() || !activeConv) return;

    const { error } = await supabase.from('chat_messages').insert({
      conversation_id: activeConv.id,
      sender_type: 'admin',
      content: replyText,
      type: 'text'
    });

    if (error) {
      alert("Erreur d'envoi");
    } else {
      setReplyText("");
      // Mettre à jour le timestamp de la conv
      await supabase.from('conversations').update({ updated_at: new Date() }).eq('id', activeConv.id);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      {/* Sidebar : Liste des clients */}
      <div className="w-1/3 bg-white border-r flex flex-col">
        <div className="p-4 bg-gray-800 text-white font-bold">Messages Clients</div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && <p className="p-4 text-gray-400">Aucune discussion.</p>}
          {conversations.map((c) => (
            <div 
              key={c.id} 
              onClick={() => setActiveConv(c)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${activeConv?.id === c.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''}`}
            >
              <p className="font-bold text-sm">{c.profiles?.username || c.profiles?.email || "Utilisateur inconnu"}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Dernière activité : {new Date(c.updated_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main : Fenêtre de Chat */}
      <div className="flex-1 flex flex-col bg-[#e5ddd5]">
        {activeConv ? (
          <>
            {/* Header Chat */}
            <div className="p-4 bg-white border-b shadow-sm flex justify-between items-center">
               <span className="font-bold">Discussion avec {activeConv.profiles?.username || 'Client'}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-xl shadow-sm ${m.sender_type === 'admin' ? 'bg-[#dcf8c6] text-gray-800' : 'bg-white text-gray-800'}`}>
                    
                    {/* Types de contenu */}
                    {m.type === 'text' && <p className="text-sm">{m.content}</p>}
                    {m.type === 'image' && (
                      <img src={m.content} className="rounded-lg max-w-full h-auto border" alt="media" />
                    )}
                    {m.type === 'audio' && (
                      <audio controls src={m.content} className="w-48 h-10" />
                    )}

                    <p className="text-[9px] text-gray-400 text-right mt-1">
                      {new Date(m.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* Input Admin */}
            <div className="p-4 bg-white border-t flex gap-2">
              <input 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                placeholder="Répondre..."
                className="flex-1 p-3 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button 
                onClick={sendReply}
                className="bg-blue-600 text-white px-6 rounded-xl font-bold hover:bg-blue-700"
              >
                ENVOYER
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 italic">
            Sélectionnez une conversation à gauche
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function ChatClient() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [conv, setConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const scroll = useRef<HTMLDivElement>(null);

  // 1. Initialisation
  useEffect(() => {
    const start = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return console.error("Pas d'utilisateur connecté");

      // Récupère ou crée la conversation
      let { data: existing } = await supabase.from('conversations').select('*').eq('user_id', user.id).maybeSingle();
      
      if (!existing) {
        const { data: newConv, error } = await supabase.from('conversations').insert({ user_id: user.id }).select().single();
        if (error) return console.error("Erreur création conv:", error.message);
        existing = newConv;
      }
      setConv(existing);
      fetchMessages(existing.id);
      listen(existing.id);
    };
    start();
  }, []);

  // 2. Charger l'historique (24h)
  const fetchMessages = async (id: string) => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('chat_messages').select('*').eq('conversation_id', id).gt('created_at', dayAgo).order('created_at', { ascending: true });
    if (error) console.error("Erreur fetch msgs:", error.message);
    if (data) setMessages(data);
    scroll.current?.scrollIntoView();
  };

  // 3. Écoute temps réel
  const listen = (id: string) => {
    supabase.channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${id}` }, 
      (payload) => {
        setMessages(prev => [...prev, payload.new]);
        setTimeout(() => scroll.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }).subscribe();
  };

  // 4. Envoi
  const send = async () => {
    if (!text.trim() || !conv) return;
    const { error } = await supabase.from('chat_messages').insert({
      conversation_id: conv.id,
      sender_type: 'user',
      content: text,
      type: 'text'
    });
    if (error) alert("Erreur d'envoi: " + error.message);
    setText("");
  };

  return (
    <div className="flex flex-col h-screen bg-[#e5ddd5] max-w-md mx-auto border shadow-xl">
      <div className="bg-[#075e54] p-4 text-white font-bold shadow-md">Support Whatsapp Style</div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-2 rounded-lg text-sm shadow-sm ${m.sender_type === 'user' ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
              {m.content}
              <div className="text-[9px] text-gray-400 text-right mt-1">
                {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        <div ref={scroll} />
      </div>

      <div className="p-3 bg-white flex gap-2 items-center">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} className="flex-1 p-2 border rounded-full outline-none" placeholder="Message..." />
        <button onClick={send} className="bg-[#075e54] text-white p-2 rounded-full w-10 h-10">➤</button>
      </div>
    </div>
  );
}


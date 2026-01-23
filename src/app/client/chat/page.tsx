"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function SimpleChat() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [convKey, setConvKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // Si pas connecté, on utilise un ID de secours ou on ne fait rien
      const key = user?.id || "invite-session"; 
      setConvKey(key);

      const { data } = await supabase.from('messages').select('*').eq('conversation_key', key).order('created_at', { ascending: true });
      if (data) setMessages(data);
      
      supabase.channel(`chat_${key}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_key=eq.${key}` }, 
        (p) => setMessages(prev => [...prev, p.new])).subscribe();
    };
    init();
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (txt: string, url: string | null = null) => {
    if (!convKey || (!txt && !url)) return;
    const msg = { conversation_key: convKey, sender_type: 'client', content: txt, image_url: url };
    
    await supabase.from('messages').insert(msg);
    await supabase.from('latest_message_per_conversation').upsert({
      conversation_key: convKey,
      last_message: txt || "Image",
      last_sender_type: 'client',
      last_created_at: new Date().toISOString()
    });
    setText("");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 max-w-lg mx-auto shadow-lg">
      <div className="bg-blue-600 p-4 text-white font-bold text-center">Assistance</div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-2 rounded-lg text-sm ${m.sender_type === 'client' ? 'bg-blue-500 text-white' : 'bg-white text-black border'}`}>
              {m.image_url && <img src={m.image_url} className="max-w-full rounded mb-1" />}
              {m.content && <p>{m.content}</p>}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <div className="p-2 bg-white flex border-t">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(text)} className="flex-1 p-2 outline-none" placeholder="Votre message..." />
        <button onClick={() => send(text)} className="p-2 text-blue-600 font-bold">OK</button>
      </div>
    </div>
  );
}

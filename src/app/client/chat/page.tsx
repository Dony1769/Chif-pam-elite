"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function ClientChat() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const currentUser = session.user;
      setUser(currentUser);

      // Création automatique de la conv si absente
      await supabase.from('conversations').upsert(
        { conversation_key: currentUser.id, client_id: currentUser.id },
        { onConflict: 'conversation_key' }
      );

      // Charger les messages
      const { data } = await supabase.from('messages')
        .select('*')
        .eq('conversation_key', currentUser.id)
        .order('created_at', { ascending: true });
      
      if (data) setMessages(data);
      setLoading(false);

      // Écoute temps réel
      const channel = supabase.channel(`chat_${currentUser.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `conversation_key=eq.${currentUser.id}` 
        }, (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    initChat();
  }, [supabase]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !user) return;
    const msg = { conversation_key: user.id, sender_type: 'client', sender_id: user.id, content: text };
    
    // On envoie
    await supabase.from('messages').insert(msg);
    // On met à jour la liste admin
    await supabase.from('latest_message_per_conversation').upsert({
      conversation_key: user.id,
      last_message: text,
      last_sender_type: 'client',
      last_created_at: new Date().toISOString()
    });
    setText("");
  };

  if (loading) return <div className="p-10 text-center">Chargement du chat...</div>;
  if (!user) return <div className="p-10 text-center text-red-500">Veuillez vous connecter pour accéder à l'assistance.</div>;

  return (
    <div className="flex flex-col h-[90vh] bg-[#f0f2f5] max-w-md mx-auto border shadow-lg">
      <div className="bg-[#008069] p-4 text-white font-bold flex items-center gap-2">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">🎧</div>
        Assistance Client
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#e5ddd5]">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-2 px-3 rounded-lg text-sm shadow-sm max-w-[85%] ${
              m.sender_type === 'client' ? 'bg-[#dcf8c6]' : 'bg-white'
            }`}>
              {m.content}
              <div className="text-[9px] text-gray-500 text-right mt-1">
                {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="p-2 bg-[#f0f2f5] flex gap-2">
        <input 
          value={text} 
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          className="flex-1 p-2 rounded-full border-none outline-none px-4 text-sm" 
          placeholder="Tapez votre message..." 
        />
        <button onClick={send} className="bg-[#00a884] text-white p-2 rounded-full w-10 h-10 flex items-center justify-center">
          ➤
        </button>
      </div>
    </div>
  );
}

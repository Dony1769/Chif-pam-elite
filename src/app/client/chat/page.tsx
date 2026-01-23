"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function ClientChat() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [user, setUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      // S'assurer que la conversation existe
      await supabase.from('conversations').upsert({ conversation_key: user.id, client_id: user.id });

      // Charger historique
      const { data } = await supabase.from('messages').select('*').eq('conversation_key', user.id).order('created_at', { ascending: true });
      if (data) setMessages(data);
      
      // Realtime
      supabase.channel(`chat_${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_key=eq.${user.id}` }, 
        (p) => setMessages(prev => [...prev, p.new]))
        .subscribe();
    };
    init();
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (content: string, imageUrl: string | null = null) => {
    if (!content && !imageUrl) return;
    const msgData = { conversation_key: user.id, sender_type: 'client', sender_id: user.id, content, image_url: imageUrl };

    // 1. Insert message
    await supabase.from('messages').insert(msgData);

    // 2. Update latest_message (Règle critique)
    await supabase.from('latest_message_per_conversation').upsert({
      conversation_key: user.id,
      last_message: content || "📷 Image",
      last_sender_type: 'client',
      last_created_at: new Date().toISOString()
    });
    setText("");
  };

  const uploadImg = async (file: File) => {
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { data } = await supabase.storage.from('chat-media').upload(path, file);
    if (data) {
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);
      handleSend("", publicUrl);
    }
  };

  return (
    <div className="flex flex-col h-[90vh] bg-[#e5ddd5] max-w-lg mx-auto shadow-2xl overflow-hidden">
      <div className="bg-[#075e54] p-4 text-white font-bold">Support Client</div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-2 rounded-lg max-w-[80%] shadow ${m.sender_type === 'client' ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
              {m.image_url && <img src={m.image_url} className="rounded-md mb-1 max-h-60" />}
              {m.content && <p className="text-sm">{m.content}</p>}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <div className="p-3 bg-white flex gap-2 items-center">
        <label className="cursor-pointer text-xl">📷<input type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadImg(e.target.files[0])} /></label>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend(text)} className="flex-1 p-2 bg-gray-100 rounded-full outline-none" placeholder="Message..." />
        <button onClick={() => handleSend(text)} className="text-[#075e54] font-bold">ENVOYER</button>
      </div>
    </div>
  );
}


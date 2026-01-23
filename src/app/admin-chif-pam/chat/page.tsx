"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminChat() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [convs, setConvs] = useState<any[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Charger la liste des conversations (Table Latest)
  useEffect(() => {
    const fetchConvs = async () => {
      const { data } = await supabase.from('latest_message_per_conversation').select('*').order('last_created_at', { ascending: false });
      if (data) setConvs(data);
    };
    fetchConvs();

    // Realtime sur la LISTE
    supabase.channel('list_update').on('postgres_changes', { event: '*', schema: 'public', table: 'latest_message_per_conversation' }, fetchConvs).subscribe();
  }, []);

  // 2. Charger les messages quand on change de conv
  useEffect(() => {
    if (!activeKey) return;
    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').eq('conversation_key', activeKey).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMsgs();

    const sub = supabase.channel(`chat_${activeKey}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_key=eq.${activeKey}` }, 
      (p) => setMessages(prev => [...prev, p.new]))
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeKey]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendAdmin = async () => {
    if (!text.trim() || !activeKey) return;
    await supabase.from('messages').insert({ conversation_key: activeKey, sender_type: 'admin', content: text });
    await supabase.from('latest_message_per_conversation').upsert({
      conversation_key: activeKey,
      last_message: text,
      last_sender_type: 'admin',
      last_created_at: new Date().toISOString()
    });
    setText("");
  };

  return (
    <div className="flex h-screen bg-gray-200 p-4 gap-4">
      {/* Colonne Gauche : Liste */}
      <div className="w-80 bg-white rounded-xl shadow overflow-y-auto">
        <div className="p-4 border-b font-bold bg-gray-50">Discussions</div>
        {convs.map(c => (
          <div key={c.conversation_key} onClick={() => setActiveKey(c.conversation_key)} 
            className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${activeKey === c.conversation_key ? 'bg-blue-50 border-r-4 border-blue-500' : ''}`}>
            <div className="text-xs text-gray-400">{c.conversation_key.slice(0,8)}</div>
            <div className="font-bold truncate">{c.last_message}</div>
            <div className="text-[10px] text-right">{new Date(c.last_created_at).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>

      {/* Colonne Droite : Chat */}
      <div className="flex-1 bg-[#e5ddd5] rounded-xl shadow flex flex-col overflow-hidden border">
        {activeKey ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-2 rounded-lg max-w-[70%] shadow ${m.sender_type === 'admin' ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
                    {m.image_url && <img src={m.image_url} className="rounded mb-1 max-h-60" />}
                    <p className="text-sm">{m.content}</p>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div className="p-4 bg-white flex gap-2">
              <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendAdmin()} className="flex-1 p-2 border rounded-full outline-none" />
              <button onClick={sendAdmin} className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold">ENVOYER</button>
            </div>
          </>
        ) : <div className="flex-1 flex items-center justify-center text-gray-500">Sélectionnez une conversation</div>}
      </div>
    </div>
  );
}

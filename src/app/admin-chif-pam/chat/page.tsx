"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminSide() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [list, setList] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");

  const loadList = async () => {
    const { data } = await supabase.from('latest_message_per_conversation').select('*').order('last_created_at', { ascending: false });
    if (data) setList(data);
  };

  useEffect(() => {
    loadList();
    supabase.channel('list').on('postgres_changes', { event: '*', schema: 'public', table: 'latest_message_per_conversation' }, loadList).subscribe();
  }, []);

  useEffect(() => {
    if (!active) return;
    supabase.from('messages').select('*').eq('conversation_key', active).order('created_at', { ascending: true }).then(({data}) => data && setMessages(data));
    const sub = supabase.channel(`admin_${active}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_key=eq.${active}` }, (p) => setMessages(v => [...v, p.new])).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [active]);

  const send = async () => {
    if (!reply || !active) return;
    await supabase.from('messages').insert({ conversation_key: active, sender_type: 'admin', content: reply });
    await supabase.from('latest_message_per_conversation').upsert({ conversation_key: active, last_message: reply, last_sender_type: 'admin', last_created_at: new Date().toISOString() });
    setReply("");
  };

  return (
    <div className="flex h-screen bg-white">
      <div className="w-1/3 border-r overflow-y-auto bg-gray-50">
        <div className="p-4 font-bold border-b">Clients</div>
        {list.map(c => (
          <div key={c.conversation_key} onClick={() => setActive(c.conversation_key)} className={`p-4 border-b cursor-pointer ${active === c.conversation_key ? 'bg-blue-100' : ''}`}>
            <div className="text-xs text-gray-400">{c.conversation_key.substring(0,8)}</div>
            <div className="font-semibold truncate">{c.last_message}</div>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        {active ? (
          <>
            <div className="flex-1 p-4 overflow-y-auto space-y-2 bg-gray-100">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-2 rounded-lg max-w-xs ${m.sender_type === 'admin' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex">
              <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} className="flex-1 p-2 border rounded" placeholder="Réponse..." />
              <button onClick={send} className="ml-2 bg-blue-600 text-white px-4 py-2 rounded">OK</button>
            </div>
          </>
        ) : <div className="m-auto text-gray-400">Sélectionnez un client</div>}
      </div>
    </div>
  );
}

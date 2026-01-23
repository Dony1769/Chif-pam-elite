"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminChat() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [convs, setConvs] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('conversations').select('*, profiles(username, email)').order('last_message_at', { ascending: false });
      if (data) setConvs(data);
    };
    load();
  }, []);

  useEffect(() => {
    if (!active) return;
    const fetch = async () => {
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', active.id).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetch();
    const sub = supabase.channel('admin_realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${active.id}` }, (p) => setMessages(prev => [...prev, p.new])).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [active]);

  const send = async () => {
    if (!reply.trim()) return;
    await supabase.from('messages').insert({ conversation_id: active.id, sender_type: 'admin', content: reply, type: 'text' });
    setReply("");
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      <div className="w-80 border-r border-slate-800 bg-slate-900 overflow-y-auto">
        <div className="p-4 font-bold border-b border-slate-800">Messages Clients</div>
        {convs.map(c => (
          <div key={c.id} onClick={() => setActive(c)} className={`p-4 border-b border-slate-800 cursor-pointer hover:bg-slate-800 ${active?.id === c.id ? 'bg-slate-800 border-r-2 border-blue-500' : ''}`}>
            <div className="text-sm font-bold">{c.profiles?.username || c.profiles?.email}</div>
            <div className="text-[10px] text-slate-500 uppercase">{c.id.slice(0,8)}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        {active ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-md ${m.sender_type === 'admin' ? 'bg-blue-600' : 'bg-slate-800'}`}>
                    {m.type === 'text' && <p>{m.content}</p>}
                    {m.type === 'image' && <img src={m.content} className="max-h-64 rounded" />}
                    {m.type === 'audio' && <audio src={m.content} controls />}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-900 flex gap-2">
              <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} className="flex-1 bg-slate-950 p-3 rounded-lg outline-none" placeholder="Répondre..." />
              <button onClick={send} className="bg-blue-600 px-6 rounded-lg font-bold">ENVOYER</button>
            </div>
          </>
        ) : <div className="flex-1 flex items-center justify-center text-slate-600">Sélectionnez une conversation</div>}
      </div>
    </div>
  );
}


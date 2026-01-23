"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function TelegramChat() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [user, setUser] = useState<any>(null);
  const [conv, setConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      let { data: c } = await supabase.from('conversations').select('*').eq('user_id', user.id).maybeSingle();
      if (!c) {
        const { data: newC } = await supabase.from('conversations').insert({ user_id: user.id }).select().single();
        c = newC;
      }
      setConv(c);
      fetchMsgs(c.id);
      
      // REALTIME SUBSCRIPTION
      supabase.channel(`chat_${c.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${c.id}` }, 
        (p) => setMessages(prev => [...prev, p.new]))
        .subscribe();
    };
    init();
  }, []);

  const fetchMsgs = async (id: string) => {
    const limit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', id).gt('created_at', limit).order('created_at', { ascending: true });
    if (data) setMessages(data);
    setTimeout(() => scroll.current?.scrollIntoView({ behavior: 'smooth' }), 200);
  };

  const send = async (type: string, content: string) => {
    if (!content || !conv) return;
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      sender_id: user.id,
      sender_type: 'user',
      type,
      content
    });
    setText("");
  };

  const upload = async (file: Blob | File, type: string) => {
    const name = `${Date.now()}.${type === 'audio' ? 'webm' : 'jpg'}`;
    const { data } = await supabase.storage.from('chat-media').upload(name, file);
    if (data) {
      const url = supabase.storage.from('chat-media').getPublicUrl(name).data.publicUrl;
      send(type, url);
    }
  };

  const startVoice = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    const chunks: any[] = [];
    mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.current.onstop = () => upload(new Blob(chunks, { type: 'audio/webm' }), 'audio');
    mediaRecorder.current.start();
    setRecording(true);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-white max-w-lg mx-auto border-x border-slate-800 shadow-2xl">
      <div className="p-4 bg-[#1e293b] border-b border-slate-700 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold">S</div>
        <div>
          <h2 className="text-sm font-bold">Support Telegram</h2>
          <p className="text-[10px] text-green-400">Online</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-2xl max-w-[85%] text-sm shadow-lg ${m.sender_type === 'user' ? 'bg-blue-600' : 'bg-slate-800'}`}>
              {m.type === 'text' && <p>{m.content}</p>}
              {m.type === 'image' && <img src={m.content} className="rounded-lg max-h-60" />}
              {m.type === 'audio' && <audio src={m.content} controls className="w-40 h-8" />}
              <span className="text-[8px] opacity-50 block text-right mt-1">{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
          </div>
        ))}
        <div ref={scroll} />
      </div>

      <div className="p-4 bg-[#1e293b] flex items-center gap-2">
        <label className="cursor-pointer hover:text-blue-400 transition-colors">
          📎 <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'image')} />
        </label>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send('text', text)} className="flex-1 bg-slate-900 border-none rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500" placeholder="Message..." />
        {text ? (
          <button onClick={() => send('text', text)} className="text-blue-500 font-bold">SEND</button>
        ) : (
          <button onMouseDown={startVoice} onMouseUp={() => { mediaRecorder.current?.stop(); setRecording(false); }} className={`p-2 rounded-full ${recording ? 'bg-red-500 animate-pulse' : 'text-blue-400'}`}>🎤</button>
        )}
      </div>
    </div>
  );
}

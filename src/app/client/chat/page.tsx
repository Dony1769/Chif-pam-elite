"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, ArrowLeft, Send, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function SimpleChat() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);

      // Chargement initial (filtré par RLS automatiquement)
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (data) setMessages(data);
      
      // Realtime : Écoute uniquement mes messages
      const channel = supabase.channel(`chat_${user.id}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `user_id=eq.${user.id}` 
        }, (payload) => {
            setMessages(prev => [...prev, payload.new]);
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    init();
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (txt: string, url: string | null = null) => {
    if (!myId || (!txt.trim() && !url)) return;
    setLoading(true);
    
    // 1. Insertion message
    await supabase.from('messages').insert({ user_id: myId, sender_type: 'client', content: txt, image_url: url });
    
    // 2. Mise à jour table latest
    await supabase.from('latest_message_per_conversation').upsert({
      user_id: myId,
      last_message: txt || "📷 Image",
      last_sender_type: 'client',
      last_created_at: new Date().toISOString()
    });
    
    setText("");
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col">
      <header className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between sticky top-0 z-50">
        <Link href="/client/home" className="p-2 hover:bg-white/5 rounded-full text-slate-400"><ArrowLeft size={24} /></Link>
        <div className="flex items-center gap-2">
            <h1 className="text-xl font-black italic">CHIF-<span className="text-emerald-500">PAM</span></h1>
        </div>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-900 to-[#020617]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl ${m.sender_type === 'client' ? 'bg-emerald-600 rounded-tr-none' : 'bg-slate-800 rounded-tl-none border border-white/10'}`}>
              {m.image_url && <img src={m.image_url} className="rounded-xl mb-2 max-h-60" alt="Preuve" />}
              {m.content && <p className="text-sm font-medium">{m.content}</p>}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <footer className="p-4 bg-slate-900/90 border-t border-white/5">
        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-white/5">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(text)} className="flex-1 bg-transparent p-2 outline-none font-bold" placeholder="Message..." />
          <button onClick={() => send(text)} disabled={loading} className="bg-emerald-500 text-slate-950 p-3 rounded-xl active:scale-95">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </footer>
    </main>
  );
}

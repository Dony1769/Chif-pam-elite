"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, ArrowLeft, Send, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

const LogoChifPam = () => (
  <div className="flex items-center gap-2">
    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" fill="none">
      <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
      <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <h1 className="text-xl font-black tracking-tighter uppercase italic text-white">CHIF-<span className="text-emerald-500">PAM</span></h1>
  </div>
);

export default function SimpleChat() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Reste silencieux si pas de user
      setUserId(user.id);

      // Charger historique
      const { data } = await supabase.from('messages').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      if (data) setMessages(data);
      
      // Realtime filtré par USER_ID pour la sécurité
      supabase.channel(`user_${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${user.id}` }, 
        (p) => setMessages(prev => [...prev, p.new])).subscribe();
    };
    init();
  }, [supabase]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (txt: string, url: string | null = null) => {
    if (!userId || (!txt.trim() && !url)) return;
    setLoading(true);
    
    // Envoi Parallèle : Message + Update de la liste
    const msg = { user_id: userId, sender_type: 'client', content: txt, image_url: url };
    
    await Promise.all([
      supabase.from('messages').insert(msg),
      supabase.from('latest_message_per_conversation').upsert({
        user_id: userId,
        last_message: txt || "📷 Image",
        last_sender_type: 'client',
        last_created_at: new Date().toISOString()
      })
    ]);
    
    setText("");
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col">
      <header className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between sticky top-0 z-50">
        <Link href="/client/home" className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
          <ArrowLeft size={24} />
        </Link>
        <LogoChifPam />
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-2xl ${
              m.sender_type === 'client' ? 'bg-emerald-600 rounded-tr-none' : 'bg-slate-800 border border-white/10 rounded-tl-none'
            }`}>
              {m.image_url && <img src={m.image_url} alt="Envoyé" className="max-w-full rounded-xl mb-2" />}
              {m.content && <p className="font-bold text-sm">{m.content}</p>}
              <span className="text-[9px] opacity-40 block text-right mt-1 font-black uppercase">
                {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <footer className="p-4 bg-slate-900/90 border-t border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-3 bg-slate-950 p-2 rounded-3xl border border-white/5">
          <label className="p-3 text-slate-500 hover:text-emerald-500 cursor-pointer">
            <ImageIcon size={22} />
            <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
               const file = e.target.files?.[0];
               if (file && userId) {
                 const path = `chat/${userId}/${Date.now()}`;
                 await supabase.storage.from('chat-media').upload(path, file);
                 const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
                 send("", data.publicUrl);
               }
            }} />
          </label>
          <input 
            value={text} 
            onChange={e => setText(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && send(text)} 
            className="flex-1 bg-transparent p-2 outline-none text-sm font-bold" 
            placeholder="Écrivez ici..." 
          />
          <button onClick={() => send(text)} disabled={loading} className="bg-emerald-500 text-slate-950 p-3 rounded-2xl font-black active:scale-90">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </footer>
    </main>
  );
}

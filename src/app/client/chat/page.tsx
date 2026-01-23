"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, ArrowLeft, Send, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

// Composant Logo Chif-Pam
const LogoChifPam = ({ className }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  const [convKey, setConvKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const key = user?.id || "invite-session"; 
      setConvKey(key);

      const { data } = await supabase.from('messages').select('*').eq('conversation_key', key).order('created_at', { ascending: true });
      if (data) setMessages(data);
      
      supabase.channel(`chat_${key}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_key=eq.${key}` }, 
        (p) => setMessages(prev => [...prev, p.new])).subscribe();
    };
    init();
  }, [supabase]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (txt: string, url: string | null = null) => {
    if (!convKey || (!txt.trim() && !url)) return;
    setLoading(true);
    const msg = { conversation_key: convKey, sender_type: 'client', content: txt, image_url: url };
    
    await supabase.from('messages').insert(msg);
    await supabase.from('latest_message_per_conversation').upsert({
      conversation_key: convKey,
      last_message: txt || "📷 Image envoyée",
      last_sender_type: 'client',
      last_created_at: new Date().toISOString()
    });
    setText("");
    setLoading(false);
  };

  const uploadImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !convKey) return;
    const path = `support/${convKey}/${Date.now()}_${file.name}`;
    const { data } = await supabase.storage.from('chat-media').upload(path, file);
    if (data) {
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);
      send("", publicUrl);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans flex flex-col">
      {/* HEADER FIXE */}
      <header className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between sticky top-0 z-50">
        <Link href="/client/home" className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
          <ArrowLeft size={24} />
        </Link>
        <LogoChifPam />
        <div className="w-10"></div> {/* Spacer pour centrer le logo */}
      </header>

      {/* ZONE DE MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-xl ${
              m.sender_type === 'client' 
                ? 'bg-emerald-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-100 border border-white/5 rounded-tl-none'
            }`}>
              {m.image_url && (
                <img src={m.image_url} alt="Image" className="max-w-full rounded-xl mb-2 border border-black/20" />
              )}
              {m.content && <p className="font-medium text-sm leading-relaxed">{m.content}</p>}
              <span className="text-[9px] opacity-50 block text-right mt-1">
                {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* INPUT ZONE */}
      <footer className="p-4 bg-slate-900/90 backdrop-blur-xl border-t border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-3 bg-slate-950 p-2 rounded-3xl border border-white/5">
          <label className="p-3 text-slate-500 hover:text-emerald-500 cursor-pointer transition-colors">
            <ImageIcon size={22} />
            <input type="file" className="hidden" accept="image/*" onChange={uploadImg} />
          </label>
          
          <input 
            value={text} 
            onChange={e => setText(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && send(text)} 
            className="flex-1 bg-transparent p-2 outline-none text-sm font-bold placeholder:text-slate-700" 
            placeholder="Écrivez à l'assistance..." 
          />
          
          <button 
            onClick={() => send(text)} 
            disabled={loading}
            className="bg-emerald-500 text-slate-950 p-3 rounded-2xl font-black hover:bg-emerald-400 transition-all active:scale-90 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </footer>
    </main>
  );
}

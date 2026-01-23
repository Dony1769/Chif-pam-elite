"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, ArrowLeft, Send, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function SimpleChat() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Chargement et Realtime
  useEffect(() => {
    const init = async () => {
      // On récupère l'user mais on ne bloque pas l'affichage
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (userId) {
        // Charger messages
        const { data } = await supabase.from('messages')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });
        if (data) setMessages(data);

        // Ecoute Realtime
        supabase.channel(`chat_${userId}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `user_id=eq.${userId}` 
          }, (p) => setMessages(prev => [...prev, p.new]))
          .subscribe();
      }
    };
    init();
  }, [supabase]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // 2. Fonction d'envoi simplifiée (SANS ALERTES BLOQUANTES)
  const send = async (content: string, url: string | null = null) => {
    if (!content.trim() && !url) return;
    
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Insertion directe
      await supabase.from('messages').insert({
        user_id: user.id,
        sender_type: 'client',
        content: content.trim(),
        image_url: url
      });

      // Update liste admin
      await supabase.from('latest_message_per_conversation').upsert({
        user_id: user.id,
        last_message: content.trim() || "📷 Image",
        last_sender_type: 'client',
        last_created_at: new Date().toISOString()
      });
    }
    
    setText("");
    setLoading(false);
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    const path = `chat/${user.id}/${Date.now()}_${file.name}`;
    const { data } = await supabase.storage.from('chat-media').upload(path, file);
    if (data) {
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);
      send("", publicUrl);
    } else {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col font-sans">
      <header className="p-4 bg-slate-900/80 border-b border-white/5 flex items-center justify-between sticky top-0 z-50">
        <Link href="/client/home" className="text-slate-400 hover:text-white"><ArrowLeft size={24} /></Link>
        <div className="text-center">
            <h1 className="text-xl font-black italic">CHIF-<span className="text-emerald-500">PAM</span></h1>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Assistance</p>
        </div>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="text-center py-20 opacity-30 text-xs font-bold uppercase tracking-widest">
            Aucun message. Commencez la discussion.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-lg ${
              m.sender_type === 'client' ? 'bg-emerald-600 rounded-tr-none' : 'bg-slate-800 border border-white/10 rounded-tl-none'
            }`}>
              {m.image_url && <img src={m.image_url} className="rounded-xl mb-2 max-h-60" />}
              <p className="text-sm font-medium">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <footer className="p-4 bg-slate-900/90 border-t border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-white/5">
          <label className="p-2 text-slate-500 hover:text-emerald-500 cursor-pointer">
            <ImageIcon size={22} />
            <input type="file" className="hidden" accept="image/*" onChange={upload} />
          </label>
          <input 
            value={text} 
            onChange={e => setText(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && send(text)}
            className="flex-1 bg-transparent p-2 outline-none text-sm font-bold" 
            placeholder="Écrivez ici..." 
          />
          <button 
            onClick={() => send(text)} 
            className="bg-emerald-500 text-slate-950 p-3 rounded-xl hover:bg-emerald-400 active:scale-95 transition-all"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </footer>
    </main>
  );
}


"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, ArrowLeft, Send, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SimpleChat() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login'); // Sécurité : redirection si non connecté
        return;
      }
      setUserId(user.id);

      // Récupérer les messages liés à cet utilisateur uniquement
      const { data } = await supabase.from('messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (data) setMessages(data);
      
      // Realtime filtré par user_id
      supabase.channel(`chat_${user.id}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `user_id=eq.${user.id}` 
        }, (p) => setMessages(prev => [...prev, p.new]))
        .subscribe();
    };
    init();
  }, [supabase, router]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (txt: string, url: string | null = null) => {
    if (!userId || (!txt.trim() && !url)) return;
    setLoading(true);

    const msg = { 
        user_id: userId, 
        conversation_key: userId, // On garde la clé pour compatibilité admin
        sender_type: 'client', 
        content: txt, 
        image_url: url 
    };
    
    // Insertion sécurisée par RLS
    await supabase.from('messages').insert(msg);
    
    // Mise à jour de la liste
    await supabase.from('latest_message_per_conversation').upsert({
      user_id: userId,
      conversation_key: userId,
      last_message: txt || "📷 Image envoyée",
      last_sender_type: 'client',
      last_created_at: new Date().toISOString()
    });
    
    setText("");
    setLoading(false);
  };

  // ... (Garder la fonction uploadImg identique à la tienne) ...
  const uploadImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const path = `support/${userId}/${Date.now()}_${file.name}`;
    const { data } = await supabase.storage.from('chat-media').upload(path, file);
    if (data) {
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);
      send("", publicUrl);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans flex flex-col">
      <header className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between sticky top-0 z-50">
        <Link href="/client/home" className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex items-center gap-2">
            <h1 className="text-xl font-black italic uppercase text-white">CHIF-<span className="text-emerald-500">PAM</span></h1>
        </div>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl ${m.sender_type === 'client' ? 'bg-emerald-600' : 'bg-slate-800'}`}>
              {m.image_url && <img src={m.image_url} alt="" className="max-w-full rounded-xl mb-2" />}
              <p className="text-sm font-medium">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <footer className="p-4 bg-slate-900/90 border-t border-white/5">
        <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-3xl">
          <label className="p-3 text-slate-500 cursor-pointer"><ImageIcon size={22} /><input type="file" className="hidden" onChange={uploadImg} /></label>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(text)} className="flex-1 bg-transparent p-2 outline-none text-sm" placeholder="Message..." />
          <button onClick={() => send(text)} disabled={loading} className="bg-emerald-500 text-slate-950 p-3 rounded-2xl font-black">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </footer>
    </main>
  );
}

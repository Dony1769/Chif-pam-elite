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

      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (data) setMessages(data);
      
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

  // FONCTION D'ENVOI CORRIGÉE
  const send = async (txt: string, url: string | null = null) => {
    // On revérifie l'ID en direct pour être sûr à 100%
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || (!txt.trim() && !url)) return;
    
    setLoading(true);
    try {
      const currentId = user.id;

      // 1. Insertion message
      const { error: msgError } = await supabase.from('messages').insert({ 
        user_id: currentId, 
        sender_type: 'client', 
        content: txt, 
        image_url: url 
      });

      if (msgError) throw msgError;

      // 2. Mise à jour table latest (L'upsert échoue souvent si la RLS est mal mise)
      await supabase.from('latest_message_per_conversation').upsert({
        user_id: currentId,
        last_message: txt || "📷 Image",
        last_sender_type: 'client',
        last_created_at: new Date().toISOString()
      });
      
      setText("");
    } catch (err) {
      console.error("Erreur d'envoi:", err);
      alert("Erreur d'envoi. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  // AJOUT DE L'UPLOAD D'IMAGE (Oublié dans ton dernier jet)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myId) return;
    setLoading(true);
    try {
      const filePath = `chat/${myId}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from('chat-media').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(filePath);
      await send("", publicUrl);
    } catch (err) {
      alert("Erreur upload image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col">
      <header className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between sticky top-0 z-50">
        <Link href="/client/home" className="p-2 hover:bg-white/5 rounded-full text-slate-400"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-black italic uppercase">CHIF-<span className="text-emerald-500">PAM</span></h1>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl ${m.sender_type === 'client' ? 'bg-emerald-600 rounded-tr-none' : 'bg-slate-800 rounded-tl-none border border-white/10'}`}>
              {m.image_url && <img src={m.image_url} className="rounded-xl mb-2 max-h-60" alt="Preuve" />}
              {m.content && <p className="text-sm font-bold leading-tight">{m.content}</p>}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <footer className="p-4 bg-slate-900 border-t border-white/5">
        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-white/5">
          {/* BOUTON IMAGE */}
          <label className="p-2 text-slate-500 hover:text-emerald-500 cursor-pointer transition-colors">
            <ImageIcon size={24} />
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
          </label>

          <input 
            value={text} 
            onChange={e => setText(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && !loading && send(text)} 
            className="flex-1 bg-transparent p-2 outline-none font-bold text-sm" 
            placeholder="Écrivez ici..." 
          />
          
          <button 
            onClick={() => send(text)} 
            disabled={loading || !text.trim()} 
            className="bg-emerald-500 text-slate-950 p-3 rounded-xl hover:bg-emerald-400 disabled:opacity-30 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </footer>
    </main>
  );
}

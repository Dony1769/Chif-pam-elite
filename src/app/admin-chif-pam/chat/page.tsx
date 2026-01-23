"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Send, User, Clock, Search, Bell } from 'lucide-react';

export default function AdminSide() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [list, setList] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { audio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'); }, []);

  const loadList = async () => {
    // Jointure avec la table Profiles pour avoir le pseudo et le téléphone !
    const { data } = await supabase
      .from('latest_message_per_conversation')
      .select(`*, profiles:user_id(username, phone)`)
      .order('last_created_at', { ascending: false });
    if (data) setList(data);
  };

  useEffect(() => {
    loadList();
    const ch = supabase.channel('admin_hub').on('postgres_changes', { event: '*', schema: 'public', table: 'latest_message_per_conversation' }, (p) => {
      if (p.new && (p.new as any).last_sender_type === 'client') audio.current?.play();
      loadList();
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase]);

  useEffect(() => {
    if (!active) return;
    supabase.from('messages').select('*').eq('user_id', active).order('created_at', { ascending: true }).then(({data}) => data && setMessages(data));
    const sub = supabase.channel(`chat_${active}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${active}` }, (p) => setMessages(v => [...v, p.new])).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [active, supabase]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!reply.trim() || !active) return;
    const txt = reply; setReply("");
    await supabase.from('messages').insert({ user_id: active, sender_type: 'admin', content: txt });
    await supabase.from('latest_message_per_conversation').upsert({ user_id: active, last_message: txt, last_sender_type: 'admin', last_created_at: new Date().toISOString() });
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 font-sans">
      <aside className="w-1/3 border-r border-white/5 flex flex-col bg-slate-900/40">
        <div className="p-6">
          <h2 className="text-2xl font-black italic uppercase text-emerald-500 flex items-center gap-3">Support <Bell size={22} className="text-white animate-pulse"/></h2>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-3 text-slate-600" size={16} />
            <input className="w-full bg-slate-950 border border-white/5 rounded-2xl p-3 pl-10 text-xs font-bold focus:border-emerald-500 outline-none transition-all" placeholder="Rechercher..." />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {list.map(c => (
            <div key={c.user_id} onClick={() => setActive(c.user_id)} 
              className={`p-5 border-b border-white/5 cursor-pointer transition-all ${active === c.user_id ? 'bg-emerald-500/10 border-r-4 border-emerald-500' : 'hover:bg-white/5'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black uppercase text-white flex items-center gap-2">
                  <User size={12} className="text-emerald-500"/> {c.profiles?.username || "Client"}
                  {c.last_sender_type === 'client' && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />}
                </span>
                <span className="text-[10px] text-slate-500 font-bold italic"><Clock size={10} className="inline mr-1"/>{new Date(c.last_created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
              </div>
              <p className="text-xs truncate font-bold text-slate-400 italic">
                {c.last_sender_type === 'admin' ? '✓ ' : ''}{c.last_message}
              </p>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex-1 flex flex-col">
        {active ? (
          <>
            <div className="p-4 bg-slate-900/50 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 font-black border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  {list.find(l=>l.user_id===active)?.profiles?.username?.[0].toUpperCase() || 'C'}
                </div>
                <div>
                  <p className="text-sm font-black text-white">{list.find(l=>l.user_id===active)?.profiles?.username || 'Client'}</p>
                  <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest italic leading-none">Connecté</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-3xl max-w-md shadow-2xl border ${
                    m.sender_type === 'admin' ? 'bg-emerald-600 border-emerald-400 text-white rounded-tr-none' : 'bg-slate-800 border-white/5 text-slate-200 rounded-tl-none'
                  }`}>
                    {m.image_url && <img src={m.image_url} className="max-h-80 rounded-2xl mb-2 border border-black/20" alt="Preuve" />}
                    <p className="text-sm font-bold leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div className="p-6 bg-slate-900/80 backdrop-blur-xl border-t border-white/5">
              <div className="flex gap-3 max-w-5xl mx-auto items-center">
                <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} 
                  className="flex-1 bg-slate-950 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 font-bold transition-all placeholder:text-slate-700 shadow-inner" 
                  placeholder="Tapez votre réponse pro..." />
                <button onClick={send} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 h-[56px] px-8 rounded-2xl font-black transition-all flex items-center gap-2 active:scale-95">
                  ENVOYER <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="m-auto flex flex-col items-center opacity-20">
            <User size={100} strokeWidth={0.5}/>
            <p className="font-black uppercase tracking-[0.5em] mt-4 italic">En attente d'un client</p>
          </div>
        )}
      </section>
    </div>
  );
}


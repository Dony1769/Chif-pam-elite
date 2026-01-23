"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Send, User, Clock, Search } from 'lucide-react';

export default function AdminSide() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [list, setList] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadList = async () => {
    const { data } = await supabase.from('latest_message_per_conversation').select('*').order('last_created_at', { ascending: false });
    if (data) setList(data);
  };

  useEffect(() => {
    loadList();
    supabase.channel('list').on('postgres_changes', { event: '*', schema: 'public', table: 'latest_message_per_conversation' }, loadList).subscribe();
  }, [supabase]);

  useEffect(() => {
    if (!active) return;
    supabase.from('messages').select('*').eq('conversation_key', active).order('created_at', { ascending: true }).then(({data}) => data && setMessages(data));
    const sub = supabase.channel(`admin_${active}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_key=eq.${active}` }, (p) => setMessages(v => [...v, p.new])).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [active, supabase]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!reply.trim() || !active) return;
    const txt = reply;
    setReply("");
    await supabase.from('messages').insert({ conversation_key: active, sender_type: 'admin', content: txt });
    await supabase.from('latest_message_per_conversation').upsert({ conversation_key: active, last_message: txt, last_sender_type: 'admin', last_created_at: new Date().toISOString() });
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200">
      {/* SIDEBAR GAUCHE */}
      <div className="w-1/3 border-r border-white/5 flex flex-col bg-slate-900/50">
        <div className="p-6">
          <h2 className="text-2xl font-black italic uppercase text-emerald-500 mb-4">Support Hub</h2>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-600" size={16} />
            <input className="w-full bg-slate-950 border border-white/5 rounded-xl p-2.5 pl-10 text-xs outline-none focus:border-emerald-500/50" placeholder="Rechercher un client..." />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {list.map(c => (
            <div key={c.conversation_key} onClick={() => setActive(c.conversation_key)} 
              className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 ${active === c.conversation_key ? 'bg-emerald-500/10 border-r-4 border-emerald-500' : ''}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase"><User size={10}/> {c.conversation_key.substring(0,8)}</span>
                <span className="text-[9px] text-slate-600 flex items-center gap-1"><Clock size={10}/> {new Date(c.last_created_at).toLocaleTimeString()}</span>
              </div>
              <p className={`text-sm truncate font-medium ${active === c.conversation_key ? 'text-emerald-400' : 'text-slate-300'}`}>
                {c.last_sender_type === 'admin' ? 'Vous: ' : ''}{c.last_message}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT DROITE */}
      <div className="flex-1 flex flex-col relative">
        {active ? (
          <>
            <div className="p-4 bg-slate-900/30 border-b border-white/5 flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 font-bold">
                {active.substring(0,2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold">Client #{active.substring(0,8)}</p>
                <p className="text-[10px] text-emerald-500 animate-pulse uppercase font-black">Session Active</p>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-md shadow-xl ${
                    m.sender_type === 'admin' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200 border border-white/5'
                  }`}>
                    {m.image_url && <img src={m.image_url} className="max-h-64 rounded-xl mb-2" />}
                    <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div className="p-4 bg-slate-900 border-t border-white/5">
              <div className="flex gap-3 max-w-4xl mx-auto">
                <input 
                  value={reply} 
                  onChange={e => setReply(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && send()} 
                  className="flex-1 bg-slate-950 border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500" 
                  placeholder="Écrire une réponse..." 
                />
                <button onClick={send} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 rounded-2xl font-black transition-all flex items-center gap-2">
                  <span>ENVOYER</span> <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="m-auto text-center">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 text-slate-700">
               <User size={40} />
            </div>
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Aucune conversation sélectionnée</p>
          </div>
        )}
      </div>
    </div>
  );
}

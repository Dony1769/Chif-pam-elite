"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Send, User, Clock, Search, Bell } from 'lucide-react';

export default function AdminSide() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [list, setList] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioPlayer = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioPlayer.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
  }, []);

  const loadList = async () => {
    // Jointure avec la table profiles pour avoir le pseudo et le téléphone
    const { data } = await supabase
      .from('latest_message_per_conversation')
      .select(`*, profiles:user_id(username, phone)`)
      .order('last_created_at', { ascending: false });
    if (data) setList(data);
  };

  useEffect(() => {
    loadList();
    const channel = supabase.channel('admin_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'latest_message_per_conversation' }, (payload) => {
        if (payload.new && (payload.new as any).last_sender_type === 'client') {
          audioPlayer.current?.play().catch(() => {});
        }
        loadList();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    if (!activeConv) return;
    supabase.from('messages')
        .select('*')
        .eq('user_id', activeConv.user_id)
        .order('created_at', { ascending: true })
        .then(({data}) => data && setMessages(data));

    const sub = supabase.channel(`admin_chat_${activeConv.user_id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${activeConv.user_id}` }, 
        (p) => setMessages(v => [...v, p.new]))
        .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeConv, supabase]);

  const sendReply = async () => {
    if (!reply.trim() || !activeConv) return;
    const txt = reply;
    setReply("");
    
    // Insertion avec l'user_id du client sélectionné
    await supabase.from('messages').insert({ 
        user_id: activeConv.user_id, 
        conversation_key: activeConv.user_id,
        sender_type: 'admin', 
        content: txt 
    });
    
    await supabase.from('latest_message_per_conversation').upsert({ 
        user_id: activeConv.user_id,
        conversation_key: activeConv.user_id,
        last_message: txt, 
        last_sender_type: 'admin', 
        last_created_at: new Date().toISOString() 
    });
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200">
      {/* SIDEBAR */}
      <div className="w-1/3 border-r border-white/5 flex flex-col bg-slate-900/50">
        <div className="p-6">
          <h2 className="text-2xl font-black italic uppercase text-emerald-500 mb-4 flex items-center gap-2">Support Hub <Bell size={20}/></h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.map(c => (
            <div key={c.user_id} onClick={() => setActiveConv(c)} 
              className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 ${activeConv?.user_id === c.user_id ? 'bg-emerald-500/10 border-r-4 border-emerald-500' : ''}`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-300">
                    {c.profiles?.username || c.profiles?.phone || "Inconnu"}
                    {c.last_sender_type === 'client' && <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block ml-2 animate-pulse"/>}
                </span>
                <span className="text-[9px] text-slate-500">{new Date(c.last_created_at).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs truncate text-slate-500 mt-1">{c.last_message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col">
        {activeConv ? (
          <>
            <div className="p-4 bg-slate-900/30 border-b border-white/5">
                <p className="font-bold text-emerald-500 uppercase italic">{activeConv.profiles?.username || "Client"}</p>
                <p className="text-[10px] text-slate-500">{activeConv.profiles?.phone}</p>
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-md ${m.sender_type === 'admin' ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                    <p className="text-sm">{m.content}</p>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div className="p-4 border-t border-white/5 flex gap-3">
              <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()} className="flex-1 bg-slate-950 p-4 rounded-2xl outline-none" placeholder="Répondre..." />
              <button onClick={sendReply} className="bg-emerald-500 text-slate-950 px-8 rounded-2xl font-black">ENVOYER</button>
            </div>
          </>
        ) : <div className="m-auto text-slate-500 uppercase font-black tracking-widest">Choisir une discussion</div>}
      </div>
    </div>
  );
}

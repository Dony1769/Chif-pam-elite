"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Send, User, Clock, Search, Bell, ShieldCheck } from 'lucide-react';

export default function AdminSide() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [list, setList] = useState<any[]>([]);
  const [activeUser, setActiveUser] = useState<any>(null); // Stocke l'objet profil entier
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioPlayer = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioPlayer.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
  }, []);

  // Charge la liste avec jointure sur Profiles
  const loadList = async () => {
    const { data } = await supabase
      .from('latest_message_per_conversation')
      .select(`*, profiles(username, phone)`) // Jointure !
      .order('last_created_at', { ascending: false });
    if (data) setList(data);
  };

  useEffect(() => {
    loadList();
    const chan = supabase.channel('admin_global').on('postgres_changes', { event: '*', schema: 'public', table: 'latest_message_per_conversation' }, (p) => {
        if (p.new && (p.new as any).last_sender_type === 'client') audioPlayer.current?.play();
        loadList();
    }).subscribe();
    return () => { supabase.removeChannel(chan); };
  }, []);

  // Charger messages d'une discussion
  useEffect(() => {
    if (!activeUser) return;
    supabase.from('messages').select('*').eq('user_id', activeUser.user_id).order('created_at', { ascending: true }).then(({data}) => setMessages(data || []));
    
    const sub = supabase.channel(`sub_${activeUser.user_id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${activeUser.user_id}` }, (p) => {
        setMessages(v => [...v, p.new]);
    }).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeUser]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendResponse = async () => {
    if (!reply.trim() || !activeUser) return;
    const { data: { user } } = await supabase.auth.getUser();
    const txt = reply; setReply("");

    await supabase.from('messages').insert({ user_id: activeUser.user_id, sender_type: 'admin', content: txt });
    await supabase.from('latest_message_per_conversation').upsert({
      user_id: activeUser.user_id,
      last_message: txt,
      last_sender_type: 'admin',
      last_created_at: new Date().toISOString()
    });
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200">
      {/* SIDEBAR */}
      <div className="w-1/3 border-r border-white/5 flex flex-col bg-slate-900/40">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-black text-emerald-500 flex items-center gap-2 italic uppercase">
            <ShieldCheck /> Support Admin
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.map(c => (
            <div key={c.user_id} onClick={() => setActiveUser(c)} 
              className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all ${activeUser?.user_id === c.user_id ? 'bg-emerald-500/10 border-r-4 border-emerald-500' : ''}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-white uppercase text-xs">{c.profiles?.username || "Anonyme"}</span>
                <span className="text-[10px] text-slate-500">{new Date(c.last_created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
              </div>
              <p className="text-sm truncate text-slate-400 italic">
                {c.last_sender_type === 'client' && <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />}
                {c.last_message}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ZONE CHAT */}
      <div className="flex-1 flex flex-col">
        {activeUser ? (
          <>
            <div className="p-4 bg-slate-900/50 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="font-black text-emerald-400 uppercase italic">{activeUser.profiles?.username}</h3>
                <p className="text-[10px] text-slate-500 tracking-widest">{activeUser.profiles?.phone}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-md ${m.sender_type === 'admin' ? 'bg-emerald-600 text-white' : 'bg-slate-800 border border-white/10'}`}>
                    {m.image_url && <img src={m.image_url} className="rounded-lg mb-2 max-h-80" alt="Preuve" />}
                    <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
            <div className="p-4 bg-slate-900 border-t border-white/10 flex gap-2">
              <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e=>e.key==='Enter' && sendResponse()} className="flex-1 bg-slate-950 border border-white/10 p-3 rounded-xl outline-none" placeholder="Répondre..." />
              <button onClick={sendResponse} className="bg-emerald-500 text-slate-950 px-6 rounded-xl font-black">ENVOYER</button>
            </div>
          </>
        ) : (
          <div className="m-auto opacity-20 flex flex-col items-center">
            <User size={80} />
            <p className="font-black uppercase tracking-widest mt-4 italic">Sélectionner un client</p>
          </div>
        )}
      </div>
    </div>
  );
}

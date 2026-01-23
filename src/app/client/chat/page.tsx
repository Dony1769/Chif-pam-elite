"use client";

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function SimpleChat() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [ticket, setTicket] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // Connexion au chat une fois le ticket créé
  useEffect(() => {
    if (!ticket) return;
    const channel = supabase.channel(`chat_${ticket.id}`)
      .on('broadcast', { event: 'msg' }, ({ payload }) => {
        setChat((prev) => [...prev, payload]);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket]);

  const startChat = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // On récupère l'user s'il existe, sinon on continue en "Invité"
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    const formData = new FormData(e.currentTarget);
    const file = formData.get('pic') as File;
    let path = "";

    if (file && file.size > 0) {
      const name = `${Date.now()}-${file.name}`;
      const { data } = await supabase.storage.from('tickets').upload(name, file);
      if (data) path = data.path;
    }

    const { data, error } = await supabase.from('support_tickets').insert({
      user_id: userId,
      category: formData.get('cat'),
      attachment_url: path,
      status: 'ouvert'
    }).select().single();

    if (data) setTicket(data);
    setLoading(false);
  };

  const send = async () => {
    if (!msg.trim()) return;
    const payload = { text: msg, sender: 'user', time: new Date() };
    await supabase.channel(`chat_${ticket.id}`).send({
      type: 'broadcast',
      event: 'msg',
      payload
    });
    setChat(prev => [...prev, payload]);
    setMsg("");
  };

  if (!ticket) return (
    <div className="max-w-md mx-auto m-10 p-6 bg-white rounded-2xl shadow-lg border">
      <h2 className="text-xl font-bold mb-4">Besoin d'aide ?</h2>
      <form onSubmit={startChat} className="space-y-4">
        <select name="cat" className="w-full p-3 border rounded-xl bg-gray-50">
          <option value="paiement">Problème Paiement</option>
          <option value="technique">Problème Technique</option>
        </select>
        <input type="file" name="pic" accept="image/*" className="w-full text-sm" />
        <button disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">
          {loading ? "Connexion..." : "Lancer le Chat Direct"}
        </button>
      </form>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto h-[80vh] flex flex-col border rounded-2xl overflow-hidden mt-5 shadow-2xl">
      <div className="bg-blue-600 p-4 text-white font-bold flex justify-between">
        <span>Support Direct</span>
        <span className="text-xs opacity-50">#{ticket.id.slice(0,5)}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${m.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <div className="p-4 bg-white border-t flex gap-2">
        <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Message..." className="flex-1 p-2 border rounded-lg outline-none"/>
        <button onClick={send} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">OK</button>
      </div>
    </div>
  );
}

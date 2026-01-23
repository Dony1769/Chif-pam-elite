"use client";

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function GuestChat() {
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

  // Écoute en temps réel
  useEffect(() => {
    if (!ticket) return;
    const channel = supabase.channel(`t_${ticket.id}`)
      .on('broadcast', { event: 'msg' }, ({ payload }) => {
        setChat((prev) => [...prev, payload]);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket]);

  const handleStart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const file = formData.get('img') as File;
    let imgPath = "";

    // Upload simple
    if (file && file.size > 0) {
      const name = `${Math.random().toString(36).slice(2)}-${file.name}`;
      const { data } = await supabase.storage.from('tickets').upload(name, file);
      if (data) imgPath = data.path;
    }

    // Création du ticket (On ne demande plus d'USER ID)
    const { data, error } = await supabase.from('support_tickets').insert({
      category: formData.get('cat'),
      attachment_url: imgPath,
      status: 'ouvert'
    }).select().single();

    if (data) setTicket(data);
    else alert("Erreur réseau. Réessayez.");
    setLoading(false);
  };

  const send = async () => {
    if (!msg.trim()) return;
    const payload = { text: msg, sender: 'user', time: new Date() };
    await supabase.channel(`t_${ticket.id}`).send({ type: 'broadcast', event: 'msg', payload });
    setChat(prev => [...prev, payload]);
    setMsg("");
  };

  if (!ticket) return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-3xl shadow-2xl border border-gray-100 text-center">
      <h2 className="text-2xl font-black text-gray-800 mb-2">Besoin d'aide ?</h2>
      <p className="text-gray-500 text-sm mb-6">Chat direct avec nos agents</p>
      <form onSubmit={handleStart} className="space-y-4 text-left">
        <select name="cat" className="w-full p-4 border rounded-2xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="paiement">💰 Problème de Paiement</option>
          <option value="technique">⚙️ Problème Technique</option>
          <option value="autre">📝 Autre demande</option>
        </select>
        <div className="p-4 border-2 border-dashed rounded-2xl text-center">
          <input type="file" name="img" accept="image/*" className="text-xs" />
        </div>
        <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black transition-all transform active:scale-95 shadow-lg shadow-blue-200">
          {loading ? "Lancement du chat..." : "Démarrer maintenant"}
        </button>
      </form>
    </div>
  );

  return (
    <div className="max-w-md mx-auto h-[90vh] flex flex-col bg-white shadow-2xl rounded-3xl overflow-hidden mt-4 border border-gray-100">
      <div className="bg-blue-600 p-5 text-white flex justify-between items-center">
        <div>
          <h3 className="font-black text-lg">Support Actif</h3>
          <p className="text-[10px] opacity-75 uppercase tracking-widest">ID: {ticket.id.slice(0,8)}</p>
        </div>
        <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_#4ade80]"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-4 rounded-3xl max-w-[85%] text-sm shadow-sm font-medium ${m.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border rounded-tl-none'}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white border-t flex gap-2">
        <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Tapez votre message..." className="flex-1 p-4 border rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"/>
        <button onClick={send} className="bg-blue-600 text-white px-6 rounded-2xl font-bold shadow-md transform active:scale-90 transition-transform">Envoyer</button>
      </div>
    </div>
  );
}

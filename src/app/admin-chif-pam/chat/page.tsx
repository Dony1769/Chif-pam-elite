"use client";

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminChatPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [chat, setChat] = useState<any[]>([]);
  const [adminMsg, setAdminMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // 1. Charger les tickets ouverts
  useEffect(() => {
    const loadTickets = async () => {
      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .neq('status', 'ferme')
        .order('created_at', { ascending: false });
      if (data) setTickets(data);
    };
    loadTickets();
  }, []);

  // 2. Écouter le chat du ticket sélectionné
  useEffect(() => {
    if (!activeTicket) return;
    const channel = supabase.channel(`chat_${activeTicket.id}`)
      .on('broadcast', { event: 'msg' }, ({ payload }) => {
        setChat((prev) => [...prev, payload]);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTicket]);

  const sendResponse = async () => {
    if (!adminMsg.trim() || !activeTicket) return;
    const payload = { text: adminMsg, sender: 'admin', time: new Date() };
    
    await supabase.channel(`chat_${activeTicket.id}`).send({
      type: 'broadcast',
      event: 'msg',
      payload
    });

    setChat(prev => [...prev, payload]);
    setAdminMsg("");
  };

  const closeTicket = async (id: string) => {
    await supabase.from('support_tickets').update({ status: 'ferme' }).eq('id', id);
    setActiveTicket(null);
    setTickets(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="flex h-screen bg-gray-100 p-4 gap-4 text-gray-800">
      {/* Liste des tickets */}
      <div className="w-1/3 bg-white rounded-2xl shadow overflow-y-auto border">
        <div className="p-4 border-b font-bold bg-gray-50 rounded-t-2xl">Tickets en attente</div>
        {tickets.map(t => (
          <div 
            key={t.id} 
            onClick={() => { setActiveTicket(t); setChat([]); }}
            className={`p-4 border-b cursor-pointer hover:bg-blue-50 ${activeTicket?.id === t.id ? 'bg-blue-100' : ''}`}
          >
            <div className="text-xs font-mono text-gray-400">ID: {t.id.slice(0,8)}</div>
            <div className="font-bold capitalize">{t.category}</div>
            <div className="text-[10px] text-gray-500">{new Date(t.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Fenêtre de Chat */}
      <div className="flex-1 bg-white rounded-2xl shadow flex flex-col border overflow-hidden">
        {activeTicket ? (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <span className="font-bold">Chat avec {activeTicket.user_id ? 'Client' : 'Invité'}</span>
              <button onClick={() => closeTicket(activeTicket.id)} className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg">Fermer</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {/* Affichage de l'image si elle existe */}
              {activeTicket.attachment_url && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Preuve jointe :</p>
                  <img 
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tickets/${activeTicket.attachment_url}`} 
                    className="max-w-xs rounded-lg border shadow-sm mt-1"
                    alt="Preuve"
                  />
                </div>
              )}

              {chat.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[70%] text-sm ${m.sender === 'admin' ? 'bg-gray-800 text-white' : 'bg-white border'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div className="p-4 border-t flex gap-2">
              <input value={adminMsg} onChange={e => setAdminMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendResponse()} placeholder="Répondre au client..." className="flex-1 p-2 border rounded-lg outline-none"/>
              <button onClick={sendResponse} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Envoyer</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">Sélectionnez un ticket pour répondre</div>
        )}
      </div>
    </div>
  );
}

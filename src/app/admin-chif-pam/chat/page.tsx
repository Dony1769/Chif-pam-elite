"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SupportTicket, TicketMessage } from '@/types/support';

export default function AdminTicketPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [chatLogs, setChatLogs] = useState<TicketMessage[]>([]);
  const [adminMsg, setAdminMsg] = useState("");

  useEffect(() => {
    const fetchTickets = async () => {
      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .neq('status', 'ferme')
        .order('created_at', { ascending: false });
      if (data) setTickets(data as SupportTicket[]);
    };
    fetchTickets();
  }, [supabase]);

  useEffect(() => {
    if (!activeTicket) return;

    const channel = supabase.channel(`ticket_${activeTicket.id}`, {
      config: { broadcast: { self: true } }
    });

    channel
      .on('broadcast', { event: 'new_msg' }, ({ payload }: { payload: TicketMessage }) => {
        setChatLogs((prev) => [...prev, payload]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeTicket, supabase]);

  const sendResponse = async () => {
    if (!adminMsg.trim() || !activeTicket) return;

    const channel = supabase.channel(`ticket_${activeTicket.id}`);
    await channel.send({
      type: 'broadcast',
      event: 'new_msg',
      payload: { text: adminMsg, sender: 'admin', time: new Date().toISOString() } as TicketMessage
    });

    // Log sans contenu de message pour la traçabilité
    await supabase.from('support_logs').insert({
      ticket_id: activeTicket.id,
      action: 'Réponse admin',
      actor_type: 'admin'
    });

    setAdminMsg("");
  };

  const closeTicket = async (id: string) => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'ferme', closed_at: new Date().toISOString() })
      .eq('id', id);
    
    if (!error) {
      setActiveTicket(null);
      setTickets(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div className="flex h-[90vh] bg-gray-50 p-4 gap-4">
      {/* Liste des tickets (Sidebar) */}
      <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col">
        <div className="p-4 border-b font-bold text-gray-700 flex justify-between items-center">
          Tickets Actifs
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{tickets.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tickets.length === 0 && <p className="text-center text-gray-400 mt-10 text-sm">Aucun ticket ouvert</p>}
          {tickets.map(t => (
            <button 
              key={t.id} 
              onClick={() => { setActiveTicket(t); setChatLogs([]); }}
              className={`w-full text-left p-4 border-b transition-all hover:bg-gray-50 ${activeTicket?.id === t.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase">{t.id.slice(0,8)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${t.priority === 'critique' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                  {t.priority}
                </span>
              </div>
              <div className="font-bold text-gray-800 text-sm">{t.category}</div>
              <div className="text-[10px] text-gray-400 mt-1">{new Date(t.created_at).toLocaleString()}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Zone de discussion (Main) */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        {activeTicket ? (
          <>
            <div className="p-4 border-b bg-white flex justify-between items-center">
              <div>
                <h2 className="font-bold text-gray-800">Discussion avec l'utilisateur</h2>
                <p className="text-xs text-gray-500 font-mono italic">UID: {activeTicket.user_id}</p>
              </div>
              <button 
                onClick={() => closeTicket(activeTicket.id)}
                className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors px-4 py-2 rounded-xl text-xs font-bold border border-red-100"
              >
                Fermer & Archiver
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
              {/* Affichage de la photo de paiement si présente */}
              {activeTicket.attachment_url && (
                <div className="bg-white p-2 rounded-xl border shadow-sm max-w-sm">
                  <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Document joint (Preuve)</p>
                  <img 
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tickets/${activeTicket.attachment_url}`} 
                    className="rounded-lg w-full hover:scale-105 transition-transform cursor-pointer"
                    alt="Attachement"
                  />
                </div>
              )}
              
              {chatLogs.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${m.sender === 'admin' ? 'bg-gray-800 text-white rounded-tr-none' : 'bg-white border text-gray-800 rounded-tl-none'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t flex gap-2 bg-white">
              <input 
                value={adminMsg} 
                onChange={(e) => setAdminMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendResponse()}
                placeholder="Saisissez votre réponse..."
                className="flex-1 p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={sendResponse} className="bg-blue-600 text-white px-6 rounded-xl font-bold hover:bg-blue-700 transition-shadow">
                Répondre
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-4">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            <p className="text-lg">Sélectionnez un ticket pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );
}

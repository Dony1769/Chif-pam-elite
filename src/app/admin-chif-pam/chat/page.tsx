"use client";

import { useState, useEffect, useRef } from 'react';
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll automatique vers le bas
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLogs]);

  // Chargement des tickets
  useEffect(() => {
    const fetchTickets = async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .neq('status', 'ferme')
        .order('created_at', { ascending: false });
      
      if (error) console.error("Erreur chargement tickets:", error);
      if (data) setTickets(data as SupportTicket[]);
    };
    fetchTickets();
  }, [supabase]);

  // Écoute des messages en temps réel
  useEffect(() => {
    if (!activeTicket) return;

    const channel = supabase.channel(`ticket_${activeTicket.id}`, {
      config: { broadcast: { self: true } }
    });

    channel
      .on('broadcast', { event: 'new_msg' }, ({ payload }: { payload: TicketMessage }) => {
        setChatLogs((prev) => [...prev, payload]);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log("Connecté au ticket:", activeTicket.id);
      });

    return () => { supabase.removeChannel(channel); };
  }, [activeTicket, supabase]);

  const sendResponse = async () => {
    if (!adminMsg.trim() || !activeTicket) return;

    try {
      const channel = supabase.channel(`ticket_${activeTicket.id}`);
      
      // Envoi du message via Broadcast
      await channel.send({
        type: 'broadcast',
        event: 'new_msg',
        payload: { 
          text: adminMsg.trim(), 
          sender: 'admin', 
          time: new Date().toISOString() 
        } as TicketMessage
      });

      // Log système pour garder une trace de l'activité
      await supabase.from('support_logs').insert({
        ticket_id: activeTicket.id,
        action: 'Réponse admin',
        actor_type: 'admin'
      });

      setAdminMsg("");
    } catch (err) {
      console.error("Erreur lors de l'envoi:", err);
    }
  };

  const closeTicket = async (id: string) => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'ferme', closed_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      alert("Erreur lors de la fermeture");
    } else {
      setActiveTicket(null);
      setTickets(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div className="flex h-[90vh] bg-gray-50 p-4 gap-4">
      {/* Sidebar - Liste des tickets */}
      <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col">
        <div className="p-4 border-b font-bold text-gray-700 flex justify-between items-center bg-gray-50 rounded-t-2xl">
          Tickets Actifs
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">{tickets.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tickets.length === 0 && <p className="text-center text-gray-400 mt-10 text-sm">Aucun ticket en attente</p>}
          {tickets.map(t => (
            <button 
              key={t.id} 
              onClick={() => { setActiveTicket(t); setChatLogs([]); }}
              className={`w-full text-left p-4 border-b transition-all hover:bg-blue-50/50 ${activeTicket?.id === t.id ? 'bg-blue-50 border-r-4 border-r-blue-600' : ''}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase">ID: {t.id.slice(0,8)}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${t.priority === 'critique' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                  {t.priority}
                </span>
              </div>
              <div className="font-bold text-gray-800 text-sm capitalize">{t.category}</div>
              <div className="text-[10px] text-gray-400 mt-1">{new Date(t.created_at).toLocaleString('fr-FR')}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main - Discussion */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        {activeTicket ? (
          <>
            <div className="p-4 border-b bg-white flex justify-between items-center">
              <div>
                <h2 className="font-bold text-gray-800">Chat Support</h2>
                <p className="text-xs text-gray-400 truncate max-w-xs">Client: {activeTicket.user_id}</p>
              </div>
              <button 
                onClick={() => closeTicket(activeTicket.id)}
                className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all px-4 py-2 rounded-xl text-xs font-bold border border-red-100 shadow-sm"
              >
                Fermer le ticket
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-4">
              {/* Image jointe */}
              {activeTicket.attachment_url && (
                <div className="bg-white p-3 rounded-2xl border shadow-sm max-w-sm mb-6">
                  <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-tighter">Preuve de paiement</p>
                  <a 
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tickets/${activeTicket.attachment_url}`} 
                    target="_blank" 
                    rel="noreferrer"
                  >
                    <img 
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tickets/${activeTicket.attachment_url}`} 
                      className="rounded-lg w-full h-auto object-cover border hover:opacity-90 transition-opacity"
                      alt="Capture d'écran"
                    />
                  </a>
                  <p className="text-[9px] text-center text-gray-400 mt-2">Cliquez pour agrandir</p>
                </div>
              )}
              
              {chatLogs.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm italic">
                  En attente du premier message...
                </div>
              )}

              {chatLogs.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm ${m.sender === 'admin' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                    {m.text}
                    <div className={`text-[9px] mt-1 opacity-60 ${m.sender === 'admin' ? 'text-right' : 'text-left'}`}>
                      {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t flex gap-2 bg-white">
              <input 
                value={adminMsg} 
                onChange={(e) => setAdminMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendResponse()}
                placeholder="Écrivez votre réponse au client..."
                className="flex-1 p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button 
                onClick={sendResponse} 
                disabled={!adminMsg.trim()}
                className="bg-blue-600 disabled:bg-gray-300 text-white px-8 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
              >
                Répondre
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-4 bg-gray-50/30">
             <div className="p-6 bg-white rounded-full shadow-inner">
                <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
             </div>
            <p className="text-gray-500 font-medium">Sélectionnez une demande en attente</p>
          </div>
        )}
      </div>
    </div>
  );
}

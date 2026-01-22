"use client";
// Structure simplifiée pour l'admin
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminTicketPage() {
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    const { data } = await supabase.from('support_tickets').select('*').eq('status', 'ouvert');
    setTickets(data || []);
  };

  const respondToTicket = async (ticketId, msg) => {
    const channel = supabase.channel(`ticket:${ticketId}`);
    await channel.send({
      type: 'broadcast',
      event: 'new_msg',
      payload: { text: msg, sender: 'admin', time: new Date() }
    });
    // Log de l'action
    await supabase.from('support_logs').insert([{ ticket_id: ticketId, action: 'Réponse admin', actor_type: 'admin' }]);
  };

  return (
    <div className="flex">
      <div className="w-1/3 border-r p-4">
        <h3>Tickets Ouverts</h3>
        {tickets.map(t => (
          <div key={t.id} onClick={() => setActiveTicket(t)} className="cursor-pointer p-2 border-b hover:bg-gray-100">
             Ticket: {t.category} - {t.priority}
          </div>
        ))}
      </div>
      <div className="w-2/3 p-4">
        {activeTicket ? (
          <div>
            <h3>Support Ticket {activeTicket.id}</h3>
            {activeTicket.attachment_url && (
               <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tickets/${activeTicket.attachment_url}`} 
                    alt="Preuve" className="w-40 h-40 object-cover border" />
            )}
            {/* Interface de réponse similaire au client */}
            <button onClick={() => respondToTicket(activeTicket.id, "Bonjour, je traite votre demande.")} className="bg-blue-500 text-white p-2">
              Envoyer Réponse Rapide
            </button>
          </div>
        ) : <p>Sélectionnez un ticket</p>}
      </div>
    </div>
  );
}

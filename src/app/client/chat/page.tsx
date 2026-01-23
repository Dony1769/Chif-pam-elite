"use client";

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SupportTicket, TicketMessage } from '@/types/support';

export default function ClientTicketPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [message, setMessage] = useState<string>("");
  const [chatLogs, setChatLogs] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll auto
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLogs]);

  // Realtime Broadcast
  useEffect(() => {
    if (!ticket) return;

    const channel = supabase.channel(`ticket_${ticket.id}`, {
      config: { broadcast: { self: true } }
    });

    channel
      .on('broadcast', { event: 'new_msg' }, ({ payload }: { payload: TicketMessage }) => {
        setChatLogs((prev) => [...prev, payload]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket, supabase]);

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setLoading(true);
  
  // 1. Récupérer la session de manière simple
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  
  if (!user) {
    alert("Erreur : Votre session a expiré. Veuillez vous reconnecter.");
    setLoading(false);
    return;
  }

  try {
    const formData = new FormData(e.currentTarget);
    const file = formData.get('attachment') as File;
    let fileUrl = "";

    // 2. Upload simplifié : On utilise directement l'ID utilisateur pour le dossier
    if (file && file.size > 0) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('tickets')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;
      fileUrl = uploadData.path;
    }

    // 3. Insertion directe
    const { data: newTicket, error: insertErr } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        category: formData.get('category'),
        attachment_url: fileUrl,
        status: 'ouvert',
        priority: 'normal'
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 4. On active le chat
    setTicket(newTicket);

  } catch (err: any) {
    alert("Erreur : " + (err.message || "Problème technique"));
  } finally {
    setLoading(false);
  }
};


  const sendLiveMessage = async () => {
    if (!message.trim() || !ticket) return;

    const channel = supabase.channel(`ticket_${ticket.id}`);
    await channel.send({
      type: 'broadcast',
      event: 'new_msg',
      payload: { 
        text: message.slice(0, 500), 
        sender: 'user', 
        time: new Date().toISOString() 
      } as TicketMessage
    });
    setMessage("");
  };

  if (!ticket) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white shadow-xl rounded-2xl mt-10 border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Assistance Client</h1>
        <form onSubmit={handleCreateTicket} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Motif de la demande</label>
            <select name="category" className="w-full p-3 border rounded-xl bg-gray-50 outline-none" required>
              <option value="paiement">Problème de Paiement</option>
              <option value="technique">Problème Technique</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Preuve (Image)</label>
            <input type="file" name="attachment" accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700" />
          </div>
          <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? "Création..." : "Démarrer le chat"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col h-[85vh]">
      <div className="bg-white p-4 border shadow-sm rounded-t-2xl flex justify-between items-center">
        <h2 className="font-bold text-gray-800">Support en direct</h2>
        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">Ticket: {ticket.id.slice(0, 8)}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 border-x">
        {chatLogs.map((m, i) => (
          <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border text-gray-800 rounded-tl-none'}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-white border rounded-b-2xl shadow-sm flex gap-2">
        <input 
          value={message} 
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendLiveMessage()}
          placeholder="Écrivez ici..."
          className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={sendLiveMessage} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">
          Envoyer
        </button>
      </div>
    </div>
  );
}


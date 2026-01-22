"use client";

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SupportTicket, TicketMessage } from '@/types/support';

export default function ClientTicketPage() {
  // Initialisation du client SSR pour le navigateur
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [message, setMessage] = useState<string>("");
  const [chatLogs, setChatLogs] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLogs]);

  // WebSocket (Broadcast éphémère
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
// Remplacez votre fonction handleCreateTicket par celle-ci :
const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("Vous devez être connecté pour créer un ticket");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    let fileUrl = "";
    const file = formData.get('attachment') as File;

    // Gestion de l'upload
    if (file && file.size > 0) {
      const fileName = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tickets')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      if (uploadData) fileUrl = uploadData.path;
    }

    // Insertion du ticket
    const { data, error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      category: formData.get('category') as string,
      attachment_url: fileUrl,
      status: 'ouvert'
    }).select().single();

    if (error) throw error;
    if (data) setTicket(data as SupportTicket);

  } catch (err) {
    console.error("Erreur détaillée:", err);
    alert("Erreur lors de la création du ticket. Vérifiez la console.");
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
            <select name="category" className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" required>
              <option value="paiement">Problème de Paiement / Dépôt</option>
              <option value="technique">Problème Technique</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Preuve de paiement (Image)</label>
            <input type="file" name="attachment" accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>
          <div className="bg-amber-50 p-3 rounded-lg flex gap-3">
            <input type="checkbox" name="confirm" required className="mt-1 h-4 w-4 text-blue-600" />
            <span className="text-xs text-amber-800">
              Sécurité : Cette conversation est éphémère. Aucune donnée n'est stockée après la fermeture.
            </span>
          </div>
          <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
            {loading ? "Initialisation..." : "Démarrer le chat direct"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col h-[85vh]">
      <div className="bg-white p-4 border shadow-sm rounded-t-2xl flex justify-between items-center">
        <div>
          <h2 className="font-bold text-gray-800">Support Direct</h2>
          <p className="text-xs text-green-500 flex items-center gap-1">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span> Session Active
          </p>
        </div>
        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">ID: {ticket.id.slice(0, 8)}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 border-x">
        {chatLogs.map((m, i) => (
          <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.sender === 'user' ? 'bg-blue-600 text-white shadow-md rounded-tr-none' : 'bg-white border text-gray-800 shadow-sm rounded-tl-none'}`}>
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
          placeholder="Votre message..."
          className="flex-1 p-3 border-gray-200 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
        <button onClick={sendLiveMessage} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors">
          Envoyer
        </button>
      </div>
    </div>
  );
}

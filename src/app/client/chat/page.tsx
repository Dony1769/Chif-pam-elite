"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Ton client supabase

export default function ClientTicketPage() {
  const [ticket, setTicket] = useState(null);
  const [message, setMessage] = useState("");
  const [chatLogs, setChatLogs] = useState([]); // Mémoire de session uniquement

  // 1. Créer le ticket
  const createTicket = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Upload image si présente
    let fileUrl = null;
    const file = formData.get('attachment');
    if (file && file.size > 0) {
      const { data } = await supabase.storage.from('tickets').upload(`${Date.now()}`, file);
      fileUrl = data?.path;
    }

    const { data, error } = await supabase.from('support_tickets').insert([{
      category: formData.get('category'),
      user_id: (await supabase.auth.getUser()).data.user.id,
      attachment_url: fileUrl
    }]).select().single();

    if (data) setTicket(data);
  };

  // 2. Gestion WebSocket (Broadcast)
  useEffect(() => {
    if (!ticket) return;

    const channel = supabase.channel(`ticket:${ticket.id}`, {
      config: { broadcast: { self: true } }
    });

    channel
      .on('broadcast', { event: 'new_msg' }, ({ payload }) => {
        setChatLogs(prev => [...prev, payload]);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [ticket]);

  const sendLiveMessage = async () => {
    if (message.length > 500) return alert("Trop long !");
    const channel = supabase.channel(`ticket:${ticket.id}`);
    await channel.send({
      type: 'broadcast',
      event: 'new_msg',
      payload: { text: message, sender: 'user', time: new Date() }
    });
    setMessage("");
  };

  if (!ticket) {
    return (
      <form onSubmit={createTicket} className="p-4 space-y-4">
        <select name="category" className="border p-2 w-full" required>
          <option value="paiement">Problème de Paiement</option>
          <option value="technique">Technique</option>
        </select>
        <input type="file" name="attachment" accept="image/*" className="block w-full" />
        <textarea name="message" maxLength={500} placeholder="Votre message (max 500 chars)" className="border p-2 w-full" required />
        <label><input type="checkbox" required /> Je comprends que cette discussion est temporaire.</label>
        <button type="submit" className="bg-blue-600 text-white p-2 rounded">Ouvrir le Ticket</button>
      </form>
    );
  }

  return (
    <div className="p-4">
      <h2>Ticket #{ticket.id.slice(0,8)} - Mode Direct</h2>
      <div className="h-64 overflow-y-auto border p-2 mb-4 bg-gray-50">
        {chatLogs.map((m, i) => (
          <div key={i} className={m.sender === 'user' ? 'text-right' : 'text-left'}>
            <p className="inline-block p-2 rounded m-1 bg-white border">{m.text}</p>
          </div>
        ))}
      </div>
      <input value={message} onChange={(e) => setMessage(e.target.value)} className="border p-2 w-full" />
      <button onClick={sendLiveMessage} className="bg-green-600 text-white p-2 mt-2">Envoyer</button>
    </div>
  );
}

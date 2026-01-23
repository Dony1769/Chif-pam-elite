"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, ArrowLeft, Send, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function SimpleChat() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Initialisation et récupération de l'utilisateur
  useEffect(() => {
    const initChat = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error("Utilisateur non connecté :", authError);
        return;
      }

      setMyId(user.id);
      console.log("Connecté en tant que :", user.id);

      // Charger les messages existants
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id) // On filtre par user_id pour la sécurité
        .order('created_at', { ascending: true });

      if (error) console.error("Erreur chargement messages:", error);
      if (data) setMessages(data);
      
      // Ecoute en temps réel (uniquement pour cet utilisateur)
      const channel = supabase.channel(`realtime_chat_${user.id}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `user_id=eq.${user.id}` 
        }, (payload) => {
            setMessages(prev => [...prev, payload.new]);
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    initChat();
  }, [supabase]);

  // Scroll automatique
  useEffect(() => { 
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' }); 
    }
  }, [messages]);

  // 2. Fonction d'envoi principale
  const handleSend = async (content: string, imageUrl: string | null = null) => {
    if (!myId) {
        alert("Erreur : Vous n'êtes pas identifié. Reconnectez-vous.");
        return;
    }
    if (!content.trim() && !imageUrl) return;

    setLoading(true);
    console.log("Tentative d'envoi...");

    try {
      // Étape A : Insérer dans 'messages'
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          user_id: myId,
          sender_type: 'client',
          content: content.trim(),
          image_url: imageUrl,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Étape B : Mettre à jour 'latest_message_per_conversation' pour l'admin
      const { error: upsertError } = await supabase
        .from('latest_message_per_conversation')
        .upsert({
          user_id: myId,
          last_message: content.trim() || "📷 Image",
          last_sender_type: 'client',
          last_created_at: new Date().toISOString()
        });

      if (upsertError) console.warn("Erreur mise à jour liste admin (non bloquant):", upsertError);

      setText(""); // Vider le champ
      console.log("Message envoyé avec succès !");
    } catch (error: any) {
      console.error("ERREUR D'ENVOI :", error.message);
      alert(`Erreur : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Gestion des images
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myId) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `chat/${myId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      await handleSend("", publicUrl);
    } catch (error: any) {
      alert("Erreur upload image : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between sticky top-0 z-50">
        <Link href="/client/home" className="p-2 hover:bg-white/5 rounded-full text-slate-400">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col items-center">
            <h1 className="text-xl font-black italic tracking-tighter">CHIF-<span className="text-emerald-500">PAM</span></h1>
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Assistance</span>
        </div>
        <div className="w-10"></div>
      </header>

      {/* Zone de chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-900 to-[#020617]">
        {messages.length === 0 && !loading && (
            <div className="text-center py-20 opacity-20">
                <p className="text-sm font-bold uppercase tracking-widest">Aucun message. Commencez la discussion.</p>
            </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-2xl ${
                m.sender_type === 'client' 
                ? 'bg-emerald-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-100 border border-white/10 rounded-tl-none'
            }`}>
              {m.image_url && (
                <img src={m.image_url} alt="Preuve" className="max-w-full rounded-xl mb-2 border border-black/20" />
              )}
              {m.content && <p className="text-sm font-medium leading-relaxed">{m.content}</p>}
              <span className="text-[8px] opacity-40 block text-right mt-1">
                {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
        <div ref={scrollRef} className="h-2" />
      </div>

      {/* Barre d'envoi */}
      <footer className="p-4 bg-slate-900/90 border-t border-white/5 backdrop-blur-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-white/5 shadow-inner">
          <label className="p-2 text-slate-500 hover:text-emerald-500 cursor-pointer transition-colors">
            <ImageIcon size={22} />
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
          
          <input 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend(text)} 
            className="flex-1 bg-transparent p-2 outline-none text-sm font-medium placeholder:text-slate-700" 
            placeholder="Écrivez votre message..." 
            disabled={loading}
          />
          
          <button 
            onClick={() => handleSend(text)} 
            disabled={loading || (!text.trim() && !loading)}
            className="bg-emerald-500 text-slate-950 p-3 rounded-xl font-black hover:bg-emerald-400 transition-all active:scale-90 disabled:opacity-20 disabled:grayscale"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </footer>
    </main>
  );
}

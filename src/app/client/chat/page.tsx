"use client";

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { ChatMessage } from '@/types/chat';

export default function ClientChat() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Initialisation : Récupérer ou créer la conversation
  useEffect(() => {
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return window.location.href = '/login'; // Redirection douce

      // Chercher conversation existante
      let { data: conv } = await supabase.from('conversations')
        .select('id').eq('user_id', user.id).single();

      // Si pas de conversation, on en crée une
      if (!conv) {
        const { data: newConv } = await supabase.from('conversations')
          .insert({ user_id: user.id }).select().single();
        conv = newConv;
      }
      
      if (conv) {
        setConversationId(conv.id);
        loadMessages(conv.id);
        subscribeToMessages(conv.id);
      }
    };
    initChat();
  }, []);

  // 2. Chargement des messages (FILTRE 24H)
  const loadMessages = async (convId: string) => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .gt('created_at', yesterday) // SEULEMENT LES DERNIERES 24H
      .order('created_at', { ascending: true });

    if (data) setMessages(data as ChatMessage[]);
  };

  // 3. Temps réel
  const subscribeToMessages = (convId: string) => {
    supabase.channel(`conv_${convId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${convId}` }, 
      (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
        // Scroll en bas
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();
  };

  // 4. Envoi de message (Générique)
  const sendMessage = async (type: 'text' | 'image' | 'audio', content: string) => {
    if (!conversationId) return;
    await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      sender_type: 'user',
      type,
      content
    });
    // Update timestamp conversation pour l'admin
    await supabase.from('conversations').update({ updated_at: new Date() }).eq('id', conversationId);
  };

  // --- GESTION AUDIO ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        uploadFile(audioBlob, 'audio');
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      alert("Microphone non autorisé");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // --- GESTION FICHIERS (Image/Audio) ---
  const uploadFile = async (file: Blob | File, type: 'image' | 'audio') => {
    setUploading(true);
    const ext = type === 'audio' ? 'webm' : file.name.split('.').pop();
    const fileName = `${Date.now()}.${ext}`;
    
    const { data, error } = await supabase.storage.from('chat-media').upload(fileName, file);
    
    if (data) {
      const publicUrl = supabase.storage.from('chat-media').getPublicUrl(fileName).data.publicUrl;
      await sendMessage(type, publicUrl);
    }
    setUploading(false);
  };

  return (
    <div className="flex flex-col h-[90vh] bg-[#e5ddd5]"> {/* Couleur WhatsApp */}
      {/* Header */}
      <div className="bg-[#075e54] p-4 text-white font-bold flex items-center shadow-md">
        <span>Support Client</span>
      </div>

      {/* Liste des messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-2 rounded-lg shadow-sm text-sm ${msg.sender_type === 'user' ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
              
              {/* Contenu selon le type */}
              {msg.type === 'text' && <p>{msg.content}</p>}
              {msg.type === 'image' && (
                <img src={msg.content} alt="envoi" className="rounded-lg max-w-full cursor-pointer" onClick={() => window.open(msg.content)} />
              )}
              {msg.type === 'audio' && (
                <audio controls src={msg.content} className="h-8 w-48" />
              )}
              
              <span className="text-[10px] text-gray-500 float-right mt-1 ml-2">
                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Barre d'input */}
      <div className="bg-white p-2 flex items-center gap-2 border-t">
        {/* Bouton Image */}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'image')} />
        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
          📸
        </button>

        {/* Input Texte */}
        <input 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (sendMessage('text', inputText), setInputText(''))}
          placeholder="Message..."
          className="flex-1 p-2 border rounded-full outline-none focus:ring-1 focus:ring-[#075e54]"
        />

        {/* Bouton Envoyer ou Micro */}
        {inputText.trim() ? (
          <button onClick={() => { sendMessage('text', inputText); setInputText(''); }} className="p-2 bg-[#075e54] text-white rounded-full">
            ➤
          </button>
        ) : (
          <button 
            onMouseDown={startRecording} 
            onMouseUp={stopRecording} 
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`p-2 rounded-full text-white transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#075e54]'}`}
          >
            🎤
          </button>
        )}
      </div>
      {uploading && <div className="absolute top-0 w-full h-1 bg-blue-500 animate-pulse" />}
    </div>
  );
}

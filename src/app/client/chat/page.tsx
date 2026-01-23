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

  useEffect(() => {
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; 

      let { data: conv } = await supabase.from('conversations')
        .select('id').eq('user_id', user.id).maybeSingle();

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
  }, [supabase]);

  const loadMessages = async (convId: string) => {
    // FILTRE 24H : On ne récupère que les messages récents
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .gt('created_at', yesterday)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as ChatMessage[]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "instant" }), 100);
  };

  const subscribeToMessages = (convId: string) => {
    supabase.channel(`conv_${convId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages', 
        filter: `conversation_id=eq.${convId}` 
      }, 
      (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();
  };

  const sendMessage = async (type: 'text' | 'image' | 'audio', content: string) => {
    if (!conversationId || !content.trim()) return;
    
    const { error } = await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      sender_type: 'user',
      type,
      content
    });

    if (!error) {
      await supabase.from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }
  };

  // --- AUDIO ---
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
      alert("Accès micro refusé");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Arrêter le flux pour libérer le micro
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // --- UPLOAD (CORRIGÉ) ---
  const uploadFile = async (file: Blob | File, type: 'image' | 'audio') => {
    setUploading(true);
    try {
      let ext = 'webm'; // Par défaut pour l'audio
      
      // On vérifie si c'est un fichier avec un nom (Image)
      if (type === 'image' && 'name' in file) {
        ext = file.name.split('.').pop() || 'jpg';
      }

      const fileName = `${crypto.randomUUID()}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file);
      
      if (error) throw error;

      if (data) {
        const { data: { publicUrl } } = supabase.storage
          .from('chat-media')
          .getPublicUrl(fileName);
        
        await sendMessage(type, publicUrl);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Échec de l'envoi du fichier");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-[92vh] bg-[#e5ddd5] max-w-2xl mx-auto shadow-2xl border-x">
      {/* Header WhatsApp Style */}
      <div className="bg-[#075e54] p-4 text-white flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-xl">👤</div>
          <div>
            <h1 className="font-bold text-sm">Support Client</h1>
            <p className="text-[10px] text-green-300">En ligne</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-2 rounded-xl shadow-sm relative ${
              msg.sender_type === 'user' ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'
            }`}>
              {msg.type === 'text' && <p className="text-sm pr-10">{msg.content}</p>}
              
              {msg.type === 'image' && (
                <img 
                  src={msg.content} 
                  alt="envoi" 
                  className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer" 
                  onClick={() => window.open(msg.content, '_blank')} 
                />
              )}
              
              {msg.type === 'audio' && (
                <audio controls src={msg.content} className="h-10 w-48 scale-90 origin-left" />
              )}
              
              <span className="text-[9px] text-gray-500 absolute bottom-1 right-2">
                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-[#f0f0f0] p-3 flex items-center gap-2">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
        >
          📎
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'image')} 
          />
        </button>

        <input 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isRecording && (sendMessage('text', inputText), setInputText(''))}
          placeholder="Message"
          className="flex-1 p-2.5 bg-white rounded-full text-sm outline-none shadow-inner"
        />

        {inputText.trim() ? (
          <button 
            onClick={() => { sendMessage('text', inputText); setInputText(''); }}
            className="p-3 bg-[#075e54] text-white rounded-full shadow-md hover:bg-[#064d44] transition-all"
          >
            ➤
          </button>
        ) : (
          <button 
            onMouseDown={startRecording} 
            onMouseUp={stopRecording} 
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            className={`p-3 rounded-full text-white shadow-md transition-all ${
              isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-[#075e54] hover:bg-[#064d44]'
            }`}
          >
            🎤
          </button>
        )}
      </div>

      {uploading && (
        <div className="h-1 w-full bg-gray-200 overflow-hidden">
          <div className="h-full bg-blue-500 animate-progress origin-left"></div>
        </div>
      )}

      <style jsx>{`
        .animate-progress {
          animation: progress 2s infinite linear;
          width: 100%;
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

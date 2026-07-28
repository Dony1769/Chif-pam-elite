"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageSquareHeart, Paperclip, Send, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChatService } from '@/services/chat';
import { ChatBotService } from '@/services/chatBot';
import { type ChatMessage, parseMessageContent } from '@/types/chat';

export default function ClientChatPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerText, setComposerText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const initChat = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user?.id) {
        if (isMounted) setLoading(false);
        return;
      }

      const currentUserId = user.id;
      if (isMounted) setUserId(currentUserId);

      try {
        const history = await ChatService.fetchMessagesForClient(supabase, currentUserId);
        if (!isMounted) return;
        setMessages(history);
        await ChatService.markConversationReadByClient(supabase, currentUserId);
      } catch (error) {
        console.error('Erreur lors du chargement de l’historique client:', error);
      } finally {
        if (isMounted) setLoading(false);
      }

      channel = ChatService.subscribeToClientMessages(supabase, currentUserId, (msg) => {
        if (!isMounted) return;
        setMessages((prev) => [...prev, msg]);
      });
    };

    void initChat();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendText = async () => {
    if (!userId || !composerText.trim() || isSending) return;

    const content = composerText.trim();
    setComposerText('');
    setIsSending(true);

    try {
      const sent = await ChatService.sendTextMessage(supabase, userId, content, false);
      if (sent) {
        setMessages((prev) => [...prev, sent]);

        // Déclenchement automatique du Bot de réponse si éligible
        setTimeout(async () => {
          // Transmission de userId pour la gestion de session anti-répétition
          const autoReply = ChatBotService.generateAutoReply(content, userId);

          // VÉRIFICATION CRITIQUE : Seul un autoReply non null est envoyé
          if (autoReply !== null) {
            // Conversion de l'objet reply en chaîne JSON pour la persistance dans Supabase
            const replyContent = JSON.stringify(autoReply);
            const botMessage = await ChatService.sendTextMessage(supabase, userId, replyContent, true);
            
            if (botMessage) {
              setMessages((prev) => [...prev, botMessage]);
            }
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Erreur lors de l’envoi du texte:', error);
      setComposerText(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!userId || !file || isSending) return;

    setIsSending(true);

    try {
      const sent = await ChatService.uploadImageAndSend(supabase, userId, file, false);
      if (sent) {
        setMessages((prev) => [...prev, sent]);
      }
    } catch (error) {
      console.error('Erreur lors du téléversement de l’image:', error);
    } finally {
      setIsSending(false);
      event.target.value = '';
    }
  };

  const supportTitle = useMemo(() => 'Support Chif-Pam', []);

  return (
    <div className="flex h-[100dvh] flex-col bg-[#020617] text-slate-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-500/15 p-2 text-emerald-400">
            <MessageSquareHeart size={18} />
          </div>
          <div>
            <h1 className="text-base font-semibold">{supportTitle}</h1>
            <p className="text-sm text-slate-400">Nous sommes là pour vous aider</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_55%)] px-3 py-3">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-3 text-slate-400">
            <Loader2 className="animate-spin text-emerald-500" size={24} />
            Chargement de votre conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-4 rounded-full border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400">
              <MessageSquareHeart size={32} />
            </div>
            <h2 className="text-lg font-semibold text-slate-200">Comment pouvons-nous vous aider ?</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">
              Décrivez votre besoin ci-dessous. Notre équipe ou notre bot vous répondra rapidement.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => {
              const parsed = parseMessageContent(msg.content);
              const isClientMessage = msg.is_admin_message === false;

              return (
                <div key={msg.id} className={`flex ${isClientMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow ${isClientMessage ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-100'}`}>
                    {parsed.type === 'image' ? (
                      <img src={parsed.url} alt="Pièce jointe" className="max-h-72 rounded-xl object-cover" />
                    ) : parsed.type === 'action' ? (
                      <div className="space-y-2.5">
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{parsed.text}</p>
                        <button
                          type="button"
                          onClick={() => router.push(parsed.actionUrl)}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-slate-950 shadow transition hover:bg-emerald-400 active:scale-95"
                        >
                          <span>{parsed.actionLabel}</span>
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-sm">{parsed.text}</p>
                    )}
                    <div className={`mt-1 text-[10px] ${isClientMessage ? 'text-slate-800/70' : 'text-slate-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 bg-slate-950/90 px-3 py-3 backdrop-blur">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2">
          <input
            value={composerText}
            onChange={(event) => setComposerText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSendText();
              }
            }}
            placeholder="Écrire un message..."
            className="flex-1 bg-transparent text-sm text-white outline-none"
          />
          <label className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
            <Paperclip size={18} />
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
          <button
            type="button"
            onClick={() => void handleSendText()}
            disabled={isSending || !composerText.trim()}
            className="rounded-lg bg-emerald-500 p-2 text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </footer>
    </div>
  );
}

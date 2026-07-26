'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Loader2, MessageSquare, Paperclip, Send, Image as ImageIcon, Zap, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChatService } from '@/services/chat'
import { PRESET_RESPONSES, PresetResponse } from '@/services/chatBot'
import { type ChatMessage, type AdminConversation, parseMessageContent } from '@/types/chat'

export default function AdminChatPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<AdminConversation[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [composerText, setComposerText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadConversations = async () => {
      try {
        const data = await ChatService.fetchAdminConversations(supabase)
        if (!isMounted) return
        setConversations(data)
        if (!selectedClientId && data.length > 0) {
          setSelectedClientId(data[0].client_id)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des conversations admin:', error)
      }
    }

    void loadConversations()

    return () => {
      isMounted = false
    }
  }, [selectedClientId])

  useEffect(() => {
    if (!selectedClientId) {
      setMessages([])
      return
    }

    let isMounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const loadMessages = async () => {
      setLoading(true)
      try {
        const data = await ChatService.fetchMessagesForClient(supabase, selectedClientId)
        if (!isMounted) return
        setMessages(data)
        await ChatService.markConversationReadByAdmin(supabase, selectedClientId)
        const refreshedConversations = await ChatService.fetchAdminConversations(supabase)
        if (!isMounted) return
        setConversations(refreshedConversations)
      } catch (error) {
        console.error('Erreur lors du chargement des messages client:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadMessages()

    channel = ChatService.subscribeToClientMessages(supabase, selectedClientId, (msg) => {
      if (!isMounted) return
      setMessages((prev) => [...prev, msg])
      void ChatService.markConversationReadByAdmin(supabase, selectedClientId).catch((error) => {
        console.error('Erreur lors du marquage comme lu:', error)
      })
      void ChatService.fetchAdminConversations(supabase)
        .then((next) => {
          if (isMounted) setConversations(next)
        })
        .catch((error) => {
          console.error('Erreur lors du rafraîchissement des conversations:', error)
        })
    })

    return () => {
      isMounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedClientId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSendText = async (customContent?: string) => {
    if (!selectedClientId || isSending) return
    const contentToSend = customContent || composerText.trim()
    if (!contentToSend) return

    setIsSending(true)
    if (!customContent) setComposerText('')

    try {
      const sentMessage = await ChatService.sendTextMessage(supabase, selectedClientId, contentToSend, true)
      if (sentMessage) {
        setMessages((prev) => [...prev, sentMessage])
        const refreshedConversations = await ChatService.fetchAdminConversations(supabase)
        setConversations(refreshedConversations)
      }
    } catch (error) {
      console.error('Erreur lors de l’envoi du message:', error)
      if (!customContent) setComposerText(contentToSend)
    } finally {
      setIsSending(false)
      setShowPresets(false)
    }
  }

  const handleSendPreset = (preset: PresetResponse) => {
    const actionPayload = JSON.stringify({
      type: 'action',
      text: preset.messageText,
      actionLabel: preset.actionLabel,
      actionUrl: preset.actionUrl,
    })
    void handleSendText(actionPayload)
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!selectedClientId || !file || isSending) return

    setIsSending(true)

    try {
      const sentMessage = await ChatService.uploadImageAndSend(supabase, selectedClientId, file, true)
      if (sentMessage) {
        setMessages((prev) => [...prev, sentMessage])
        const refreshedConversations = await ChatService.fetchAdminConversations(supabase)
        setConversations(refreshedConversations)
      }
    } catch (error) {
      console.error('Erreur lors du téléversement du fichier:', error)
    } finally {
      setIsSending(false)
      event.target.value = ''
    }
  }

  const selectedConversation = conversations.find((item) => item.client_id === selectedClientId) ?? null

  return (
    <div className="flex h-full min-h-screen flex-col bg-[#020617] text-slate-100 md:flex-row">
      <aside className="w-full border-b border-white/10 bg-slate-950/80 md:w-[320px] md:border-b-0 md:border-r">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            <MessageSquare size={16} />
            Conversations
          </div>
        </div>

        <div className="max-h-[calc(100vh-80px)] overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">Aucune conversation disponible.</div>
          ) : (
            conversations.map((conversation) => {
              const isActive = conversation.client_id === selectedClientId
              return (
                <button
                  key={conversation.client_id}
                  type="button"
                  onClick={() => setSelectedClientId(conversation.client_id)}
                  className={`w-full border-b border-white/5 p-3 text-left transition ${
                    isActive ? 'bg-emerald-500/10' : 'bg-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-slate-100">{conversation.client_id}</span>
                    {conversation.admin_unread_count > 0 && (
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {conversation.admin_unread_count}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-400">
                    {conversation.last_message_content || 'Aucun message'}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {conversation.last_message_created_at
                      ? new Date(conversation.last_message_created_at).toLocaleString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: 'short',
                        })
                      : ''}
                  </p>
                </button>
              )
            })
          )}
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-4 py-3">
          <div>
            <h1 className="text-base font-semibold text-white">
              {selectedConversation ? selectedConversation.client_id : 'Sélectionnez une conversation'}
            </h1>
            <p className="text-sm text-slate-400">
              {selectedConversation ? 'Conversation active' : 'Choisissez un client dans la liste'}
            </p>
          </div>
        </header>

        {selectedClientId ? (
          <>
            <section className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_55%)] p-4">
              {loading ? (
                <div className="flex h-full items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="animate-spin text-emerald-500" size={24} />
                  Chargement des messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
                  Aucun message pour cette conversation.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((msg) => {
                    const parsed = parseMessageContent(msg.content)
                    const isAdmin = msg.is_admin_message

                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow ${isAdmin ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-100'}`}>
                          {parsed.type === 'image' ? (
                            <img src={parsed.url} alt="Pièce jointe" className="max-h-72 rounded-xl object-cover" />
                          ) : parsed.type === 'action' ? (
                            <div className="space-y-2">
                              <p className="whitespace-pre-wrap break-words text-sm">{parsed.text}</p>
                              <button
                                type="button"
                                onClick={() => router.push(parsed.actionUrl)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/80 px-3 py-1.5 text-xs font-bold text-emerald-400 transition hover:bg-black"
                              >
                                <span>{parsed.actionLabel}</span>
                                <ExternalLink size={12} />
                              </button>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap break-words text-sm">{parsed.text}</p>
                          )}
                          <div className={`mt-1 text-[10px] ${isAdmin ? 'text-slate-800/70' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </section>

            <footer className="relative border-t border-white/10 bg-slate-950/80 p-3">
              {/* Menu de réponses rapides (Preset Responses) */}
              {showPresets && (
                <div className="absolute bottom-full left-3 right-3 mb-2 rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-xl backdrop-blur-xl">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    ⚡ Réponses automatiques & Liens
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PRESET_RESPONSES.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSendPreset(preset)}
                        className="flex flex-col items-start rounded-xl border border-white/5 bg-slate-950/60 p-2 text-left transition hover:border-emerald-500/40 hover:bg-emerald-500/10"
                      >
                        <span className="text-xs font-bold text-white">{preset.title}</span>
                        <span className="text-[10px] text-slate-400">{preset.actionLabel} ({preset.actionUrl})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setShowPresets((prev) => !prev)}
                  className={`rounded-lg p-2 transition ${showPresets ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                  title="Réponses préconçues"
                >
                  <Zap size={18} />
                </button>

                <input
                  value={composerText}
                  onChange={(event) => setComposerText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void handleSendText()
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
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-slate-400">
            <div className="max-w-sm space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
                <ImageIcon size={28} />
              </div>
              <h2 className="text-lg font-semibold text-slate-200">Centre de messagerie</h2>
              <p className="text-sm leading-relaxed">
                Sélectionnez une conversation dans la barre latérale pour afficher le fil et répondre au client.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

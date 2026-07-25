"use client"

import React, { useState, useEffect } from 'react'
import ChatLayout from '@/components/chat/ChatLayout'
import ChatHeader from '@/components/chat/ChatHeader'
import TypingIndicator from '@/components/chat/TypingIndicator'
import VirtualizedMessageList from '@/components/chat/VirtualizedMessageList'
import MessageInput from '@/components/chat/MessageInput'
import { ChatService } from '@/services/chat'
import { supabase } from '@/lib/supabase'
import { useClientChat } from '@/hooks/useClientChat'
import { Loader2, MessageSquareHeart } from 'lucide-react'

/** Interface pour les données de diffusion Supabase Broadcast */
interface BroadcastPayload {
  isTyping?: boolean
  status?: 'online' | 'offline'
}

export default function ClientChat() {
  const { 
    messages, 
    text, 
    setText, 
    sendMessage, 
    loading, 
    isLoadingMore, 
    hasMore, 
    loadMore 
  } = useClientChat()

  const [isTyping, setIsTyping] = useState<boolean>(false)

  // Gestion propre de la souscription aux événements Broadcast
  useEffect(() => {
    let activeChannel: ReturnType<typeof supabase.channel> | null = null
    let isComponentMounted = true

    const initializeBroadcast = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isComponentMounted) return

      activeChannel = ChatService.subscribeToBroadcasts(user.id, {
        onTyping: (payload: BroadcastPayload) => {
          if (isComponentMounted) {
            setIsTyping(Boolean(payload?.isTyping))
          }
        },
        onPresence: () => {},
      })
    }

    initializeBroadcast()

    return () => {
      isComponentMounted = false
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
    }
  }, [])

  return (
    <ChatLayout>
      <div className="flex h-full bg-[#020617] text-white font-sans">
        <div className="flex-1 flex flex-col h-full">
          {/* En-tête du Chat */}
          <ChatHeader 
            title="Support Client" 
            subtitle="Chif-Pam • Assistance en direct" 
          />

          {/* Zone Principale d'affichage des messages */}
          <div className="flex-1 min-h-0 relative flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
                <span className="text-xs text-slate-400">Chargement de votre conversation...</span>
              </div>
            ) : messages.length === 0 ? (
              /* Vue quand il n'y a pas encore de messages */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 mb-4 border border-emerald-500/20">
                  <MessageSquareHeart size={36} />
                </div>
                <h3 className="font-bold text-lg text-slate-200">Comment pouvons-nous vous aider ?</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Posez votre question ci-dessous. Notre équipe support vous répondra dans les plus brefs délais.
                </p>
              </div>
            ) : (
              <VirtualizedMessageList 
                messages={messages} 
                loadMore={loadMore} 
                hasMore={hasMore} 
                isLoadingMore={isLoadingMore} 
              />
            )}
          </div>

          {/* Zone d'indicateur de frappe (au-dessus du champ de saisie) */}
          <div className="px-4 min-h-[24px] flex items-center">
            {isTyping && <TypingIndicator />}
          </div>

          {/* Champ d'envoi de message */}
          <div className="border-t border-white/5 bg-slate-950/50">
            <MessageInput 
              text={text} 
              setText={setText} 
              sendMessage={sendMessage} 
            />
          </div>
        </div>
      </div>
    </ChatLayout>
  )
}

"use client"

import React, { useState, useEffect } from 'react'
import ChatLayout from '@/components/chat/ChatLayout'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatHeader from '@/components/chat/ChatHeader'
import VirtualizedMessageList from '@/components/chat/VirtualizedMessageList'
import MessageInput from '@/components/chat/MessageInput'
import TypingIndicator from '@/components/chat/TypingIndicator'
import { supabase } from '@/lib/supabase'
import { ChatService } from '@/services/chat'
import { useAdminChat } from '@/hooks/useAdminChat'
import { Loader2, MessageSquare, ShieldCheck } from 'lucide-react'

/** Interfaces pour la présence et le Broadcast */
interface BroadcastPayload {
  isTyping?: boolean
  status?: 'online' | 'offline'
}

type UserPresenceStatus = 'online' | 'offline' | null

export default function AdminChat() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  
  const { 
    messages, 
    reply, 
    setReply, 
    users, 
    sendReply, 
    loading, 
    isLoadingMore, 
    hasMore, 
    loadMore 
  } = useAdminChat(selectedUserId)

  const selectedUser = users.find((user) => user.id === selectedUserId) || null
  const [isTyping, setIsTyping] = useState<boolean>(false)
  const [presence, setPresence] = useState<UserPresenceStatus>(null)

  // Écoute des événements du client sélectionné
  useEffect(() => {
    if (!selectedUserId) {
      setIsTyping(false)
      setPresence(null)
      return
    }

    const channel = ChatService.subscribeToBroadcasts(selectedUserId, {
      onTyping: (payload: BroadcastPayload) => setIsTyping(Boolean(payload?.isTyping)),
      onPresence: (payload: BroadcastPayload) => setPresence(payload?.status || null),
    })

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedUserId])

  return (
    <ChatLayout>
      <div className="h-full flex bg-[#020617] text-white font-sans">
        {/* Barre latérale des utilisateurs */}
        <ChatSidebar 
          users={users} 
          selectedUserId={selectedUserId} 
          onSelect={(id: string) => setSelectedUserId(id)} 
        />

        {/* Panneau Principal de Discussion */}
        <div className="flex-1 flex flex-col h-full">
          {/* Header dynamique en fonction du client sélectionné */}
          <ChatHeader 
            title={selectedUser ? (selectedUser.username || selectedUser.phone || 'Utilisateur') : 'Administration Support'} 
            subtitle={
              selectedUser ? (
                <span className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${presence === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  {presence === 'online' ? 'En ligne actuellement' : 'Hors ligne'}
                </span>
              ) : 'Sélectionnez une conversation active'
            } 
          />

          <div className="flex-1 flex flex-col min-h-0">
            {selectedUser ? (
              <>
                {/* Zone des messages */}
                <div className="flex-1 min-h-0 relative">
                  {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center h-full gap-3">
                      <Loader2 className="animate-spin text-emerald-500" size={32} />
                      <span className="text-xs text-slate-400">Chargement de l'historique...</span>
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

                {/* Zone de saisie en cours de l'utilisateur */}
                <div className="px-4 min-h-[24px] flex items-center">
                  {isTyping && <TypingIndicator />}
                </div>

                {/* Saisie de la réponse de l'admin */}
                <div className="border-t border-white/5 bg-slate-950/50">
                  <MessageInput 
                    text={reply} 
                    setText={setReply} 
                    sendMessage={sendReply} 
                    targetUserId={selectedUserId} 
                  />
                </div>
              </>
            ) : (
              /* Vue par défaut quand aucun client n'est sélectionné */
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-sm space-y-3">
                  <div className="p-4 bg-white/5 rounded-2xl w-fit mx-auto text-slate-400 border border-white/10">
                    <MessageSquare size={40} />
                  </div>
                  <h3 className="font-bold text-lg text-slate-200 uppercase tracking-wide flex items-center justify-center gap-2">
                    Centre de messagerie <ShieldCheck size={18} className="text-amber-400" />
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Cliquez sur une conversation dans le menu de gauche pour afficher l'historique et répondre en direct au client.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ChatLayout>
  )
}

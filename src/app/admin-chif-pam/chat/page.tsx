'use client'

import React, { useState } from 'react'
import ChatLayout from '@/components/chat/ChatLayout'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatHeader from '@/components/chat/ChatHeader'
import VirtualizedMessageList from '@/components/chat/VirtualizedMessageList'
import MessageInput from '@/components/chat/MessageInput'
import { useAdminChat } from '@/hooks/useAdminChat'
import { Loader2, MessageSquare, ShieldCheck } from 'lucide-react'

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

  const selectedUser = users.find((u) => u.id === selectedUserId) || null

  // Mappage sécurisé garantissant la parfaite conformité avec les props de ChatSidebar
  const sidebarUsers = users.map((user) => ({
    id: user.id,
    username: user.username,
    phone: user.phone,
    email: user.email,
    avatar_url: user.avatar_url,
    unread: user.unread ?? 0,
    last_at: user.last_at ?? new Date().toISOString(),
  }))

  return (
    <ChatLayout>
      <div className="h-full flex bg-[#020617] text-white font-sans">
        <ChatSidebar 
          users={sidebarUsers} 
          selectedUserId={selectedUserId} 
          onSelect={(id: string) => setSelectedUserId(id)} 
        />

        <div className="flex-1 flex flex-col h-full">
          <ChatHeader 
            title={selectedUser ? (selectedUser.username || selectedUser.phone || 'Utilisateur') : 'Administration Support'} 
            subtitle={selectedUser ? 'Conversation active' : 'Sélectionnez un client dans la liste'} 
          />

          <div className="flex-1 flex flex-col min-h-0">
            {selectedUser ? (
              <>
                <div className="flex-1 min-h-0 relative">
                  {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center h-full gap-3">
                      <Loader2 className="animate-spin text-emerald-500" size={32} />
                      <span className="text-xs text-slate-400">Chargement des messages...</span>
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
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-sm space-y-3">
                  <div className="p-4 bg-white/5 rounded-2xl w-fit mx-auto text-slate-400 border border-white/10">
                    <MessageSquare size={40} />
                  </div>
                  <h3 className="font-bold text-lg text-slate-200 uppercase tracking-wide flex items-center justify-center gap-2">
                    Centre de messagerie <ShieldCheck size={18} className="text-amber-400" />
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Cliquez sur un utilisateur dans le panneau de gauche pour voir la discussion et lui répondre.
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

"use client"
import React, { useState } from 'react'
import ChatLayout from '@/components/chat/ChatLayout'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatHeader from '@/components/chat/ChatHeader'
import { supabase } from '@/lib/supabase'
import VirtualizedMessageList from '@/components/chat/VirtualizedMessageList'
import MessageInput from '@/components/chat/MessageInput'
import TypingIndicator from '@/components/chat/TypingIndicator'
import { ChatService } from '@/services/chat'
import { useAdminChat } from '@/hooks/useAdminChat'

export default function AdminChat() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const { messages, reply, setReply, users, sendReply, loading, isLoadingMore, hasMore, loadMore } = useAdminChat(selectedUserId)

  const selectedUser = users.find((user) => user.id === selectedUserId) || null
  const [isTyping, setIsTyping] = React.useState(false)
  const [, setPresence] = React.useState<'online' | 'offline' | null>(null)

  React.useEffect(() => {
    if (!selectedUserId) return
    const channel = ChatService.subscribeToBroadcasts(selectedUserId, {
      onTyping: (p) => setIsTyping(Boolean(p?.isTyping)),
      onPresence: (p) => setPresence(p?.status),
    })
    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [selectedUserId])

  return (
    <ChatLayout>
      <div className="h-full flex">
        <ChatSidebar users={users} selectedUserId={selectedUserId} onSelect={(id) => setSelectedUserId(id)} />

        <div className="flex-1 flex flex-col">
          <ChatHeader title={selectedUser ? `Session: ${selectedUser.username || selectedUser.phone}` : 'Administration'} subtitle={selectedUser ? 'Conversation en cours' : 'Sélectionnez une conversation'} />

          <div className="flex-1 flex flex-col">
            {selectedUser ? (
              <>
                <div className="p-4">
                  {isTyping && <TypingIndicator />}
                </div>
                <div className="flex-1 min-h-0">
                  {loading ? (
                    <div className="flex justify-center mt-10"><span className="animate-spin text-emerald-500">Chargement...</span></div>
                  ) : (
                    <VirtualizedMessageList messages={messages} loadMore={loadMore} hasMore={hasMore} isLoadingMore={isLoadingMore} />
                  )}
                </div>

                <div className="border-t border-white/5">
                  <MessageInput text={reply} setText={setReply} sendMessage={sendReply} targetUserId={selectedUserId} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center opacity-20">
                <div className="text-center">
                  <h3 className="font-black italic uppercase text-2xl">Centre de messagerie</h3>
                  <p className="text-slate-400 mt-2">Choisissez une conversation à gauche pour commencer</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ChatLayout>
  )
}

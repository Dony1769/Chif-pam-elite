"use client"
import React from 'react'
import ChatLayout from '@/components/chat/ChatLayout'
import ChatHeader from '@/components/chat/ChatHeader'
import TypingIndicator from '@/components/chat/TypingIndicator'
import { ChatService } from '@/services/chat'
import { supabase } from '@/lib/supabase'
import VirtualizedMessageList from '@/components/chat/VirtualizedMessageList'
import MessageInput from '@/components/chat/MessageInput'
import { Loader2 } from 'lucide-react'
import { useClientChat } from '@/hooks/useClientChat'

export default function ClientChat() {
  const { messages, text, setText, sendMessage, loading, isLoadingMore, hasMore, loadMore } = useClientChat()
  const [isTyping, setIsTyping] = React.useState(false)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const channel = ChatService.subscribeToBroadcasts(user.id, {
        onTyping: (payload) => { if (mounted) setIsTyping(Boolean(payload?.isTyping)) },
        onPresence: () => {},
      })
      return () => { mounted = false; if (channel) supabase.removeChannel(channel) }
    })()
  }, [])

  return (
    <ChatLayout>
      <div className="flex h-full">
        <div className="flex-1 flex flex-col">
          <ChatHeader title="Support" subtitle="Chif-Pam • Assistance" />

          <div className="p-4">{isTyping && <TypingIndicator />}</div>
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-emerald-500" /></div>
            ) : (
              <VirtualizedMessageList messages={messages} loadMore={loadMore} hasMore={hasMore} isLoadingMore={isLoadingMore} />
            )}
          </div>

          <MessageInput text={text} setText={setText} sendMessage={sendMessage} />
        </div>
      </div>
    </ChatLayout>
  )
}

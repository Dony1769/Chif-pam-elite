"use client"

import React from 'react'
import ChatLayout from '@/components/chat/ChatLayout'
import ChatHeader from '@/components/chat/ChatHeader'
import VirtualizedMessageList from '@/components/chat/VirtualizedMessageList'
import MessageInput from '@/components/chat/MessageInput'
import { useClientChat } from '@/hooks/useClientChat'
import { Loader2, MessageSquareHeart } from 'lucide-react'

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

  return (
    <ChatLayout>
      <div className="flex h-full bg-[#020617] text-white font-sans">
        <div className="flex-1 flex flex-col h-full">
          <ChatHeader 
            title="Support Client" 
            subtitle="Chif-Pam • Assistance en direct" 
          />

          <div className="flex-1 min-h-0 relative flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
                <span className="text-xs text-slate-400">Chargement de votre conversation...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 mb-4 border border-emerald-500/20">
                  <MessageSquareHeart size={36} />
                </div>
                <h3 className="font-bold text-lg text-slate-200">Comment pouvons-nous vous aider ?</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Posez votre question ci-dessous. Notre équipe support vous répondra rapidement.
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

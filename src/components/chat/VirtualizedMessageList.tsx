'use client'

import React, { useCallback, useMemo } from 'react'
import { Virtuoso } from 'react-virtuoso'
import type { ChatMessage } from '@/types/chat'
import MessageBubble from './MessageBubble'

type Props = {
  messages: ChatMessage[]
  loadMore: () => void
  hasMore: boolean
  isLoadingMore?: boolean
}

function MessageRow({ message }: { message: ChatMessage }) {
  return (
    <div className={`px-4 py-2 flex ${message.is_admin_message ? 'justify-start' : 'justify-end'}`}>
      <MessageBubble message={message} />
    </div>
  )
}

const MemoMessageRow = React.memo(MessageRow)

export default function VirtualizedMessageList({ messages, loadMore, hasMore, isLoadingMore }: Props) {
  const itemContent = useCallback((index: number, message: ChatMessage) => {
    return <MemoMessageRow message={message} />
  }, [])

  const initialTopMostItemIndex = useMemo(() => Math.max(0, messages.length - 1), [messages.length])

  return (
    <div className="h-full w-full">
      <Virtuoso
        style={{ height: '100%' }}
        data={messages}
        initialTopMostItemIndex={initialTopMostItemIndex}
        itemContent={itemContent}
        increaseViewportBy={400}
        overscan={4}
        startReached={hasMore ? loadMore : undefined}
        components={{
          Footer: () =>
            hasMore && isLoadingMore ? (
              <div className="py-3 text-center text-xs text-slate-400">Chargement des messages précédents…</div>
            ) : null,
        }}
      />
    </div>
  )
}

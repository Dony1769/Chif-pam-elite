"use client"

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ChatService } from '@/services/chat'
import { ChatMessage } from '@/types/chat'


interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [isEditing, setEditing] = useState<boolean>(false)
  const [editText, setEditText] = useState<string>(message.content)

  const handleSaveEdit = useCallback(async () => {
    try {
      await ChatService.editMessage(supabase, message.id, editText)
      setEditing(false)
    } catch (err) {
      console.error('Erreur lors de la modification du message :', err)
    }
  }, [message.id, editText])

  return (
    <div className="p-2 my-1 rounded bg-slate-800 text-white">
      {isEditing ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="px-2 py-1 bg-slate-700 text-white rounded w-full"
          />
          <button onClick={handleSaveEdit} className="px-3 py-1 bg-green-600 rounded text-sm">
            Enregistrer
          </button>
          <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-600 rounded text-sm">
            Annuler
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <span>{message.content}</span>
          <button onClick={() => setEditing(true)} className="text-xs text-blue-400 underline ml-2">
            Modifier
          </button>
        </div>
      )}
    </div>
  )
}

// Export par défaut requis par VirtualizedMessageList.tsx
export default MessageBubble

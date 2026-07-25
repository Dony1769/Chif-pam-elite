"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ChatService, ChatMessage } from '@/services/chat'

export function useClientChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const seenIds = useRef<Set<string>>(new Set())

  // Chargement initial + abonnement Realtime
  useEffect(() => {
    let activeChannel: ReturnType<typeof supabase.channel> | null = null
    let isMounted = true

    const initChat = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !isMounted) return

        // 1. Récupération des messages existants
        const initialMessages = await ChatService.fetchMessages(supabase, user.id)
        if (!isMounted) return

        initialMessages.forEach((m) => seenIds.current.add(m.id))
        setMessages(initialMessages)

        // 2. Abonnement Realtime
        activeChannel = ChatService.subscribeToMessages(supabase, user.id, (newMsg) => {
          if (!seenIds.current.has(newMsg.id)) {
            seenIds.current.add(newMsg.id)
            setMessages((prev) => [...prev, newMsg])
          }
        })
      } catch (err) {
        console.error('[useClientChat] Erreur initialisation:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initChat()

    return () => {
      isMounted = false
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
    }
  }, [])

  // Action d'envoi
  const sendMessage = useCallback(async () => {
    if (!text.trim()) return
    const currentText = text
    setText('')

    try {
      const inserted = await ChatService.sendMessage(supabase, currentText)
      if (!seenIds.current.has(inserted.id)) {
        seenIds.current.add(inserted.id)
        setMessages((prev) => [...prev, inserted])
      }
    } catch (err) {
      console.error("[useClientChat] Erreur lors de l'envoi:", err)
      setText(currentText) // Restauration du texte en cas d'erreur
    }
  }, [text])

  return {
    messages,
    text,
    setText,
    sendMessage,
    loading,
    isLoadingMore: false,
    hasMore: false,
    loadMore: () => {},
  }
}

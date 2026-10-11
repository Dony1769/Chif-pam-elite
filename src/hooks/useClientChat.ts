import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ChatService, ChatMessage } from '@/services/chat'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useClientChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // États pour la pagination des anciens messages
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const seenIds = useRef<Set<string>>(new Set())

  /**
   * Étape 1 : Récupération de l'utilisateur connecté
   */
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    initUser()
  }, [])

  /**
   * Étape 2 : Chargement initial des messages et écoute Realtime
   */
  useEffect(() => {
    if (!currentUserId) return

    let activeChannel: RealtimeChannel | null = null
    let isMounted = true

    const loadMessages = async () => {
      setLoading(true)
      try {
        const data = await ChatService.fetchMessages(supabase, currentUserId)
        if (!isMounted) return

        seenIds.current = new Set(data.map((m) => m.id))
        setMessages(data)
      } catch (err) {
        console.error('Erreur lors du chargement des messages client:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadMessages()

    // Abonnement aux nouveaux messages en direct
    activeChannel = ChatService.subscribeToMessages(supabase, currentUserId, (newMsg) => {
      if (!seenIds.current.has(newMsg.id)) {
        seenIds.current.add(newMsg.id)
        setMessages((prev) => [...prev, newMsg])
      }
    })

    return () => {
      isMounted = false
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
    }
  }, [currentUserId])

  /**
   * Étape 3 : Envoi d'un nouveau message avec typage strict
   */
  const sendMessage = useCallback(async () => {
    if (!text.trim() || !currentUserId) return

    const currentText = text.trim()
    setText('')

    try {
      const adminReceiverId = 'admin'

      // Cast explicite de la réponse en ChatMessage pour empêcher l'inférence 'never'
      const inserted = (await ChatService.sendMessage(
        supabase,
        currentUserId,
        adminReceiverId,
        currentText
      )) as ChatMessage | null

      if (inserted && inserted.id && !seenIds.current.has(inserted.id)) {
        seenIds.current.add(inserted.id)
        setMessages((prev) => [...prev, inserted])
      }
    } catch (err) {
      console.error('Erreur lors de l’envoi du message:', err)
    }
  }, [text, currentUserId])

  /**
   * Étape 4 : Chargement des messages plus anciens (pagination)
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !currentUserId) return
    setIsLoadingMore(true)

    try {
      setIsLoadingMore(false)
    } catch (err) {
      console.error('Erreur lors du chargement des anciens messages:', err)
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, currentUserId])

  return {
    messages,
    text,
    setText,
    sendMessage,
    loading,
    currentUserId,
    isLoadingMore,
    hasMore,
    loadMore,
  }
}

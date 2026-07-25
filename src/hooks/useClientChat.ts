import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ChatService, ChatMessage } from '@/services/chat'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useClientChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const seenIds = useRef<Set<string>>(new Set())

  /**
   * Initialisation : Récupération de l'utilisateur connecté
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
   * Chargement des messages et abonnement en temps réel
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

    // Écoute en temps réel des nouveaux messages
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
   * Envoi d'un message par le client
   */
  const sendMessage = useCallback(async () => {
    if (!text.trim() || !currentUserId) return

    const currentText = text.trim()
    setText('')

    try {
      // Identifiant du destinataire (l'administration/support)
      const adminReceiverId = 'admin'

      // Appel avec les 4 arguments requis : supabase, senderId, receiverId, content
      const inserted = await ChatService.sendMessage(
        supabase,
        currentUserId,
        adminReceiverId,
        currentText
      )

      if (inserted && inserted.id && !seenIds.current.has(inserted.id)) {
        seenIds.current.add(inserted.id)
        setMessages((prev) => [...prev, inserted])
      }
    } catch (err) {
      console.error('Erreur lors de l’envoi du message:', err)
    }
  }, [text, currentUserId])

  return {
    messages,
    text,
    setText,
    sendMessage,
    loading,
    currentUserId,
  }
}

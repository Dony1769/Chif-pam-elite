import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ChatService, ChatMessage } from '@/services/chat'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface ChatUser {
  id: string
  username?: string
  phone?: string
  email?: string
  avatar_url?: string
}

export function useAdminChat(selectedUserId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reply, setReply] = useState('')
  const [users, setUsers] = useState<ChatUser[]>([])
  const [loading, setLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // Ensemble pour éviter les doublons de messages reçus en temps réel
  const seenIds = useRef<Set<string>>(new Set())

  /**
   * Charger la liste des utilisateurs ayant des discussions
   */
  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, phone, email, avatar_url')

      if (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error)
        return
      }

      setUsers(data || [])
    } catch (err) {
      console.error('Erreur inattendue lors de la récupération des utilisateurs:', err)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  /**
   * Charger les messages et gérer l'abonnement Realtime pour l'utilisateur sélectionné
   */
  useEffect(() => {
    if (!selectedUserId) {
      setMessages([])
      seenIds.current.clear()
      return
    }

    let activeChannel: RealtimeChannel | null = null
    let isMounted = true

    const loadInitialMessages = async () => {
      setLoading(true)
      try {
        const data = await ChatService.fetchMessages(supabase, selectedUserId)
        if (!isMounted) return

        seenIds.current = new Set(data.map((m) => m.id))
        setMessages(data)
      } catch (err) {
        console.error('Erreur lors du chargement initial des messages:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadInitialMessages()

    // Abonnement aux nouveaux messages via Realtime
    activeChannel = ChatService.subscribeToMessages(supabase, selectedUserId, (newMsg) => {
      if (!seenIds.current.has(newMsg.id)) {
        seenIds.current.add(newMsg.id)
        setMessages((prev) => [...prev, newMsg])
      }
    })

    // Nettoyage lors du changement d'utilisateur ou au démontage
    return () => {
      isMounted = false
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
    }
  }, [selectedUserId])

  /**
   * Envoyer un message en tant qu'administrateur
   */
  const sendReply = async () => {
    if (!reply.trim() || !selectedUserId) return

    const content = reply.trim()
    setReply('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const adminId = user?.id || 'admin'

      await ChatService.sendMessage(supabase, adminId, selectedUserId, content)
    } catch (err) {
      console.error('Erreur lors de l’envoi de la réponse:', err)
    }
  }

  /**
   * Charger plus de messages anciens (pagination)
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !selectedUserId) return
    setIsLoadingMore(true)

    try {
      // Logique de chargement des anciens messages si nécessaire
      setIsLoadingMore(false)
    } catch (err) {
      console.error('Erreur lors du chargement des messages anciens:', err)
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, selectedUserId])

  return {
    messages,
    reply,
    setReply,
    users,
    sendReply,
    loading,
    isLoadingMore,
    hasMore,
    loadMore,
  }
}

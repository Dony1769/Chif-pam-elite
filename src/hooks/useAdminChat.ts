import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ChatService, ChatMessage } from '@/services/chat'
import { RealtimeChannel } from '@supabase/supabase-js'

// Interface stricte alignée sur les besoins de ChatSidebar (UserItem)
export interface ChatUser {
  id: string
  username?: string
  phone?: string
  email?: string
  avatar_url?: string
  unread: number
  last_at: string
}

export function useAdminChat(selectedUserId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reply, setReply] = useState('')
  const [users, setUsers] = useState<ChatUser[]>([])
  const [loading, setLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const seenIds = useRef<Set<string>>(new Set())

  /**
   * Charger la liste des utilisateurs
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

      // Garantie que 'unread' et 'last_at' sont TOUJOURS définis
      const formattedUsers: ChatUser[] = (data || []).map((u) => ({
        id: u.id,
        username: u.username || undefined,
        phone: u.phone || undefined,
        email: u.email || undefined,
        avatar_url: u.avatar_url || undefined,
        unread: 0,
        last_at: new Date().toISOString()
      }))

      setUsers(formattedUsers)
    } catch (err) {
      console.error('Erreur lors de la récupération des utilisateurs:', err)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  /**
   * Charger les messages & abonnement Realtime
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
        console.error('Erreur lors du chargement des messages:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadInitialMessages()

    activeChannel = ChatService.subscribeToMessages(supabase, selectedUserId, (newMsg) => {
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
  }, [selectedUserId])

  /**
   * Envoyer un message
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

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !selectedUserId) return
    setIsLoadingMore(true)

    try {
      setIsLoadingMore(false)
    } catch (err) {
      console.error('Erreur lors du chargement des anciens messages:', err)
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

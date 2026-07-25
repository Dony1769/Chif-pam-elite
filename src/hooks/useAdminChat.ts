"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ChatService, ChatMessage } from '@/services/chat'

export interface ChatUser {
  id: string
  username?: string
  phone?: string
}

export function useAdminChat(selectedUserId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reply, setReply] = useState<string>('')
  const [users, setUsers] = useState<ChatUser[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const seenIds = useRef<Set<string>>(new Set())

  // Charger la liste des utilisateurs (profils)
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, phone')
      
      if (error) {
        console.error('[useAdminChat] Erreur profiles:', error)
        return
      }
      setUsers(data || [])
    }

    fetchUsers()
  }, [])

  // Chargement des messages de l'utilisateur sélectionné + souscription Realtime
  useEffect(() => {
    if (!selectedUserId) {
      setMessages([])
      seenIds.current.clear()
      return
    }

    let activeChannel: ReturnType<typeof supabase.channel> | null = null
    let isMounted = true

    const loadAdminChat = async () => {
      try {
        setLoading(true)
        seenIds.current.clear()

        const initial = await ChatService.fetchMessages(supabase, selectedUserId)
        if (!isMounted) return

        initial.forEach((m) => seenIds.current.add(m.id))
        setMessages(initial)

        // Écouter les messages reçus ou envoyés pour cet utilisateur spécifique
        activeChannel = ChatService.subscribeToMessages(supabase, selectedUserId, (newMsg) => {
          if (!seenIds.current.has(newMsg.id)) {
            seenIds.current.add(newMsg.id)
            setMessages((prev) => [...prev, newMsg])
          }
        })
      } catch (err) {
        console.error('[useAdminChat] Erreur chargement chat:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadAdminChat()

    return () => {
      isMounted = false
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
    }
  }, [selectedUserId])

  // Envoi d'une réponse admin
  const sendReply = useCallback(async () => {
    if (!selectedUserId || !reply.trim()) return
    const currentReply = reply
    setReply('')

    try {
      const inserted = await ChatService.sendAdminReply(supabase, selectedUserId, currentReply)
      if (!seenIds.current.has(inserted.id)) {
        seenIds.current.add(inserted.id)
        setMessages((prev) => [...prev, inserted])
      }
    } catch (err) {
      console.error('[useAdminChat] Erreur réponse admin:', err)
      setReply(currentReply)
    }
  }, [selectedUserId, reply])

  return {
    messages,
    reply,
    setReply,
    users,
    sendReply,
    loading,
    isLoadingMore: false,
    hasMore: false,
    loadMore: () => {},
  }
}

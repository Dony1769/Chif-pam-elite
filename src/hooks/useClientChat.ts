'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ChatService } from '@/services/chat'
import type { ChatMessage } from '@/types/chat'

const PAGE_SIZE = 30

export function useClientChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messageIdsRef = useRef<Set<string>>(new Set())
  const pendingMessageRef = useRef<ChatMessage | null>(null)
  const [text, setTextState] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const setText = useCallback((value: string) => {
    setTextState(value)
  }, [])

  const mergeMessages = useCallback((incoming: ChatMessage[], prepend = false) => {
    setMessages((prev) => {
      const existingIds = new Set(prev.map((message) => message.id))
      const filtered = incoming.filter((message) => {
        if (existingIds.has(message.id)) return false
        existingIds.add(message.id)
        return true
      })
      if (filtered.length === 0) return prev
      const next = prepend ? [...filtered, ...prev] : [...prev, ...filtered]
      messageIdsRef.current = existingIds
      return next
    })
  }, [])

  const fetchInitialMessages = useCallback(async (uid: string) => {
    pendingMessageRef.current = null
    try {
      const data = await ChatService.fetchMessages(uid, PAGE_SIZE)
      const ordered = [...data].reverse()
      setMessages(ordered)
      messageIdsRef.current = new Set(ordered.map((message) => message.id))
      setHasMore(data.length === PAGE_SIZE)
    } catch (error) {
      console.error('Échec du chargement des messages:', error)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!userId || isLoadingMore || !hasMore || messages.length === 0) return

    setIsLoadingMore(true)
    try {
      const oldest = messages[0]
      const data = await ChatService.fetchMessages(userId, PAGE_SIZE, oldest.created_at)
      const ordered = [...data].reverse()
      mergeMessages(ordered, true)
      setHasMore(data.length === PAGE_SIZE)
    } catch (error) {
      console.error('Erreur de chargement des anciens messages:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, mergeMessages, messages, userId])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return

    try {
      await ChatService.markAdminMessagesReadForClient(userId)
    } catch (error) {
      console.error('Erreur lecture des messages administrateur:', error)
    }
  }, [userId])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let mounted = true

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user
      if (!currentUser) {
        if (mounted) setLoading(false)
        return
      }

      setUserId(currentUser.id)
      await fetchInitialMessages(currentUser.id)
      await markAllAsRead()

      if (!mounted) return
      setLoading(false)

      channel = ChatService.subscribeToMessages(currentUser.id, (message) => {
        if (!mounted) return
        if (messageIdsRef.current.has(message.id)) return

        const pending = pendingMessageRef.current
        if (pending && pending.content === message.content && pending.user_id === message.user_id && pending.is_admin_message === message.is_admin_message) {
          messageIdsRef.current.delete(pending.id)
          pendingMessageRef.current = null
          setMessages((prev) => prev.map((item) => (item.id === pending.id ? message : item)))
          messageIdsRef.current.add(message.id)
          return
        }

        mergeMessages([message])
        if (message.is_admin_message) {
          markAllAsRead().catch((error) => {
            console.error('Failed to mark admin message as read', error)
          })
        }
      })
    }

    init()

    return () => {
      mounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchInitialMessages, markAllAsRead, mergeMessages])

  const sendMessage = async (message: string) => {
    const trimmedText = message.trim()
    if (!trimmedText || !userId) return

    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      user_id: userId,
      content: trimmedText,
      created_at: new Date().toISOString(),
      is_admin_message: false,
      is_read_by_admin: false,
      is_read_by_client: true,
    }

    setText('')
    setMessages((prev) => [...prev, optimisticMessage])
    messageIdsRef.current.add(optimisticMessage.id)
    pendingMessageRef.current = optimisticMessage

    try {
      await ChatService.sendClientMessage(userId, trimmedText)
    } catch (error) {
      console.error('Erreur envoi de message:', error)
      setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id))
      messageIdsRef.current.delete(optimisticMessage.id)
      pendingMessageRef.current = null
      setText(message)
    }
  }

  return {
    messages,
    text,
    setText,
    sendMessage,
    markAllAsRead,
    loading,
    isLoadingMore,
    hasMore,
    loadMore,
  }
}

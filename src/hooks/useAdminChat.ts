'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminChatService } from '@/services/admin/chat'
import { ChatService } from '@/services/chat'
import type { ChatMessage } from '@/types/chat'

type AdminUserSummary = {
  id: string
  username?: string | null
  phone?: string | null
  unread: number
  last_at: string
}

const USER_CACHE_KEY = 'admin-chat-users-v1'
const MESSAGE_CACHE_PREFIX = 'admin-chat-messages-v1:'
const CACHE_TTL_MS = 10_000

function readSessionCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { value: T; ts: number }
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null
    return parsed.value
  } catch {
    return null
  }
}

function writeSessionCache<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }))
  } catch {
    // ignore cache write failures
  }
}

function getMessageCacheKey(userId: string) {
  return `${MESSAGE_CACHE_PREFIX}${userId}`
}

export function useAdminChat(selectedUserId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messageIdsRef = useRef<Set<string>>(new Set())
  const [reply, setReplyState] = useState('')
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const selectedUserIdRef = useRef(selectedUserId)
  const markInFlightRef = useRef<Set<string>>(new Set())
  const requestIdRef = useRef(0)

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId
  }, [selectedUserId])

  const setReply = useCallback((value: string) => {
    setReplyState(value)
  }, [])

  const markMessagesReadOnce = useCallback(async (userId: string) => {
    if (!userId || markInFlightRef.current.has(userId)) return

    markInFlightRef.current.add(userId)
    try {
      await AdminChatService.markMessagesRead(userId)
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, unread: 0 } : user)))
    } catch (error) {
      console.error('Impossible de marquer les messages comme lus :', error)
    } finally {
      markInFlightRef.current.delete(userId)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    const cachedUsers = readSessionCache<AdminUserSummary[]>(USER_CACHE_KEY)
    if (cachedUsers) {
      setUsers(cachedUsers)
    }

    const { data: profiles, error } = await supabase.from('profiles').select('id,username,phone').neq('role', 'admin')
    if (error) {
      console.error('Impossible de charger les conversations :', error)
      return
    }

    if (!profiles || profiles.length === 0) {
      setUsers([])
      writeSessionCache(USER_CACHE_KEY, [])
      return
    }

    const { data: allMessages, error: messagesError } = await supabase
      .from('messages')
      .select('user_id,is_admin_message,is_read_by_admin,created_at')
      .in('user_id', profiles.map((profile) => profile.id))

    if (messagesError) {
      console.error('Impossible de charger les métadonnées de conversation :', messagesError)
      return
    }

    const userMeta = new Map<string, { unread: number; last_at: string }>()
    for (const message of allMessages || []) {
      const current = userMeta.get(message.user_id) ?? { unread: 0, last_at: new Date(0).toISOString() }
      if (!message.is_admin_message && !message.is_read_by_admin) {
        current.unread += 1
      }
      if (message.created_at && message.created_at > current.last_at) {
        current.last_at = message.created_at
      }
      userMeta.set(message.user_id, current)
    }

    const enhanced = profiles.map((profile) => ({
      id: profile.id,
      username: profile.username,
      phone: profile.phone,
      unread: userMeta.get(profile.id)?.unread || 0,
      last_at: userMeta.get(profile.id)?.last_at || new Date().toISOString(),
    }))

    setUsers(enhanced)
    writeSessionCache(USER_CACHE_KEY, enhanced)
  }, [])

  const loadMessagesForUser = useCallback(async (userId: string | null, requestId: number) => {
    if (!userId) {
      setMessages([])
      setHasMore(true)
      return
    }

    const cachedMessages = readSessionCache<ChatMessage[]>(getMessageCacheKey(userId))
    if (cachedMessages) {
      const ordered = [...cachedMessages].reverse()
      if (requestId === requestIdRef.current) {
        setMessages(ordered)
        messageIdsRef.current = new Set(ordered.map((message) => message.id))
        setHasMore(cachedMessages.length === 30)
      }
    }

    try {
      const [data] = await Promise.all([
        ChatService.fetchMessages(userId),
        markMessagesReadOnce(userId),
      ])

      if (requestId !== requestIdRef.current) return

      const ordered = [...data].reverse()
      setMessages(ordered)
      messageIdsRef.current = new Set(ordered.map((message) => message.id))
      setHasMore(data.length === 30)
      writeSessionCache(getMessageCacheKey(userId), data)
    } catch (error) {
      console.error('Impossible de charger la conversation :', error)
    }
  }, [markMessagesReadOnce])

  useEffect(() => {
    let mounted = true
    let chatChannel: ReturnType<typeof supabase.channel> | null = null

    setLoading(true)
    if (!selectedUserId) {
      setMessages([])
      setLoading(false)
      return () => {
        mounted = false
      }
    }

    const loadInitialData = async () => {
      requestIdRef.current += 1
      const requestId = requestIdRef.current
      try {
        await Promise.allSettled([loadUsers(), loadMessagesForUser(selectedUserId, requestId)])
      } finally {
        if (mounted && requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    }

    loadInitialData()

    chatChannel = ChatService.subscribeToMessages(selectedUserId, (message) => {
      if (messageIdsRef.current.has(message.id)) return

      messageIdsRef.current.add(message.id)
      setMessages((prev) => {
        if (prev.some((existing) => existing.id === message.id)) return prev
        return [message, ...prev]
      })

      if (!message.is_admin_message && selectedUserIdRef.current === message.user_id) {
        markMessagesReadOnce(message.user_id)
      }
    })

    return () => {
      mounted = false
      if (chatChannel) {
        supabase.removeChannel(chatChannel)
      }
    }
  }, [loadMessagesForUser, loadUsers, selectedUserId, markMessagesReadOnce])

  useEffect(() => {
    const globalChannel = supabase
      .channel('admin_main')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as ChatMessage

        setUsers((prev) =>
          prev.map((user) => {
            if (user.id !== msg.user_id) return user

            const shouldIncrement = !msg.is_admin_message && msg.user_id !== selectedUserIdRef.current
            return {
              ...user,
              last_at: msg.created_at,
              unread: user.unread + (shouldIncrement ? 1 : 0),
            }
          })
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(globalChannel)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!selectedUserId || isLoadingMore || !hasMore || messages.length === 0) return
    setIsLoadingMore(true)
    try {
      const oldest = messages[0]
      const data = await ChatService.fetchMessages(selectedUserId, 30, oldest.created_at)
      const ordered = [...data].reverse()
      setMessages((prev) => {
        const existing = new Set(prev.map((message) => message.id))
        const merged = [...ordered, ...prev].filter((message) => {
          if (existing.has(message.id)) return false
          existing.add(message.id)
          return true
        })
        return merged
      })
      setHasMore(data.length === 30)
    } catch (error) {
      console.error('Impossible de charger plus de messages :', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, messages, selectedUserId])

  const sendReply = useCallback(async (message: string) => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || !selectedUserId) return

    setReply('')

    const optimisticMessage: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      user_id: selectedUserId,
      content: trimmedMessage,
      created_at: new Date().toISOString(),
      is_admin_message: true,
      is_read_by_admin: true,
      is_read_by_client: false,
    }

    messageIdsRef.current.add(optimisticMessage.id)
    setMessages((prev) => [optimisticMessage, ...prev])

    const result = await AdminChatService.sendReply(selectedUserId, trimmedMessage)
    if (!result.success) {
      console.error('Impossible d’envoyer la réponse :', result.message)
      setReply(message)
      setMessages((prev) => prev.filter((item) => item.id !== optimisticMessage.id))
      messageIdsRef.current.delete(optimisticMessage.id)
    }
  }, [selectedUserId, setReply])

  const sortedUsers = useMemo(() => [...users].sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()), [users])

  return {
    messages,
    setReply,
    reply,
    users: sortedUsers,
    loading,
    isLoadingMore,
    hasMore,
    loadMore,
    sendReply,
  }
}

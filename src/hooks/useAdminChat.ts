'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminChatService } from '@/services/admin/chat'
import { ChatService } from '@/services/chat'
import type { ChatMessage } from '@/types/chat'

export function useAdminChat(selectedUserId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messageIdsRef = useRef<Set<string>>(new Set())
  const [reply, setReplyState] = useState('')
  const [users, setUsers] = useState<Array<{ id: string; username?: string | null; phone?: string | null; unread: number; last_at: string }>>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const setReply = useCallback((value: string) => {
    setReplyState(value)
  }, [])

  useEffect(() => {
    let mounted = true

    const loadUsers = async () => {
      const { data: profiles } = await supabase.from('profiles').select('id,username,phone').neq('role', 'admin')
      if (!profiles) {
        if (mounted) setLoading(false)
        return
      }

      const enhanced = await Promise.all(
        profiles.map(async (profile) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('is_read_by_admin', false)
            .eq('is_admin_message', false)

          const { data: lastMessage } = await supabase
            .from('messages')
            .select('created_at')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            id: profile.id,
            username: profile.username,
            phone: profile.phone,
            unread: count || 0,
            last_at: lastMessage?.created_at || new Date().toISOString(),
          }
        })
      )

      if (!mounted) return
      setUsers(enhanced)
      setLoading(false)
    }

    loadUsers()

    const globalChannel = supabase
      .channel('admin_main')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as ChatMessage

        setUsers((prev) =>
          prev.map((user) => {
            if (user.id !== msg.user_id) return user

            const shouldIncrement = !msg.is_admin_message && msg.user_id !== selectedUserId
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
      mounted = false
      supabase.removeChannel(globalChannel)
    }
  }, [selectedUserId])

  useEffect(() => {
    let chatChannel: ReturnType<typeof supabase.channel> | null = null
    if (!selectedUserId) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      if (!selectedUserId) return
      try {
        const data = await ChatService.fetchMessages(selectedUserId)
        const ordered = [...data].reverse()
        setMessages(ordered)
        messageIdsRef.current = new Set(ordered.map((message) => message.id))
        setHasMore(data.length === 30)
        await AdminChatService.markMessagesRead(selectedUserId)
        setUsers((prev) => prev.map((user) => (user.id === selectedUserId ? { ...user, unread: 0 } : user)))
      } catch (error) {
        console.error('Impossible de charger la conversation :', error)
      }
    }

    loadMessages()

    chatChannel = ChatService.subscribeToMessages(selectedUserId, (message) => {
      if (messageIdsRef.current.has(message.id)) return

      messageIdsRef.current.add(message.id)
      setMessages((prev) => {
        if (prev.some((existing) => existing.id === message.id)) return prev
        return [message, ...prev]
      })
      if (!message.is_admin_message) {
        AdminChatService.markMessagesRead(selectedUserId).catch((err) => console.error(err))
      }
    })

    return () => {
      if (chatChannel) {
        supabase.removeChannel(chatChannel)
      }
    }
  }, [selectedUserId])

  const loadMore = async () => {
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
  }

  const sendReply = async (message: string) => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || !selectedUserId) return

    setReply('')

    const result = await AdminChatService.sendReply(selectedUserId, trimmedMessage)
    if (!result.success) {
      console.error('Impossible d’envoyer la réponse :', result.message)
      setReply(message)
    }
  }

  return {
    messages,
    setReply,
    reply,
    users,
    loading,
    isLoadingMore,
    hasMore,
    loadMore,
    sendReply,
  }
}

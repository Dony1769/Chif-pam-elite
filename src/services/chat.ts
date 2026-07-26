import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatMessage } from '@/types/chat'

export type { ChatMessage } from '@/types/chat'

type RealtimeMessagePayload = { new: ChatMessage }

const CHAT_CHANNEL_PREFIX = 'chat_user_'

function getChatChannelName(userId: string) {
  return `${CHAT_CHANNEL_PREFIX}${userId}`
}

export class ChatService {
  static async fetchMessages(userId: string, limit?: number, before?: string): Promise<ChatMessage[]>
  static async fetchMessages(supabaseClient: SupabaseClient, userId: string, limit?: number, before?: string): Promise<ChatMessage[]>
  static async fetchMessages(
    arg1: SupabaseClient | string,
    arg2?: string | number,
    arg3?: number | string,
    arg4?: string
  ): Promise<ChatMessage[]> {
    const client = typeof arg1 === 'string' ? supabase : arg1
    const userId = typeof arg1 === 'string' ? arg1 : (typeof arg2 === 'string' ? arg2 : '')
    const limit = typeof arg2 === 'number' ? arg2 : (typeof arg3 === 'number' ? arg3 : 30)
    const before = typeof arg2 === 'string' ? arg2 : (typeof arg3 === 'string' ? arg3 : arg4)

    let query = client
      .from('messages')
      .select('id, user_id, content, created_at, is_admin_message, is_read_by_admin, is_read_by_client')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return data || []
  }

  static async sendMessage(senderId: string, receiverId: string, content: string): Promise<ChatMessage | null>
  static async sendMessage(supabaseClient: SupabaseClient, senderId: string, receiverId: string, content: string): Promise<ChatMessage | null>
  static async sendMessage(
    arg1: SupabaseClient | string,
    arg2: string,
    arg3?: string,
    arg4?: string
  ): Promise<ChatMessage | null> {
    const client = typeof arg1 === 'string' ? supabase : arg1
    const senderId = typeof arg1 === 'string' ? arg1 : arg2
    const receiverId = typeof arg1 === 'string' ? arg2 : (arg3 ?? '')
    const content = typeof arg1 === 'string' ? arg3 ?? '' : (arg4 ?? '')
    const trimmed = content.trim()

    if (!trimmed) return null

    const isAdminMessage = senderId === 'admin'
    const { data, error } = await client.from('messages').insert({
      content: trimmed,
      user_id: senderId,
      is_admin_message: isAdminMessage,
      is_read_by_admin: isAdminMessage,
      is_read_by_client: !isAdminMessage,
    }).select('id, user_id, content, created_at, is_admin_message, is_read_by_admin, is_read_by_client').single()

    if (error) {
      throw error
    }

    return data as ChatMessage | null
  }

  static async sendClientMessage(userId: string, content: string) {
    return this.sendMessage(userId, 'admin', content)
  }

  static async markAdminMessagesReadForClient(userId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ is_read_by_client: true })
      .eq('user_id', userId)
      .eq('is_admin_message', true)
      .eq('is_read_by_client', false)

    if (error) {
      throw error
    }
  }

  static subscribeToMessages(userId: string, callback: (message: ChatMessage) => void): ReturnType<typeof supabase.channel>
  static subscribeToMessages(supabaseClient: SupabaseClient, userId: string, callback: (message: ChatMessage) => void): ReturnType<typeof supabase.channel>
  static subscribeToMessages(
    arg1: SupabaseClient | string,
    arg2: string | ((message: ChatMessage) => void),
    arg3?: (message: ChatMessage) => void
  ): ReturnType<typeof supabase.channel> {
    const client = typeof arg1 === 'string' ? supabase : arg1
    const userId = typeof arg1 === 'string' ? arg1 : (typeof arg2 === 'string' ? arg2 : '')
    const callback = typeof arg2 === 'function' ? arg2 : (arg3 as (message: ChatMessage) => void)

    return client
      .channel(getChatChannelName(userId))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${userId}` },
        (payload: RealtimeMessagePayload) => {
          callback(payload.new)
        }
      )
      .subscribe()
  }

  static async uploadFile(supabaseClient: SupabaseClient, userId: string, file: File): Promise<string> {
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase() || 'bin'}`

    const { error } = await supabaseClient.storage.from('chat-attachments').upload(path, file)

    if (error) {
      throw new Error(`Failed to upload attachment: ${error.message}`)
    }

    const { data: publicUrlData } = supabaseClient.storage.from('chat-attachments').getPublicUrl(path)
    return publicUrlData.publicUrl
  }

  static async editMessage(messageId: string, newContent: string): Promise<void>
  static async editMessage(supabaseClient: SupabaseClient, messageId: string, newContent: string): Promise<void>
  static async editMessage(
    arg1: SupabaseClient | string,
    arg2: string,
    arg3?: string
  ): Promise<void> {
    const client = typeof arg1 === 'string' ? supabase : arg1
    const messageId = typeof arg1 === 'string' ? arg1 : arg2
    const newContent = typeof arg1 === 'string' ? arg2 : (arg3 ?? '')

    const { error } = await client.from('messages').update({ content: newContent }).eq('id', messageId)
    if (error) throw error
  }

  static async deleteMessage(messageId: string): Promise<void>
  static async deleteMessage(supabaseClient: SupabaseClient, messageId: string): Promise<void>
  static async deleteMessage(arg1: SupabaseClient | string, arg2?: string): Promise<void> {
    const client = typeof arg1 === 'string' ? supabase : arg1
    const messageId = typeof arg1 === 'string' ? arg1 : (arg2 ?? '')

    const { error } = await client.from('messages').delete().eq('id', messageId)
    if (error) throw error
  }

  // Broadcast typing/presence events on the user's chat channel
  static broadcastTyping(userId: string, payload: { isTyping: boolean; from?: string }) {
    const channel = supabase.channel(getChatChannelName(userId))
    channel.send({ type: 'broadcast', event: 'typing', payload })
    return channel
  }

  static broadcastPresence(userId: string, payload: { status: 'online' | 'offline'; at?: string }) {
    const channel = supabase.channel(getChatChannelName(userId))
    channel.send({ type: 'broadcast', event: 'presence', payload })
    return channel
  }

  static subscribeToBroadcasts(userId: string, handlers: { onTyping?: (p: any) => void; onPresence?: (p: any) => void }) {
    const channel = supabase.channel(getChatChannelName(userId))
    if (handlers.onTyping) {
      channel.on('broadcast', { event: 'typing' }, (e) => handlers.onTyping && handlers.onTyping(e.payload))
    }
    if (handlers.onPresence) {
      channel.on('broadcast', { event: 'presence' }, (e) => handlers.onPresence && handlers.onPresence(e.payload))
    }
    channel.subscribe()
    return channel
  }
}

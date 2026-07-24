import { supabase } from '@/lib/supabase'
import type { ChatMessage } from '@/types/chat'

type RealtimeMessagePayload = { new: ChatMessage }

const CHAT_CHANNEL_PREFIX = 'chat_user_'

function getChatChannelName(userId: string) {
  return `${CHAT_CHANNEL_PREFIX}${userId}`
}

export const ChatService = {
  async fetchMessages(userId: string, limit = 30, before?: string): Promise<ChatMessage[]> {
    let query = supabase
      .from('messages')
      .select('*')
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
  },

  async sendClientMessage(userId: string, content: string) {
    const trimmed = content.trim()
    if (!trimmed) return

    const { error } = await supabase.from('messages').insert({
      content: trimmed,
      user_id: userId,
      is_admin_message: false,
      is_read_by_admin: false,
      is_read_by_client: true,
    })

    if (error) {
      throw error
    }
  },

  async markAdminMessagesReadForClient(userId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ is_read_by_client: true })
      .eq('user_id', userId)
      .eq('is_admin_message', true)
      .eq('is_read_by_client', false)

    if (error) {
      throw error
    }
  },

  subscribeToMessages(userId: string, callback: (message: ChatMessage) => void) {
    return supabase
      .channel(getChatChannelName(userId))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${userId}` },
        (payload: RealtimeMessagePayload) => {
          callback(payload.new)
        }
      )
      .subscribe()
  },

  async uploadFile(userId: string, file: File) {
    const path = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`
    const { data, error: uploadError } = await supabase.storage.from('chat-files').upload(path, file)
    if (uploadError) throw uploadError

    // get public url
    const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(path)
    return urlData.publicUrl
  },

  async editMessage(messageId: string, newContent: string) {
    const { error } = await supabase.from('messages').update({ content: newContent }).eq('id', messageId)
    if (error) throw error
  },

  async deleteMessage(messageId: string) {
    const { error } = await supabase.from('messages').delete().eq('id', messageId)
    if (error) throw error
  },

  // Broadcast typing/presence events on the user's chat channel
  broadcastTyping(userId: string, payload: { isTyping: boolean; from?: string }) {
    const channel = supabase.channel(getChatChannelName(userId))
    channel.send({ type: 'broadcast', event: 'typing', payload })
    return channel
  },

  broadcastPresence(userId: string, payload: { status: 'online' | 'offline'; at?: string }) {
    const channel = supabase.channel(getChatChannelName(userId))
    channel.send({ type: 'broadcast', event: 'presence', payload })
    return channel
  },

  subscribeToBroadcasts(userId: string, handlers: { onTyping?: (p: any) => void; onPresence?: (p: any) => void }) {
    const channel = supabase.channel(getChatChannelName(userId))
    if (handlers.onTyping) {
      channel.on('broadcast', { event: 'typing' }, (e) => handlers.onTyping && handlers.onTyping(e.payload))
    }
    if (handlers.onPresence) {
      channel.on('broadcast', { event: 'presence' }, (e) => handlers.onPresence && handlers.onPresence(e.payload))
    }
    channel.subscribe()
    return channel
  },
}

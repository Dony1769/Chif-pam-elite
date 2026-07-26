import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import { ChatMessage } from '@/types/chat'

// Re-exportation propre du type centralisé
export type { ChatMessage }

export class ChatService {
  /**
   * Récupère la liste des messages pour un utilisateur
   */
  static async fetchMessages(
    supabase: SupabaseClient,
    userId: string
  ): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`user_id.eq.${userId},sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erreur lors de la récupération des messages:', error)
      return []
    }

    return (data as ChatMessage[]) || []
  }

  /**
   * S'abonne aux nouveaux messages en temps réel
   */
  static subscribeToMessages(
    supabase: SupabaseClient,
    targetUserId: string,
    onNewMessage: (msg: ChatMessage) => void
  ): RealtimeChannel {
    return supabase
      .channel(`chat_${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage

          if (
            newMsg.user_id === targetUserId ||
            newMsg.sender_id === targetUserId ||
            newMsg.receiver_id === targetUserId
          ) {
            onNewMessage(newMsg)
          }
        }
      )
      .subscribe()
  }

  /**
   * Envoie un message dans la base de données Supabase
   */
  static async sendMessage(
    supabase: SupabaseClient,
    senderId: string,
    receiverId: string,
    content: string
  ): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          sender_id: senderId,
          receiver_id: receiverId,
          user_id: senderId,
          content: content.trim(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Erreur lors de l’envoi du message:', error)
      return null
    }

    return data as ChatMessage
  }
}

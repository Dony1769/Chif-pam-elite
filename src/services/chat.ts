import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

export interface ChatMessage {
  id: string
  user_id: string
  content: string
  is_admin_message: boolean
  is_read_by_client: boolean | null
  is_read_by_admin: boolean | null
  created_at: string
}

export const ChatService = {
  /**
   * Charge les messages d'un utilisateur spécifique.
   */
  async fetchMessages(supabase: SupabaseClient, userId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('id, user_id, content, is_admin_message, is_read_by_client, is_read_by_admin, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[ChatService] Erreur lors de la récupération des messages:', error.message)
      throw error
    }

    return (data as ChatMessage[]) || []
  },

  /**
   * Envoie un message côté Client (is_admin_message = false).
   */
  async sendMessage(supabase: SupabaseClient, content: string): Promise<ChatMessage> {
    const trimmed = content.trim()
    if (!trimmed) throw new Error('Le message ne peut pas être vide.')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilisateur non authentifié.')

    const { data, error } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        content: trimmed,
        is_admin_message: false,
        is_read_by_admin: false,
        is_read_by_client: true,
      })
      .select()
      .single()

    if (error) {
      console.error("[ChatService] Erreur lors de l'envoi du message:", error.message)
      throw error
    }

    return data as ChatMessage
  },

  /**
   * Envoie une réponse côté Admin (is_admin_message = true).
   */
  async sendAdminReply(supabase: SupabaseClient, targetUserId: string, content: string): Promise<ChatMessage> {
    const trimmed = content.trim()
    if (!trimmed) throw new Error('La réponse ne peut pas être vide.')

    const { data, error } = await supabase
      .from('messages')
      .insert({
        user_id: targetUserId,
        content: trimmed,
        is_admin_message: true,
        is_read_by_admin: true,
        is_read_by_client: false,
      })
      .select()
      .single()

    if (error) {
      console.error("[ChatService] Erreur lors de l'envoi de la réponse admin:", error.message)
      throw error
    }

    return data as ChatMessage
  },

  /**
   * S'abonne aux événements INSERT en Realtime via Postgres Changes.
   */
  subscribeToMessages(
    supabase: SupabaseClient,
    targetUserId: string,
    onNewMessage: (message: ChatMessage) => void
  ): RealtimeChannel {
    const channelName = `realtime:messages:${targetUserId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${targetUserId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          console.log('[Realtime] Nouveautés reçues via Postgres Changes:', newMsg)
          onNewMessage(newMsg)
        }
      )
      .subscribe((status, err) => {
        console.log(`[Realtime Status] Canal ${channelName}:`, status)
        if (err) {
          console.error(`[Realtime Error] Échec de la souscription sur ${channelName}:`, err)
        }
      })

    return channel
  },
}

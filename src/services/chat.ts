import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

// Importation ou alignement strict du type ChatMessage avec src/types/chat.ts
export interface ChatMessage {
  id: string
  user_id: string
  content: string
  is_admin_message: boolean
  is_read_by_client: boolean
  is_read_by_admin: boolean
  created_at: string
}

export const ChatService = {
  /**
   * Charge les messages d'un utilisateur et garantit le type booléen sur la lecture.
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

    // Normalisation des champs nuls en booléens stricts
    return (data || []).map((msg) => ({
      id: msg.id,
      user_id: msg.user_id,
      content: msg.content,
      is_admin_message: Boolean(msg.is_admin_message),
      is_read_by_client: Boolean(msg.is_read_by_client),
      is_read_by_admin: Boolean(msg.is_read_by_admin),
      created_at: msg.created_at,
    }))
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

    return {
      id: data.id,
      user_id: data.user_id,
      content: data.content,
      is_admin_message: Boolean(data.is_admin_message),
      is_read_by_client: Boolean(data.is_read_by_client),
      is_read_by_admin: Boolean(data.is_read_by_admin),
      created_at: data.created_at,
    }
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

    return {
      id: data.id,
      user_id: data.user_id,
      content: data.content,
      is_admin_message: Boolean(data.is_admin_message),
      is_read_by_client: Boolean(data.is_read_by_client),
      is_read_by_admin: Boolean(data.is_read_by_admin),
      created_at: data.created_at,
    }
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
          const raw = payload.new
          const formattedMsg: ChatMessage = {
            id: raw.id,
            user_id: raw.user_id,
            content: raw.content,
            is_admin_message: Boolean(raw.is_admin_message),
            is_read_by_client: Boolean(raw.is_read_by_client),
            is_read_by_admin: Boolean(raw.is_read_by_admin),
            created_at: raw.created_at,
          }
          onNewMessage(formattedMsg)
        }
      )
      .subscribe((status, err) => {
        console.log(`[Realtime Status] Canal ${channelName}:`, status)
        if (err) {
          console.error(`[Realtime Error] Échec de souscription sur ${channelName}:`, err)
        }
      })

    return channel
  },
}

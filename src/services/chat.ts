import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import { ChatMessage } from '@/types/chat'

// Exportation uniforme du type de message
export type { ChatMessage }

export class ChatService {
  /**
   * Récupère l'historique des messages pour un utilisateur
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
   * Souscrit aux nouveaux messages en temps réel
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
   * Envoie un nouveau message texte dans Supabase
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

  /**
   * Modifie le texte d'un message existant
   */
  static async editMessage(
    supabase: SupabaseClient,
    messageId: string,
    newContent: string
  ): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('messages')
      .update({ content: newContent.trim() })
      .eq('id', messageId)
      .select()
      .single()

    if (error) {
      console.error('Erreur lors de la modification du message :', error)
      throw error
    }

    return data as ChatMessage
  }

  /**
   * Supprime un message de la base de données
   */
  static async deleteMessage(
    supabase: SupabaseClient,
    messageId: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)

    if (error) {
      console.error('Erreur lors de la suppression du message :', error)
      return false
    }

    return true
  }

  /**
   * Téléverse un fichier (image, document, etc.) dans Supabase Storage
   * @param supabase Instance du client Supabase
   * @param userId Identifiant de l'utilisateur qui envoie le fichier
   * @param file Le fichier brut sélectionné
   * @returns L'URL publique d'accès au fichier téléversé
   */
  static async uploadFile(
    supabase: SupabaseClient,
    userId: string,
    file: File
  ): Promise<string> {
    // 1. Nettoyage et sécurisation du nom de fichier
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
    const bucketName = 'chat-attachments' // Assure-toi que ce bucket existe ou adapte son nom si nécessaire

    // 2. Envoi du fichier sur Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Erreur lors du téléversement du fichier:', error)
      throw new Error(`Échec de l'envoi du fichier: ${error.message}`)
    }

    // 3. Récupération de l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    return publicUrlData.publicUrl
  }
}

import { SupabaseClient } from '@supabase/supabase-js'
import { ChatMessage } from '@/types/chat'

// Re-exportation du type pour garantir la compatibilité globale
export type { ChatMessage }

export const ChatService = {
  /**
   * Récupère la liste des messages échangés entre deux utilisateurs
   */
  async fetchMessages(supabase: SupabaseClient, userId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId},user_id.eq.${userId}`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erreur lors de la récupération des messages:', error)
      throw error
    }

    return (data as ChatMessage[]) || []
  },

  /**
   * Téléverse un fichier dans le storage Supabase et retourne son URL publique
   */
  async uploadFile(supabase: SupabaseClient, userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Erreur lors du téléversement du fichier:', uploadError)
      throw uploadError
    }

    const { data } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName)

    return data.publicUrl
  },

  /**
   * Modifie le contenu d'un message existant
   */
  async editMessage(supabase: SupabaseClient, messageId: string, newContent: string) {
    const { data, error } = await supabase
      .from('messages')
      .update({ content: newContent })
      .eq('id', messageId)

    if (error) {
      console.error('Erreur lors de la modification du message:', error)
      throw error
    }

    return data
  },

  /**
   * Envoie un nouveau message
   */
  async sendMessage(supabase: SupabaseClient, senderId: string, receiverId: string, content: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ sender_id: senderId, receiver_id: receiverId, content }])

    if (error) {
      console.error('Erreur lors de l’envoi du message:', error)
      throw error
    }

    return data
  },

  /**
   * Diffuse un événement de saisie (typing indicator) via Supabase Broadcast
   */
  broadcastTyping(channelId: string, payload: { isTyping: boolean; from?: string }) {
    console.log(`[Typing] Channel: ${channelId}`, payload)
  }
}

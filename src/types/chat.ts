/**
 * Interface unique et centralisée pour les messages de chat.
 * Utilisée à la fois par l'application client et l'interface d'administration.
 */
export interface ChatMessage {
  id: string
  created_at: string
  content: string
  user_id: string // Obligatoire pour garantir la compatibilité avec VirtualizedMessageList
  sender_id?: string
  receiver_id?: string
  sender_type?: 'client' | 'admin'
  is_read?: boolean
  is_admin_message?: boolean
  is_read_by_admin?: boolean
  is_read_by_client?: boolean
}

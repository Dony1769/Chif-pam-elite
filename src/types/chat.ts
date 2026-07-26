/**
 * Types unifiés pour le système de chat Chif-Pam
 * Fichier : src/types/chat.ts
 */

export interface ChatMessage {
  id: string;
  user_id: string; // ID du client auquel appartient la conversation
  content: string;
  is_admin_message: boolean;
  is_read_by_admin: boolean;
  is_read_by_client: boolean;
  created_at: string;
}

export interface AdminConversation {
  client_id: string;
  last_message_id: string;
  last_message_content: string | null;
  last_message_created_at: string;
  admin_unread_count: number;
}

export type ParsedMessageContent = 
  | { type: 'text'; text: string }
  | { type: 'image'; url: string }
  | { type: 'action'; text: string; actionLabel: string; actionUrl: string };

/**
 * Helper pour décoder le contenu d'un message (Texte brut, Image JSON ou Action Card)
 */
export function parseMessageContent(content: string): ParsedMessageContent {
  try {
    const obj = JSON.parse(content);
    if (obj && typeof obj === 'object') {
      if (obj.type === 'image' && typeof obj.url === 'string') {
        return { type: 'image', url: obj.url };
      }
      if (obj.type === 'action' && typeof obj.text === 'string' && typeof obj.actionUrl === 'string') {
        return { 
          type: 'action', 
          text: obj.text, 
          actionLabel: obj.actionLabel || 'Ouvrir la page', 
          actionUrl: obj.actionUrl 
        };
      }
    }
  } catch {
    // Si ce n'est pas du JSON valide, c'est du texte simple
  }
  return { type: 'text', text: content };
}

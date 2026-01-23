export type MessageType = 'text' | 'image' | 'audio';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'admin';
  type: MessageType;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  updated_at: string;
}


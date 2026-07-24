export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  is_admin_message: boolean;
  is_read_by_admin: boolean;
  is_read_by_client: boolean;
  conversation_id?: string | null;
}

export interface Conversation {
  id: string;
  user_id: string;
  updated_at: string;
}


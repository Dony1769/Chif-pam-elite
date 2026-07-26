import { supabase } from '@/lib/supabase';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { ChatMessage, AdminConversation } from '@/types/chat';

export type { ChatMessage, AdminConversation } from '@/types/chat';

type RealtimeMessagePayload = { new: ChatMessage };

const CHAT_CHANNEL_PREFIX = 'chat_user_';

function getChatChannelName(userId: string) {
  return `${CHAT_CHANNEL_PREFIX}${userId}`;
}

export class ChatService {
  static async fetchAdminConversations(db: SupabaseClient): Promise<AdminConversation[]> {
    const { data, error } = await db.rpc('get_admin_chat_conversations');
    if (error) {
      console.error('Erreur lors de la récupération des conversations admin:', error);
      throw error;
    }
    return data || [];
  }

  static async markConversationReadByAdmin(db: SupabaseClient, clientId: string): Promise<void> {
    const { error } = await db
      .from('messages')
      .update({ is_read_by_admin: true })
      .eq('user_id', clientId)
      .eq('is_admin_message', false);

    if (error) {
      console.error('Erreur lors du marquage comme lu (admin):', error);
    }
  }

  static async markConversationReadByClient(db: SupabaseClient, clientId: string): Promise<void> {
    const { error } = await db
      .from('messages')
      .update({ is_read_by_client: true })
      .eq('user_id', clientId)
      .eq('is_admin_message', true);

    if (error) {
      console.error('Erreur lors du marquage comme lu (client):', error);
    }
  }

  static async fetchMessagesForClient(db: SupabaseClient, clientId: string): Promise<ChatMessage[]> {
    const { data, error } = await db
      .from('messages')
      .select('*')
      .eq('user_id', clientId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur lors du chargement des messages:', error);
      return [];
    }
    return (data as ChatMessage[]) || [];
  }

  static async sendTextMessage(
    db: SupabaseClient,
    clientId: string,
    text: string,
    isAdmin: boolean
  ): Promise<ChatMessage | null> {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const { data, error } = await db
      .from('messages')
      .insert({
        user_id: clientId,
        content: trimmed,
        is_admin_message: isAdmin,
        is_read_by_admin: isAdmin,
        is_read_by_client: !isAdmin,
      })
      .select('*')
      .single();

    if (error) {
      console.error("Erreur lors de l'envoi du message texte:", error);
      throw error;
    }
    return data as ChatMessage | null;
  }

  static async uploadImageAndSend(
    db: SupabaseClient,
    clientId: string,
    file: File,
    isAdmin: boolean
  ): Promise<ChatMessage | null> {
    const fileExt = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const folder = isAdmin ? 'admin' : 'client';
    const path = `${folder}/${clientId}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await db.storage
      .from('chat-images')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Erreur lors du téléversement de l'image:", uploadError);
      throw uploadError;
    }

    const { data: publicUrlData } = db.storage.from('chat-images').getPublicUrl(path);
    const payload = JSON.stringify({ type: 'image', url: publicUrlData.publicUrl });

    return this.sendTextMessage(db, clientId, payload, isAdmin);
  }

  static subscribeToClientMessages(
    db: SupabaseClient,
    clientId: string,
    onNewMessage: (msg: ChatMessage) => void
  ): RealtimeChannel {
    return db
      .channel(`chat_room_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${clientId}`,
        },
        (payload) => {
          onNewMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();
  }

  static subscribeToMessages(
    db: SupabaseClient,
    userId: string,
    callback: (message: ChatMessage) => void
  ): RealtimeChannel {
    return this.subscribeToClientMessages(db, userId, callback);
  }

  static async fetchMessages(userId: string, limit?: number, before?: string): Promise<ChatMessage[]>;
  static async fetchMessages(supabaseClient: SupabaseClient, userId: string, limit?: number, before?: string): Promise<ChatMessage[]>;
  static async fetchMessages(
    arg1: SupabaseClient | string,
    arg2?: string | number,
    arg3?: number | string,
    arg4?: string
  ): Promise<ChatMessage[]> {
    const client = typeof arg1 === 'string' ? supabase : arg1;
    const userId = typeof arg1 === 'string' ? arg1 : (typeof arg2 === 'string' ? arg2 : '');
    const limit = typeof arg2 === 'number' ? arg2 : (typeof arg3 === 'number' ? arg3 : 30);
    const before = typeof arg2 === 'string' ? arg2 : (typeof arg3 === 'string' ? arg3 : arg4);

    let query = client
      .from('messages')
      .select('id, user_id, content, created_at, is_admin_message, is_read_by_admin, is_read_by_client')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return data || [];
  }

  static async sendMessage(senderId: string, receiverId: string, content: string): Promise<ChatMessage | null>;
  static async sendMessage(supabaseClient: SupabaseClient, senderId: string, receiverId: string, content: string): Promise<ChatMessage | null>;
  static async sendMessage(
    arg1: SupabaseClient | string,
    arg2: string,
    arg3?: string,
    arg4?: string
  ): Promise<ChatMessage | null> {
    const client = typeof arg1 === 'string' ? supabase : arg1;
    const senderId = typeof arg1 === 'string' ? arg1 : arg2;
    const receiverId = typeof arg1 === 'string' ? arg2 : (arg3 ?? '');
    const content = typeof arg1 === 'string' ? (arg3 ?? '') : (arg4 ?? '');
    const trimmed = content.trim();

    if (!trimmed) return null;

    const { data, error } = await client
      .from('messages')
      .insert({
        content: trimmed,
        user_id: receiverId || senderId,
        is_admin_message: false,
        is_read_by_admin: false,
        is_read_by_client: true,
      })
      .select('id, user_id, content, created_at, is_admin_message, is_read_by_admin, is_read_by_client')
      .single();

    if (error) {
      throw error;
    }

    return data as ChatMessage | null;
  }

  static async sendClientMessage(userId: string, content: string) {
    return this.sendMessage(userId, 'admin', content);
  }

  static async editMessage(messageId: string, newContent: string): Promise<void>;
  static async editMessage(supabaseClient: SupabaseClient, messageId: string, newContent: string): Promise<void>;
  static async editMessage(arg1: SupabaseClient | string, arg2: string, arg3?: string): Promise<void> {
    const client = typeof arg1 === 'string' ? supabase : arg1;
    const messageId = typeof arg1 === 'string' ? arg1 : arg2;
    const newContent = typeof arg1 === 'string' ? arg2 : (arg3 ?? '');

    const { error } = await client.from('messages').update({ content: newContent }).eq('id', messageId);
    if (error) {
      throw error;
    }
  }

  static async deleteMessage(messageId: string): Promise<void>;
  static async deleteMessage(supabaseClient: SupabaseClient, messageId: string): Promise<void>;
  static async deleteMessage(arg1: SupabaseClient | string, arg2?: string): Promise<void> {
    const client = typeof arg1 === 'string' ? supabase : arg1;
    const messageId = typeof arg1 === 'string' ? arg1 : (arg2 ?? '');

    const { error } = await client.from('messages').delete().eq('id', messageId);
    if (error) {
      throw error;
    }
  }

  static async uploadFile(supabaseClient: SupabaseClient, userId: string, file: File): Promise<string> {
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const rawExt = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase() || 'bin';
    const fileExt = rawExt || 'bin';
    const path = `${safeUserId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

    const { error } = await supabaseClient.storage.from('chat-attachments').upload(path, file);
    if (error) {
      throw new Error(`Failed to upload attachment: ${error.message}`);
    }

    const { data: publicUrlData } = supabaseClient.storage.from('chat-attachments').getPublicUrl(path);
    return publicUrlData.publicUrl;
  }

  static broadcastTyping(userId: string, payload: { isTyping: boolean; from?: string }) {
    const channel = supabase.channel(getChatChannelName(userId));
    channel.send({ type: 'broadcast', event: 'typing', payload });
    return channel;
  }

  static broadcastPresence(userId: string, payload: { status: 'online' | 'offline'; at?: string }) {
    const channel = supabase.channel(getChatChannelName(userId));
    channel.send({ type: 'broadcast', event: 'presence', payload });
    return channel;
  }

  static subscribeToBroadcasts(userId: string, handlers: { onTyping?: (p: any) => void; onPresence?: (p: any) => void }) {
    const channel = supabase.channel(getChatChannelName(userId));
    if (handlers.onTyping) {
      channel.on('broadcast', { event: 'typing' }, (e) => handlers.onTyping?.(e.payload));
    }
    if (handlers.onPresence) {
      channel.on('broadcast', { event: 'presence' }, (e) => handlers.onPresence?.(e.payload));
    }
    channel.subscribe();
    return channel;
  }
}
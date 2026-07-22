import { adminMarkMessagesRead, adminSendChatReply } from '@/app/actions/adminActions';

export const AdminChatService = {
  async markMessagesRead(userId: string) {
    return adminMarkMessagesRead(userId);
  },

  async sendReply(userId: string, content: string) {
    return adminSendChatReply(userId, content);
  },
};

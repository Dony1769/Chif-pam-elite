import { adminCloseLotterySession, adminOpenLotterySession } from '@/app/actions/adminActions';

export const AdminLotteryService = {
  openSession(moment: string, multiplicateur: number) {
    return adminOpenLotterySession(moment, multiplicateur);
  },

  closeSession(tirageId: string) {
    return adminCloseLotterySession(tirageId);
  },
};

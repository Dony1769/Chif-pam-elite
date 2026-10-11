import { adminToggleMiniGameStatus } from '@/app/actions/adminActions';

export const AdminMiniGamesService = {
  toggleStatus(gameId: string, currentStatus: boolean) {
    return adminToggleMiniGameStatus(gameId, currentStatus);
  },
};

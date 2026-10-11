import { ADMIN_GAME_CONFIG, type AdminGameId } from '@/lib/constants/admin-games';

export function isValidAdminGameId(gameId: string): gameId is AdminGameId {
  return ADMIN_GAME_CONFIG.some((entry) => entry.id === gameId);
}

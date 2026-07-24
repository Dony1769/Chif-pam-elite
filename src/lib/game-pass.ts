import { ECONOMY_CONFIG } from '@/lib/game-economy';

export type GamePassHistoryEntry = {
  id: string;
  label: string;
  detail: string;
  created_at: string;
};

export type GamePassRecord = {
  id?: string;
  user_id?: string;
  xp: number;
  level: number;
  badge: string;
  title: string;
  rank: string;
  avatar: string;
  history: GamePassHistoryEntry[];
  play_time_minutes: number;
  max_combo: number;
  favorite_game: string;
  public_profile: boolean;
};

export const GAME_PASS_AVATARS = [...ECONOMY_CONFIG.gamePass.avatars] as const;

export const computeGamePassSummary = (xp: number, fallbackTitle?: string) => {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  const level = Math.max(1, Math.floor(safeXp / ECONOMY_CONFIG.gamePass.xpPerLevel) + 1);
  const title = fallbackTitle || ECONOMY_CONFIG.gamePass.defaultTitle;

  const reward = [...ECONOMY_CONFIG.rewards.gamePass].sort((a, b) => a.level - b.level).find((entry) => level >= entry.level) ?? ECONOMY_CONFIG.rewards.gamePass[0];

  return {
    xp: safeXp,
    level,
    badge: reward?.badge ?? 'Novice',
    rank: reward?.rank ?? 'Bronze',
    title,
  };
};

export const createGamePassHistoryEntry = (label: string, detail: string) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  label,
  detail,
  created_at: new Date().toISOString(),
});

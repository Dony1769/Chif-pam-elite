export const ADMIN_GAME_CONFIG = [
  { id: 'mines', table: 'mines_games', title: 'Mines', color: 'text-rose-500' },
  { id: 'crash', table: 'crash_games', title: 'Crash', color: 'text-emerald-500' },
  { id: 'biometric', table: 'biometric_games', title: 'Biometric', color: 'text-blue-500' },
  { id: 'vault', table: 'vault_games', title: 'Vault', color: 'text-amber-500' },
  { id: 'quiz', table: 'quiz_games', title: 'Quiz', color: 'text-purple-500' },
  { id: 'plinko', table: 'plinko_games', title: 'Plinko', color: 'text-orange-500' },
  { id: 'glass', table: 'glass_games', title: 'Glass', color: 'text-cyan-500' },
  { id: 'elevator', table: 'elevator_games', title: 'Elevator', color: 'text-indigo-500' },
] as const;

export type AdminGameId = (typeof ADMIN_GAME_CONFIG)[number]['id'];

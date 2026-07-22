export const CHALLENGE_PRIZE_RATIO = 0.70;

export const CHALLENGE_GAME_TYPES = ['quiz', 'biometric', 'vault'] as const;

export type ChallengeGameType = (typeof CHALLENGE_GAME_TYPES)[number];

export type AdminChallengeForm = {
  title: string;
  game_type: ChallengeGameType;
  entry_fee_cp_base: number;
  prize_pool_cp: number;
  max_participants: number;
  ends_at: string;
};

export const CHALLENGE_LIMITS = {
  titleMaxLength: 120,
  entryFeeMin: 1,
  entryFeeMax: 1_000_000_000,
  maxParticipantsMin: 1,
  maxParticipantsMax: 100_000,
} as const;

export const DEFAULT_ADMIN_CHALLENGE_FORM: AdminChallengeForm = {
  title: '',
  game_type: 'quiz',
  entry_fee_cp_base: 100,
  prize_pool_cp: 70,
  max_participants: 50,
  ends_at: '',
};

import {
  CHALLENGE_GAME_TYPES,
  CHALLENGE_LIMITS,
  CHALLENGE_PRIZE_RATIO,
  type ChallengeGameType,
} from '@/lib/constants/challenges';
import {
  validateIntegerInRange,
  validatePositiveAmount,
  validateRequiredText,
} from '@/lib/validation';

export type ChallengeCreateInput = {
  title: string;
  game_type: string;
  entry_fee_cp_base: number;
  max_participants: number;
  ends_at: string;
};

export type ValidChallengeCreateInput = {
  title: string;
  game_type: ChallengeGameType;
  entry_fee_cp_base: number;
  prize_pool_cp: number;
  max_participants: number;
  ends_at: string;
};

export function computeChallengePrizePool(entryFee: number, maxParticipants: number): number {
  return Math.floor(entryFee * maxParticipants * CHALLENGE_PRIZE_RATIO);
}

export function validateChallengeCreateInput(
  input: ChallengeCreateInput
): { ok: true; value: ValidChallengeCreateInput } | { ok: false; message: string } {
  const titleCheck = validateRequiredText(input.title, 'Le titre', CHALLENGE_LIMITS.titleMaxLength);
  if (!titleCheck.ok) {
    return { ok: false, message: titleCheck.message || 'Titre invalide.' };
  }

  if (!CHALLENGE_GAME_TYPES.includes(input.game_type as ChallengeGameType)) {
    return { ok: false, message: 'Type de jeu invalide.' };
  }

  const entryFeeCheck = validatePositiveAmount(
    input.entry_fee_cp_base,
    'Le prix de session',
    CHALLENGE_LIMITS.entryFeeMax
  );
  if (!entryFeeCheck.ok) {
    return { ok: false, message: entryFeeCheck.message || 'Prix de session invalide.' };
  }

  const maxParticipantsCheck = validateIntegerInRange(
    input.max_participants,
    'La limite de joueurs',
    CHALLENGE_LIMITS.maxParticipantsMin,
    CHALLENGE_LIMITS.maxParticipantsMax
  );
  if (!maxParticipantsCheck.ok) {
    return { ok: false, message: maxParticipantsCheck.message || 'Limite de joueurs invalide.' };
  }

  const endsAtDate = new Date(input.ends_at);
  if (!input.ends_at || Number.isNaN(endsAtDate.getTime())) {
    return { ok: false, message: "Date d'expiration invalide." };
  }

  const normalizedTitle = input.title.trim().toUpperCase();
  const prizePool = computeChallengePrizePool(input.entry_fee_cp_base, input.max_participants);

  return {
    ok: true,
    value: {
      title: normalizedTitle,
      game_type: input.game_type as ChallengeGameType,
      entry_fee_cp_base: input.entry_fee_cp_base,
      prize_pool_cp: prizePool,
      max_participants: input.max_participants,
      ends_at: endsAtDate.toISOString(),
    },
  };
}

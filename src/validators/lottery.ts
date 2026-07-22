import { LOTTERY_LIMITS, LOTTERY_MOMENTS, type LotteryMoment } from '@/lib/constants/lottery';
import { isUuid, validateIntegerInRange, validateRequiredText } from '@/lib/validation';

export type LotteryOpenInput = {
  moment: string;
  multiplicateur: number;
};

export type ValidLotteryOpenInput = {
  moment: LotteryMoment;
  multiplicateur: number;
};

export function validateLotteryOpenInput(
  input: LotteryOpenInput
): { ok: true; value: ValidLotteryOpenInput } | { ok: false; message: string } {
  const momentCheck = validateRequiredText(input.moment, 'Le moment', 40);
  if (!momentCheck.ok) {
    return { ok: false, message: momentCheck.message || 'Moment invalide.' };
  }

  if (!LOTTERY_MOMENTS.includes(input.moment as LotteryMoment)) {
    return { ok: false, message: 'Moment de session invalide.' };
  }

  const multiplierCheck = validateIntegerInRange(
    input.multiplicateur,
    'Le multiplicateur',
    LOTTERY_LIMITS.multiplierMin,
    LOTTERY_LIMITS.multiplierMax
  );
  if (!multiplierCheck.ok) {
    return { ok: false, message: multiplierCheck.message || 'Multiplicateur invalide.' };
  }

  return {
    ok: true,
    value: {
      moment: input.moment as LotteryMoment,
      multiplicateur: input.multiplicateur,
    },
  };
}

export function validateLotterySessionId(sessionId: string): { ok: true } | { ok: false; message: string } {
  if (!isUuid(sessionId)) {
    return { ok: false, message: 'Identifiant session invalide.' };
  }
  return { ok: true };
}

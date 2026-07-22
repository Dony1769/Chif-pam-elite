export const LOTTERY_MOMENTS = ['Matin', 'Midi', 'Après-Midi', 'Soir'] as const;

export type LotteryMoment = (typeof LOTTERY_MOMENTS)[number];

export const LOTTERY_LIMITS = {
  multiplierMin: 1,
  multiplierMax: 1000,
} as const;

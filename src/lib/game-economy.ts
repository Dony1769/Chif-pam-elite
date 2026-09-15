export type GameEconomyGameId = 'crash' | 'mines' | 'plinko' | 'quiz' | 'laser-vault' | 'biometric';
export type GameEconomyDifficulty = 'facile' | 'intermédiaire' | 'difficile';
export type EconomyRewardType = 'cp' | 'diamonds' | 'xp';
export type EconomyRewardScope = 'daily' | 'weekly' | 'monthly' | 'mission' | 'event' | 'achievement' | 'tournament' | 'game-pass' | 'special';

export interface GameEconomyDifficultyProfile {
  baseMultiplier?: number;
  multiplierStep?: number;
  time?: number;
  points?: number;
  minesCount?: number;
  speedFactor?: number;
  errorPenalty?: number;
  displayTime?: number;
  crashBias?: number;
  autoCashoutTarget?: number;
  plinkoBias?: number;
  gridSize?: number;
  multiplierScale?: number;
  bonusProbability?: number;
  bonusMultiplier?: number;
  jackpotProbability?: number;
  jackpotMultiplier?: number;
  specialEventProbability?: number;
  specialEventMultiplier?: number;
}

export interface GameEconomyConfig {
  id: GameEconomyGameId;
  label: string;
  houseEdge: number;
  rtp: number;
  defaultDifficulty: GameEconomyDifficulty;
  bonusMultiplier: number;
  jackpotMultiplier: number;
  difficulty: Record<GameEconomyDifficulty, GameEconomyDifficultyProfile>;
  multiplierTable?: number[];
  jackpotProbability?: number;
}

export interface EconomicUsageSnapshot {
  daily?: number;
  weekly?: number;
  monthly?: number;
  session?: number;
}

export interface GameEconomyContext {
  gameId: GameEconomyGameId;
  bet: number;
  difficulty?: GameEconomyDifficulty;
  multiplier?: number;
  revealedCount?: number;
  isBombHit?: boolean;
  autoCashout?: number;
  randomValue?: number;
  finalPos?: number;
  bonusMultiplier?: number;
  jackpotMultiplier?: number;
  specialEventMultiplier?: number;
  questionCount?: number;
  userScore?: number;
  currentStep?: number;
  jackpotTriggered?: boolean;
  specialEventId?: string;
  usage?: EconomicUsageSnapshot;
}

export interface ResolvedGameEconomy {
  gameId: GameEconomyGameId;
  difficulty: GameEconomyDifficulty;
  houseEdge: number;
  rtp: number;
  multiplier: number;
  payout: number;
  bonusMultiplier: number;
  jackpotMultiplier: number;
  specialEventMultiplier: number;
  specialEvent: string | null;
  jackpotTriggered: boolean;
  metadata: Record<string, unknown>;
}

export interface DailyRewardProfile {
  dayNumber: number;
  rewardAmount: number;
  rewardType: EconomyRewardType;
  title: string;
}

export interface RewardDefinition {
  id: string;
  scope: EconomyRewardScope;
  label: string;
  amount: number;
  type: EconomyRewardType;
  title?: string;
  description?: string;
  minLevel?: number;
  active?: boolean;
  multiplier?: number;
}

export interface MissionRewardInput {
  reward_type?: EconomyRewardType;
  reward_amount?: number;
  id?: string;
  title?: string;
}

export interface RewardResolution {
  amount: number;
  type: EconomyRewardType;
  label: string;
  source: string;
  appliedMultiplier: number;
}

export interface GamePassLevelDefinition {
  level: number;
  badge: string;
  rank: string;
  rewardAmount: number;
  rewardType: EconomyRewardType;
}

export interface EconomicHistoryEntry {
  id: string;
  type: 'win' | 'loss' | 'reward' | 'mission' | 'event' | 'jackpot' | 'daily' | 'weekly' | 'monthly' | 'withdrawal' | 'deposit' | 'purchase' | 'game-pass' | 'achievement' | 'tournament';
  amount: number;
  label: string;
  detail: string;
  created_at: string;
}

export interface AdminEconomySnapshot {
  createdCp: number;
  distributedCp: number;
  spentCp: number;
  withdrawnCp: number;
  circulatingCp: number;
  gameYield: Record<string, number>;
  rewardSplit: Record<EconomyRewardType, number>;
  retentionRate: number;
  activityDaily: number;
  activityWeekly: number;
  activityMonthly: number;
}

export const ECONOMY_CONFIG = {
  global: {
    baseBonusMultiplier: 1,
    baseJackpotMultiplier: 1.1,
    specialEventMultiplier: 1.1,
    xpPerLevel: 300,
    gamePassDefaultTitle: 'Voyageur',
    dailyRewardStreakMultiplier: 1.1,
    weeklyRewardStreakMultiplier: 1.15,
    monthlyRewardStreakMultiplier: 1.2,
  },
  limits: {
    daily: 20000,
    weekly: 90000,
    monthly: 300000,
    session: 5000,
    maxWinPerSession: 5000,
    maxWinPerDay: 10000,
    maxWinPerWeek: 40000,
    maxWinPerMonth: 120000,
  },
  rewards: {
    daily: [
      { id: 'daily-1', scope: 'daily' as const, label: 'Connexion du jour', amount: 100, type: 'cp' as const, title: 'Connexion du jour' },
      { id: 'daily-2', scope: 'daily' as const, label: 'Rythme de progression', amount: 125, type: 'cp' as const, title: 'Rythme de progression' },
      { id: 'daily-3', scope: 'daily' as const, label: 'Momentum', amount: 150, type: 'cp' as const, title: 'Momentum' },
      { id: 'daily-4', scope: 'daily' as const, label: 'Bonus premium', amount: 200, type: 'diamonds' as const, title: 'Bonus premium' },
      { id: 'daily-5', scope: 'daily' as const, label: 'Streak solide', amount: 250, type: 'cp' as const, title: 'Streak solide' },
      { id: 'daily-6', scope: 'daily' as const, label: 'Momentum fort', amount: 300, type: 'cp' as const, title: 'Momentum fort' },
      { id: 'daily-7', scope: 'daily' as const, label: 'Sélection premium', amount: 350, type: 'diamonds' as const, title: 'Sélection premium' },
    ],
    weekly: [
      { id: 'weekly-1', scope: 'weekly' as const, label: 'Renforcement hebdo', amount: 400, type: 'cp' as const, title: 'Renforcement hebdo' },
      { id: 'weekly-2', scope: 'weekly' as const, label: 'Niveau hebdo', amount: 450, type: 'cp' as const, title: 'Niveau hebdo' },
    ],
    monthly: [
      { id: 'monthly-1', scope: 'monthly' as const, label: 'Cycle mensuel', amount: 1200, type: 'cp' as const, title: 'Cycle mensuel' },
      { id: 'monthly-2', scope: 'monthly' as const, label: 'Bonus mensuel', amount: 1500, type: 'diamonds' as const, title: 'Bonus mensuel' },
    ],
    missions: [
      { id: 'mission-login', scope: 'mission' as const, label: 'Connexion', amount: 60, type: 'cp' as const },
      { id: 'mission-win', scope: 'mission' as const, label: 'Victoire', amount: 90, type: 'cp' as const },
      { id: 'mission-streak', scope: 'mission' as const, label: 'Streak', amount: 120, type: 'xp' as const },
    ],
    events: [
      { id: 'event-lucky', scope: 'event' as const, label: 'Lucky Surge', amount: 150, type: 'cp' as const, multiplier: 1.25, active: true },
      { id: 'event-elite', scope: 'event' as const, label: 'Elite Rush', amount: 220, type: 'cp' as const, multiplier: 1.4, active: true },
    ],
    achievements: [
      { id: 'achievement-first-win', scope: 'achievement' as const, label: 'Première victoire', amount: 120, type: 'cp' as const },
      { id: 'achievement-streak', scope: 'achievement' as const, label: 'Streak de 3', amount: 180, type: 'xp' as const },
    ],
    tournaments: [
      { id: 'tournament-arcade', scope: 'tournament' as const, label: 'Arcade', amount: 300, type: 'cp' as const },
      { id: 'tournament-elite', scope: 'tournament' as const, label: 'Elite', amount: 450, type: 'cp' as const },
    ],
    gamePass: [
      { level: 1, badge: 'Novice', rank: 'Bronze', rewardAmount: 150, rewardType: 'cp' as const },
      { level: 5, badge: 'Rookie', rank: 'Argent', rewardAmount: 220, rewardType: 'cp' as const },
      { level: 10, badge: 'Vétéran', rank: 'Or', rewardAmount: 320, rewardType: 'cp' as const },
      { level: 15, badge: 'Maître', rank: 'Platine', rewardAmount: 420, rewardType: 'cp' as const },
      { level: 20, badge: 'Légende', rank: 'Diamant', rewardAmount: 600, rewardType: 'cp' as const },
    ],
  },
  gamePass: {
    xpPerLevel: 300,
    defaultTitle: 'Voyageur',
    avatars: ['🛰️', '🧠', '⚡', '🛡️', '🎮', '🤖'] as const,
  },
  adminStats: {
    retentionBaseline: 0.28,
    activityWeight: 1,
  },
};

export const GAME_ECONOMY_CONFIG: Record<GameEconomyGameId, GameEconomyConfig> = {
  crash: {
    id: 'crash',
    label: 'Crash',
    houseEdge: 0.02,
    rtp: 0.98,
    defaultDifficulty: 'intermédiaire',
    bonusMultiplier: 1,
    jackpotMultiplier: 1.15,
    jackpotProbability: 0.015,
    difficulty: {
      facile: { baseMultiplier: 0.5, multiplierStep: 0.05, crashBias: 0.62, autoCashoutTarget: 1.5 },
      intermédiaire: { baseMultiplier: 0.5, multiplierStep: 0.08, crashBias: 0.55, autoCashoutTarget: 2.0 },
      difficile: { baseMultiplier: 0.5, multiplierStep: 0.1, crashBias: 0.48, autoCashoutTarget: 2.5 }
    }
  },
  mines: {
    id: 'mines',
    label: 'Mines',
    houseEdge: 0.03,
    rtp: 0.97,
    defaultDifficulty: 'intermédiaire',
    bonusMultiplier: 1,
    jackpotMultiplier: 1.2,
    jackpotProbability: 0.015,
    difficulty: {
      facile: { baseMultiplier: 0.5, multiplierStep: 0.15, minesCount: 5 },
      intermédiaire: { baseMultiplier: 0.5, multiplierStep: 0.35, minesCount: 8 },
      difficile: { baseMultiplier: 0.5, multiplierStep: 0.5, minesCount: 11 }
    }
  },
  plinko: {
    id: 'plinko',
    label: 'Plinko',
    houseEdge: 0.04,
    rtp: 0.96,
    defaultDifficulty: 'intermédiaire',
    bonusMultiplier: 1,
    jackpotMultiplier: 1.25,
    jackpotProbability: 0.01,
    difficulty: {
      facile: { baseMultiplier: 1, plinkoBias: 0.55 },
      intermédiaire: { baseMultiplier: 1, plinkoBias: 0.52 },
      difficile: { baseMultiplier: 1, plinkoBias: 0.49 }
    },
    multiplierTable: [1000, 15, 5, 2.5, 1.5, 0.5, 0.2, 0.2, 0.1, 0.1, 0.2, 0.5, 1.5, 2.5, 5, 15, 1000]
  },
  quiz: {
    id: 'quiz',
    label: 'Quiz',
    houseEdge: 0.02,
    rtp: 0.98,
    defaultDifficulty: 'intermédiaire',
    bonusMultiplier: 1,
    jackpotMultiplier: 1.1,
    jackpotProbability: 0.012,
    difficulty: {
      facile: { baseMultiplier: 0.5, multiplierStep: 0.15, time: 13, points: 10 },
      intermédiaire: { baseMultiplier: 0.5, multiplierStep: 0.2, time: 9, points: 25 },
      difficile: { baseMultiplier: 0.5, multiplierStep: 0.5, time: 6, points: 50 }
    }
  },
  'laser-vault': {
    id: 'laser-vault',
    label: 'Laser Vault',
    houseEdge: 0.025,
    rtp: 0.975,
    defaultDifficulty: 'intermédiaire',
    bonusMultiplier: 1,
    jackpotMultiplier: 1.18,
    jackpotProbability: 0.012,
    difficulty: {
      facile: { baseMultiplier: 0.5, multiplierStep: 0.04, speedFactor: 3.2, errorPenalty: 1.0 },
      intermédiaire: { baseMultiplier: 0.5, multiplierStep: 0.05, speedFactor: 3.87, errorPenalty: 1.0 },
      difficile: { baseMultiplier: 0.5, multiplierStep: 0.06, speedFactor: 4.5, errorPenalty: 1.1 }
    }
  },
  biometric: {
    id: 'biometric',
    label: 'Biometric Hack',
    houseEdge: 0.03,
    rtp: 0.97,
    defaultDifficulty: 'intermédiaire',
    bonusMultiplier: 1,
    jackpotMultiplier: 1.16,
    jackpotProbability: 0.012,
    difficulty: {
      facile: { baseMultiplier: 0.5, multiplierStep: 0.08, displayTime: 1400, multiplierScale: 0.1, gridSize: 3 },
      intermédiaire: { baseMultiplier: 0.5, multiplierStep: 0.1, displayTime: 1000, multiplierScale: 0.1, gridSize: 3 },
      difficile: { baseMultiplier: 0.5, multiplierStep: 0.12, displayTime: 700, multiplierScale: 0.12, gridSize: 3 }
    }
  }
};

export const XP_LEVEL_BASE = 1000;

export function getXpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return XP_LEVEL_BASE * (safeLevel - 1) ** 2;
}

export function getLevelForXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  return Math.max(1, Math.floor(Math.sqrt(safeXp / XP_LEVEL_BASE)) + 1);
}

export function getLevelUpDiamondReward(fromLevel: number, toLevel: number): number {
  const start = Math.max(1, Math.floor(fromLevel));
  const end = Math.max(start, Math.floor(toLevel));
  return 50 * ((end * (end + 1) / 2) - (start * (start + 1) / 2));
}

export function getGameEconomyConfig(gameId: GameEconomyGameId): GameEconomyConfig {
  return GAME_ECONOMY_CONFIG[gameId];
}

export function getGameEconomyDifficulty(gameId: GameEconomyGameId, difficulty?: GameEconomyDifficulty): GameEconomyDifficultyProfile {
  const config = getGameEconomyConfig(gameId);
  const resolvedDifficulty = difficulty ?? config.defaultDifficulty;
  return config.difficulty[resolvedDifficulty];
}

function applyEconomicCaps(amount: number, usage?: EconomicUsageSnapshot): number {
  const caps = ECONOMY_CONFIG.limits;
  const safeUsage = usage ?? {};
  const dailyUsed = safeUsage.daily ?? 0;
  const weeklyUsed = safeUsage.weekly ?? 0;
  const monthlyUsed = safeUsage.monthly ?? 0;
  const sessionUsed = safeUsage.session ?? 0;

  const cappedBySession = Math.min(amount, Math.max(0, caps.maxWinPerSession - sessionUsed));
  const cappedByDay = Math.min(cappedBySession, Math.max(0, caps.maxWinPerDay - dailyUsed));
  const cappedByWeek = Math.min(cappedByDay, Math.max(0, caps.maxWinPerWeek - weeklyUsed));
  const cappedByMonth = Math.min(cappedByWeek, Math.max(0, caps.maxWinPerMonth - monthlyUsed));
  return Math.max(0, cappedByMonth);
}

export function resolveGameEconomy(context: GameEconomyContext): ResolvedGameEconomy {
  const config = getGameEconomyConfig(context.gameId);
  const difficulty = context.difficulty ?? config.defaultDifficulty;
  const profile = config.difficulty[difficulty];
  const bonusMultiplier = context.bonusMultiplier ?? config.bonusMultiplier ?? ECONOMY_CONFIG.global.baseBonusMultiplier;
  const jackpotMultiplier = context.jackpotMultiplier ?? config.jackpotMultiplier ?? ECONOMY_CONFIG.global.baseJackpotMultiplier;
  const specialEventMultiplier = context.specialEventMultiplier ?? ECONOMY_CONFIG.global.specialEventMultiplier;

  const event = ECONOMY_CONFIG.rewards.events.find((entry) => entry.id === context.specialEventId || entry.active);
  const eventLabel = event?.label ?? null;
  const resolvedEventMultiplier = event?.multiplier ?? specialEventMultiplier;
  const jackpotTriggered = context.jackpotTriggered ?? (context.randomValue !== undefined && (config.jackpotProbability ?? 0) >= context.randomValue);

  switch (context.gameId) {
    case 'crash': {
      const randomValue = context.randomValue ?? Math.random();
      const crashBias = profile.crashBias ?? 0.55;
      let crashPoint = 1;
      if (randomValue >= crashBias) {
        const remainingProb = (randomValue - crashBias) / (1 - crashBias);
        crashPoint = parseFloat((0.99 / (1 - remainingProb)).toFixed(2));
      }
      const autoCashout = context.autoCashout ?? profile.autoCashoutTarget ?? 1;
      const multiplier = context.multiplier ?? Math.max(0.5, autoCashout);
      const rawPayout = Math.max(0, Math.floor(context.bet * multiplier * (1 - config.houseEdge) * bonusMultiplier * jackpotMultiplier * resolvedEventMultiplier));
      const payout = applyEconomicCaps(rawPayout, context.usage);
      return {
        gameId: context.gameId,
        difficulty,
        houseEdge: config.houseEdge,
        rtp: config.rtp,
        multiplier,
        payout,
        bonusMultiplier,
        jackpotMultiplier,
        specialEventMultiplier: resolvedEventMultiplier,
        specialEvent: eventLabel,
        jackpotTriggered,
        metadata: { crashPoint, crashBias }
      };
    }
    case 'mines': {
      const revealedCount = context.revealedCount ?? 0;
      const multiplier = context.multiplier ?? parseFloat((profile.baseMultiplier! + revealedCount * (profile.multiplierStep ?? 0.35)).toFixed(2));
      const rawPayout = context.isBombHit && multiplier > 1
        ? 0
        : Math.max(0, Math.floor(context.bet * multiplier * (1 - config.houseEdge) * bonusMultiplier * jackpotMultiplier * resolvedEventMultiplier));
      const payout = applyEconomicCaps(rawPayout, context.usage);
      return {
        gameId: context.gameId,
        difficulty,
        houseEdge: config.houseEdge,
        rtp: config.rtp,
        multiplier,
        payout,
        bonusMultiplier,
        jackpotMultiplier,
        specialEventMultiplier: resolvedEventMultiplier,
        specialEvent: eventLabel,
        jackpotTriggered,
        metadata: { revealedCount, mineCount: profile.minesCount }
      };
    }
    case 'plinko': {
      const randomValue = context.randomValue ?? Math.random();
      const bias = profile.plinkoBias ?? 0.52;
      const multiplierTable = config.multiplierTable ?? [1];
      const resolvedFinalPos = context.finalPos ?? (() => {
        let finalPos = 0;
        for (let index = 0; index < multiplierTable.length - 1; index += 1) {
          const goRight = randomValue > bias;
          if (goRight) finalPos += 1;
        }
        return finalPos;
      })();
      const multiplier = context.multiplier ?? multiplierTable[Math.min(resolvedFinalPos, multiplierTable.length - 1)] ?? 1;
      const rawPayout = Math.max(0, Math.floor(context.bet * multiplier * (1 - config.houseEdge) * bonusMultiplier * jackpotMultiplier * resolvedEventMultiplier));
      const payout = applyEconomicCaps(rawPayout, context.usage);
      return {
        gameId: context.gameId,
        difficulty,
        houseEdge: config.houseEdge,
        rtp: config.rtp,
        multiplier,
        payout,
        bonusMultiplier,
        jackpotMultiplier,
        specialEventMultiplier: resolvedEventMultiplier,
        specialEvent: eventLabel,
        jackpotTriggered,
        metadata: { finalPos: resolvedFinalPos, bias }
      };
    }
    case 'quiz': {
      const multiplier = context.multiplier ?? parseFloat((profile.baseMultiplier! + (context.currentStep ?? 0) * (profile.multiplierStep ?? 0.2)).toFixed(2));
      const rawPayout = Math.max(0, Math.floor(context.bet * multiplier * (1 - config.houseEdge) * bonusMultiplier * jackpotMultiplier * resolvedEventMultiplier));
      const payout = applyEconomicCaps(rawPayout, context.usage);
      return {
        gameId: context.gameId,
        difficulty,
        houseEdge: config.houseEdge,
        rtp: config.rtp,
        multiplier,
        payout,
        bonusMultiplier,
        jackpotMultiplier,
        specialEventMultiplier: resolvedEventMultiplier,
        specialEvent: eventLabel,
        jackpotTriggered,
        metadata: { time: profile.time, points: profile.points }
      };
    }
    case 'laser-vault': {
      const multiplier = context.multiplier ?? parseFloat(((profile.baseMultiplier ?? 0.5) + (context.currentStep ?? 0) * (profile.multiplierStep ?? 0.05)).toFixed(2));
      const rawPayout = Math.max(0, Math.floor(context.bet * multiplier * (1 - config.houseEdge) * bonusMultiplier * jackpotMultiplier * resolvedEventMultiplier));
      const payout = applyEconomicCaps(rawPayout, context.usage);
      return {
        gameId: context.gameId,
        difficulty,
        houseEdge: config.houseEdge,
        rtp: config.rtp,
        multiplier,
        payout,
        bonusMultiplier,
        jackpotMultiplier,
        specialEventMultiplier: resolvedEventMultiplier,
        specialEvent: eventLabel,
        jackpotTriggered,
        metadata: { speedFactor: profile.speedFactor, errorPenalty: profile.errorPenalty }
      };
    }
    case 'biometric': {
      const multiplier = context.multiplier ?? parseFloat(((profile.baseMultiplier ?? 0.5) + (context.currentStep ?? 0) * (profile.multiplierStep ?? 0.1)).toFixed(2));
      const rawPayout = Math.max(0, Math.floor(context.bet * multiplier * (1 - config.houseEdge) * bonusMultiplier * jackpotMultiplier * resolvedEventMultiplier));
      const payout = applyEconomicCaps(rawPayout, context.usage);
      return {
        gameId: context.gameId,
        difficulty,
        houseEdge: config.houseEdge,
        rtp: config.rtp,
        multiplier,
        payout,
        bonusMultiplier,
        jackpotMultiplier,
        specialEventMultiplier: resolvedEventMultiplier,
        specialEvent: eventLabel,
        jackpotTriggered,
        metadata: { displayTime: profile.displayTime, gridSize: profile.gridSize }
      };
    }
    default: {
      return {
        gameId: context.gameId,
        difficulty,
        houseEdge: config.houseEdge,
        rtp: config.rtp,
        multiplier: context.multiplier ?? 1,
        payout: 0,
        bonusMultiplier,
        jackpotMultiplier,
        specialEventMultiplier: resolvedEventMultiplier,
        specialEvent: eventLabel,
        jackpotTriggered,
        metadata: {}
      };
    }
  }
}

export function getDailyReward(dayNumber: number, streak = 1, fallbackAmount = 0): DailyRewardProfile | null {
  const reward = ECONOMY_CONFIG.rewards.daily.find((item) => item.id.endsWith(`-${dayNumber}`)) ?? ECONOMY_CONFIG.rewards.daily[dayNumber - 1] ?? null;
  if (!reward) return null;

  const amount = typeof fallbackAmount === 'number' && fallbackAmount > 0 ? fallbackAmount : reward.amount;
  const appliedStreak = Math.max(1, streak);
  return {
    dayNumber,
    rewardAmount: Math.round(amount * (appliedStreak > 1 ? ECONOMY_CONFIG.global.dailyRewardStreakMultiplier : 1) * appliedStreak),
    rewardType: reward.type,
    title: reward.title ?? reward.label,
  };
}

export function getWeeklyReward(weekNumber: number, streak = 1, fallbackAmount = 0): DailyRewardProfile | null {
  const reward = ECONOMY_CONFIG.rewards.weekly[Math.min(weekNumber - 1, ECONOMY_CONFIG.rewards.weekly.length - 1)] ?? null;
  if (!reward) return null;
  const amount = typeof fallbackAmount === 'number' && fallbackAmount > 0 ? fallbackAmount : reward.amount;
  return {
    dayNumber: weekNumber,
    rewardAmount: Math.round(amount * Math.max(1, streak) * (streak > 1 ? ECONOMY_CONFIG.global.weeklyRewardStreakMultiplier : 1)),
    rewardType: reward.type,
    title: reward.title ?? reward.label,
  };
}

export function getMonthlyReward(monthNumber: number, streak = 1, fallbackAmount = 0): DailyRewardProfile | null {
  const reward = ECONOMY_CONFIG.rewards.monthly[Math.min(monthNumber - 1, ECONOMY_CONFIG.rewards.monthly.length - 1)] ?? null;
  if (!reward) return null;
  const amount = typeof fallbackAmount === 'number' && fallbackAmount > 0 ? fallbackAmount : reward.amount;
  return {
    dayNumber: monthNumber,
    rewardAmount: Math.round(amount * Math.max(1, streak) * (streak > 1 ? ECONOMY_CONFIG.global.monthlyRewardStreakMultiplier : 1)),
    rewardType: reward.type,
    title: reward.title ?? reward.label,
  };
}

export function resolveMissionReward(input: MissionRewardInput, streak = 1): RewardResolution {
  const reward = ECONOMY_CONFIG.rewards.missions.find((entry) => entry.id === input.id || entry.label.toLowerCase().includes((input.title ?? '').toLowerCase())) ?? ECONOMY_CONFIG.rewards.missions[0];
  const fallbackAmount = input.reward_amount ?? reward?.amount ?? 0;
  const amount = Math.round((fallbackAmount || reward?.amount || 0) * Math.max(1, streak));
  return {
    amount,
    type: input.reward_type ?? reward?.type ?? 'cp',
    label: reward?.label ?? 'Mission',
    source: 'mission',
    appliedMultiplier: Math.max(1, streak),
  };
}

export function resolveEventReward(eventId: string, fallbackAmount = 0): RewardResolution {
  const event = ECONOMY_CONFIG.rewards.events.find((entry) => entry.id === eventId) ?? ECONOMY_CONFIG.rewards.events[0];
  const amount = Math.round((fallbackAmount || event?.amount || 0) * (event?.multiplier ?? 1));
  return {
    amount,
    type: event?.type ?? 'cp',
    label: event?.label ?? 'Événement',
    source: 'event',
    appliedMultiplier: event?.multiplier ?? 1,
  };
}

export function resolveAchievementReward(achievementId: string, fallbackAmount = 0): RewardResolution {
  const achievement = ECONOMY_CONFIG.rewards.achievements.find((entry) => entry.id === achievementId) ?? ECONOMY_CONFIG.rewards.achievements[0];
  return {
    amount: Math.round((fallbackAmount || achievement?.amount || 0)),
    type: achievement?.type ?? 'cp',
    label: achievement?.label ?? 'Succès',
    source: 'achievement',
    appliedMultiplier: 1,
  };
}

export function resolveTournamentReward(tournamentId: string, fallbackAmount = 0): RewardResolution {
  const tournament = ECONOMY_CONFIG.rewards.tournaments.find((entry) => entry.id === tournamentId) ?? ECONOMY_CONFIG.rewards.tournaments[0];
  return {
    amount: Math.round((fallbackAmount || tournament?.amount || 0)),
    type: tournament?.type ?? 'cp',
    label: tournament?.label ?? 'Tournoi',
    source: 'tournament',
    appliedMultiplier: 1,
  };
}

export function resolveGamePassReward(level: number): RewardResolution {
  const reward = [...ECONOMY_CONFIG.rewards.gamePass].sort((a, b) => a.level - b.level).find((entry) => level >= entry.level) ?? ECONOMY_CONFIG.rewards.gamePass[0];
  return {
    amount: reward.rewardAmount,
    type: reward.rewardType,
    label: `Niveau ${level}`,
    source: 'game-pass',
    appliedMultiplier: 1,
  };
}

export function createEconomicHistoryEntry(type: EconomicHistoryEntry['type'], amount: number, label: string, detail: string): EconomicHistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type,
    amount,
    label,
    detail,
    created_at: new Date().toISOString(),
  };
}

export function buildAdminEconomySnapshot(entries: EconomicHistoryEntry[], fallback: Partial<AdminEconomySnapshot> = {}): AdminEconomySnapshot {
  const createdCp = fallback.createdCp ?? entries.filter((entry) => entry.type === 'deposit' || entry.type === 'reward').reduce((sum, entry) => sum + entry.amount, 0);
  const distributedCp = fallback.distributedCp ?? entries.filter((entry) => entry.type === 'reward' || entry.type === 'game-pass' || entry.type === 'achievement' || entry.type === 'tournament').reduce((sum, entry) => sum + entry.amount, 0);
  const spentCp = fallback.spentCp ?? entries.filter((entry) => entry.type === 'loss' || entry.type === 'purchase').reduce((sum, entry) => sum + entry.amount, 0);
  const withdrawnCp = fallback.withdrawnCp ?? entries.filter((entry) => entry.type === 'withdrawal').reduce((sum, entry) => sum + entry.amount, 0);
  const circulatingCp = Math.max(0, createdCp - distributedCp - spentCp - withdrawnCp);
  const rewardSplit: Record<EconomyRewardType, number> = { cp: 0, diamonds: 0, xp: 0 };
  entries.filter((entry) => entry.type === 'reward').forEach((entry) => {
    if (entry.amount > 0) {
      rewardSplit.cp += entry.amount;
    }
  });

  return {
    createdCp,
    distributedCp,
    spentCp,
    withdrawnCp,
    circulatingCp,
    gameYield: fallback.gameYield ?? {},
    rewardSplit,
    retentionRate: fallback.retentionRate ?? ECONOMY_CONFIG.adminStats.retentionBaseline,
    activityDaily: fallback.activityDaily ?? Math.max(1, entries.length),
    activityWeekly: fallback.activityWeekly ?? Math.max(1, entries.length * 2),
    activityMonthly: fallback.activityMonthly ?? Math.max(1, entries.length * 5),
  };
}

export function getGameEconomySettings(gameId: GameEconomyGameId, difficulty?: GameEconomyDifficulty) {
  return {
    config: getGameEconomyConfig(gameId),
    profile: getGameEconomyDifficulty(gameId, difficulty)
  };
}

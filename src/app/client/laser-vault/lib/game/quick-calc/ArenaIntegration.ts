/**
 * Arena and Rewards Integration
 */

export interface ArenaContext {
  challengeId: string;
  challengeFee: number;
  isArena: boolean;
}

export interface RewardContext {
  cpEarned: number;
  multiplier: number;
  questionsAnswered: number;
  basePoints: number;
}

export function calculateArenaReward(questionsAnswered: number, multiplier: number): number {
  return questionsAnswered * 100 * multiplier;
}

export function calculateCPReward(bet: number, multiplier: number, houseEdge: number = 0.15): number {
  if (multiplier < 1.0) return 0;
  const gross = Math.floor(bet * multiplier);
  return Math.floor(gross * (1 - houseEdge));
}

export async function updateArenaStats(
  supabase: any,
  userId: string,
  challengeId: string,
  totalScore: number,
  attemptsCount: number,
) {
  return supabase
    .from('challenge_attempts')
    .update({
      total_score: totalScore,
      attempts_count: attemptsCount,
      last_attempt_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('challenge_id', challengeId);
}

export async function creditCP(supabase: any, userId: string, amount: number, reason: string) {
  if (amount <= 0) return { success: true };
  return supabase.rpc('jouer_partie_cp', {
    p_user_id: userId,
    p_mise_cp: 0,
    p_gain_cp: amount,
    p_jeu_nom: reason,
  });
}

export async function logGameStatistics(
  supabase: any,
  userId: string,
  gameId: string,
  stats: {
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    maxCombo: number;
    averageTime: number;
    finalMultiplier: number;
  },
) {
  return supabase.from('game_statistics').insert([
    {
      user_id: userId,
      game_id: gameId,
      game_name: 'laser-vault',
      total_questions: stats.totalQuestions,
      correct_answers: stats.correctAnswers,
      wrong_answers: stats.wrongAnswers,
      max_combo: stats.maxCombo,
      average_time_ms: stats.averageTime,
      final_multiplier: stats.finalMultiplier,
      played_at: new Date().toISOString(),
    },
  ]);
}

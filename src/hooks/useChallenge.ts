import { supabase } from '@/lib/supabase';

export const useChallenge = () => {
  const calculateFinalFee = (baseFee: number, vipStatus: string) => {
    if (vipStatus === 'monthly') return baseFee * 0.75;
    if (vipStatus === 'weekly') return baseFee * 0.90;
    return baseFee;
  };

  const startChallengeEntry = async (challengeId: string, userId: string, fee: number) => {
    // 1. Déduire le solde via RPC (process_bet existant)
    const { data: paid, error: payError } = await supabase.rpc('process_bet', { amount: fee });
    
    if (payError || !paid) return { error: "Solde insuffisant" };

    // 2. Enregistrer le paiement
    await supabase.from('challenge_payments').insert([{
      user_id: userId,
      challenge_id: challengeId,
      amount_paid: fee
    }]);

    return { success: true };
  };

  const submitChallengeScore = async (challengeId: string, userId: string, newScore: number) => {
    // Utilisation de upsert pour cumuler le score
    const { data: existing } = await supabase
      .from('challenge_entries')
      .select('total_score, attempts_count')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .single();

    const updatedScore = (existing?.total_score || 0) + newScore;
    const updatedAttempts = (existing?.attempts_count || 0) + 1;

    const { error } = await supabase
      .from('challenge_entries')
      .upsert({
        challenge_id: challengeId,
        user_id: userId,
        total_score: updatedScore,
        attempts_count: updatedAttempts,
        last_played_at: new Date().toISOString()
      }, { onConflict: 'challenge_id,user_id' });

    return { error, updatedScore };
  };

  return { startChallengeEntry, submitChallengeScore, calculateFinalFee };
};

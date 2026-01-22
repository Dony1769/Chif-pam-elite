import { supabase } from '@/lib/supabase';

export const useChallenge = () => {
  const calculateFinalFee = (baseFee: number, vipStatus: string) => {
    if (vipStatus === 'monthly') return baseFee * 0.70; // -30% (Premium)
    if (vipStatus === 'weekly') return baseFee * 0.85;  // -15%
    return baseFee;
  };

  const startChallengePayment = async (challengeId: string, fee: number) => {
    // Utilisation de la nouvelle fonction RPC sécurisée
    const { data, error } = await supabase.rpc('process_challenge_payment', { 
      p_challenge_id: challengeId, 
      p_amount: fee 
    });
    
    if (error) return { error: error.message };
    return { success: true };
  };

  const recordAttempt = async (challengeId: string, userId: string, score: number, feePaid: number) => {
    // On insère une tentative unique. Le score global est géré par SUM() en SQL.
    const { error } = await supabase
      .from('challenge_attempts')
      .insert([{
        challenge_id: challengeId,
        user_id: userId,
        score_gained: score,
        amount_paid: feePaid
      }]);

    return { error };
  };

  return { startChallengePayment, recordAttempt, calculateFinalFee };
};

// hooks/useChallenge.ts
import { supabase } from '@/lib/supabase';

export const useChallenge = () => {
  const startChallengeEntry = async (challengeId: string, userId: string, fee: number) => {
    // 1. Vérification et débit
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
    if (!profile || profile.balance < fee) return { error: "Solde insuffisant" };

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ balance: profile.balance - fee })
      .eq('id', userId);

    if (updateError) return { error: "Erreur lors du paiement" };

    // 2. Inscription au défi (Upsert pour permettre plusieurs essais si l'admin l'autorise)
    const { data: entry, error: entryError } = await supabase
      .from('challenge_entries')
      .upsert({ 
        challenge_id: challengeId, 
        user_id: userId, 
        last_attempt_at: new Date().toISOString() 
      }, { onConflict: 'challenge_id,user_id' })
      .select().single();

    if (entryError) return { error: "Erreur d'inscription" };

    // 3. Log de transaction pour ton suivi
    await supabase.from('transactions').insert({
      user_id: userId,
      amount: -fee,
      type: 'challenge_fee',
      description: `Entrée défi: ${challengeId}`
    });

    return { entry, error: null };
  };

  const submitChallengeScore = async (challengeId: string, userId: string, score: number) => {
    const { data: entry } = await supabase
      .from('challenge_entries')
      .select('best_score')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .single();

    if (score > (entry?.best_score || 0)) {
      await supabase
        .from('challenge_entries')
        .update({ best_score: score })
        .eq('challenge_id', challengeId)
        .eq('user_id', userId);
    }
  };

  return { startChallengeEntry, submitChallengeScore };
};

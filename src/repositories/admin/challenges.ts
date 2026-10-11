import { getSupabaseAdminClient } from '@/server/supabase/admin';
import { type ValidChallengeCreateInput } from '@/validators/challenges';

export async function insertChallenge(input: ValidChallengeCreateInput) {
  const supabaseAdmin = getSupabaseAdminClient();

  return supabaseAdmin.from('challenges').insert([
    {
      title: input.title,
      game_type: input.game_type,
      entry_fee_cp_base: input.entry_fee_cp_base,
      prize_pool_cp: input.prize_pool_cp,
      max_participants: input.max_participants,
      ends_at: input.ends_at,
      is_active: true,
    },
  ]);
}

export async function closeChallengeById(challengeId: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  return supabaseAdmin.from('challenges').update({ is_active: false }).eq('id', challengeId);
}

export async function deleteChallengeById(challengeId: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  return supabaseAdmin.from('challenges').delete().eq('id', challengeId);
}

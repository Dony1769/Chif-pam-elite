import { getSupabaseAdminClient } from '@/server/supabase/admin';

export async function updateGameSettingStatus(gameId: string, isActive: boolean) {
  const supabaseAdmin = getSupabaseAdminClient();
  return supabaseAdmin
    .from('game_settings')
    .update({ is_active: isActive })
    .eq('game_id', gameId);
}

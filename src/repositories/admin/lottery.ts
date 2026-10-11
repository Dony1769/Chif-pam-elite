import { getSupabaseAdminClient } from '@/server/supabase/admin';
import { type ValidLotteryOpenInput } from '@/validators/lottery';

type TirageRecord = {
  id: string;
  chiffre_gagnant: string;
  status: string;
};

type PendingMise = {
  id: string;
  user_id: string;
  chiffre_choisi: string;
  montant: number;
  multiplicateur_moment: number;
};

export async function getOpenTirage() {
  const supabaseAdmin = getSupabaseAdminClient();
  return supabaseAdmin
    .from('tirages')
    .select('*')
    .eq('status', 'ouvert')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function createTirage(input: ValidLotteryOpenInput, chiffreGagnant: string, chiffresVisibles: string[]) {
  const supabaseAdmin = getSupabaseAdminClient();
  return supabaseAdmin
    .from('tirages')
    .insert([
      {
        moment: input.moment,
        chiffre_gagnant: chiffreGagnant,
        chiffres_visibles: chiffresVisibles,
        multiplicateur: input.multiplicateur,
        status: 'ouvert',
      },
    ])
    .select('*')
    .single();
}

export async function getTirageById(tirageId: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  return supabaseAdmin
    .from('tirages')
    .select('id, chiffre_gagnant, status')
    .eq('id', tirageId)
    .single<TirageRecord>();
}

export async function closeTirage(tirageId: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  return supabaseAdmin
    .from('tirages')
    .update({ status: 'termine' })
    .eq('id', tirageId);
}

export async function getPendingMisesByTirage(tirageId: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  return supabaseAdmin
    .from('mises')
    .select('id,user_id,chiffre_choisi,montant,multiplicateur_moment')
    .eq('tirage_id', tirageId)
    .eq('status', 'en_attente')
    .returns<PendingMise[]>();
}

export async function settleMise(miseId: string, status: 'gagné' | 'perdu', gainReel: number) {
  const supabaseAdmin = getSupabaseAdminClient();
  return supabaseAdmin
    .from('mises')
    .update({ status, gain_reel: gainReel })
    .eq('id', miseId);
}

export async function incrementUserBalance(userId: string, amount: number) {
  const supabaseAdmin = getSupabaseAdminClient();
  return supabaseAdmin.rpc('increment_balance', {
    user_id: userId,
    amount,
  });
}

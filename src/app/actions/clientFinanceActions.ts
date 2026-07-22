"use server";

import { getSupabaseAdminClient } from '@/server/supabase/admin';
import { requireUserSession } from '@/server/user/auth';
import { validateDepositInput, validateWithdrawalInput } from '@/validators/finance';

type ActionResult = {
  success: boolean;
  message: string;
};

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erreur inconnue';
}

export async function submitDepositTransaction(amount: number, method: string, proofUrl: string): Promise<ActionResult> {
  try {
    const session = await requireUserSession();
    if (!session.ok) {
      return { success: false, message: session.message };
    }

    const validation = validateDepositInput({ amount, method, proofUrl });
    if (!validation.ok) {
      return { success: false, message: validation.message };
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { error } = await supabaseAdmin.from('transactions').insert({
      user_id: session.userId,
      type: 'deposit',
      amount,
      proof_url: proofUrl,
      method: validation.method,
      status: 'pending',
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Dépôt envoyé ! Validation en cours.' };
  } catch (err: unknown) {
    return { success: false, message: getErrorMessage(err) };
  }
}

export async function submitWithdrawalTransaction(amount: number, method: string, phoneNumber: string): Promise<ActionResult> {
  try {
    const session = await requireUserSession();
    if (!session.ok) {
      return { success: false, message: session.message };
    }

    const validation = validateWithdrawalInput({ amount, method, phone: phoneNumber });
    if (!validation.ok) {
      return { success: false, message: validation.message };
    }

    const supabaseAdmin = getSupabaseAdminClient();

    const { error: rpcError } = await supabaseAdmin.rpc('initiate_withdrawal', {
      user_id_param: session.userId,
      amount_param: amount,
    });
    if (rpcError) {
      return { success: false, message: rpcError.message };
    }

    const { error: insertError } = await supabaseAdmin.from('transactions').insert({
      user_id: session.userId,
      type: 'withdrawal',
      amount,
      phone_number: phoneNumber.trim(),
      method: validation.method,
      status: 'pending',
    });
    if (insertError) {
      return { success: false, message: insertError.message };
    }

    return { success: true, message: 'Demande de retrait enregistrée.' };
  } catch (err: unknown) {
    return { success: false, message: getErrorMessage(err) };
  }
}

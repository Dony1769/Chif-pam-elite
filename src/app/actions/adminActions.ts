"use server";

import { requireAdminSession } from '@/server/admin/auth';
import { getSupabaseAdminClient } from '@/server/supabase/admin';
import { closeChallengeById, deleteChallengeById, insertChallenge } from '@/repositories/admin/challenges';
import { updateGameSettingStatus } from '@/repositories/admin/game-settings';
import {
  closeTirage,
  createTirage,
  getOpenTirage,
  getPendingMisesByTirage,
  getTirageById,
  incrementUserBalance,
  settleMise,
} from '@/repositories/admin/lottery';
import { validateChallengeCreateInput, type ChallengeCreateInput } from '@/validators/challenges';
import { isValidAdminGameId } from '@/validators/admin-games';
import { validateLotteryOpenInput, validateLotterySessionId } from '@/validators/lottery';
import {
  isUuid,
  sanitizeAdminNote,
  sanitizeBanReason,
  sanitizeCode,
  validateBalance,
  validateIntegerInRange,
  validatePassword,
  validatePositiveAmount,
  validateRequiredText,
} from '@/lib/validation';

const supabaseAdmin = getSupabaseAdminClient();

type ActionResult<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
};

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erreur inconnue';
}

type MarketPackInput = {
  nom: string;
  prix_htg: number;
  jetons_quantite: number;
  bonus_star_pourcent: number;
};

export async function adminResetPassword(targetUserId: string, newPassword: string) {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    if (!isUuid(targetUserId)) {
      return { success: false, message: 'Identifiant utilisateur invalide.' };
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.ok) {
      return { success: false, message: passwordCheck.message || 'Mot de passe invalide.' };
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (error) throw error;

    return { success: true, message: "Mot de passe mis à jour avec succès." };
  } catch (err: unknown) {
    return { success: false, message: "Erreur serveur : " + getErrorMessage(err) };
  }
}

export async function adminSetUserBanStatus(
  targetUserId: string,
  shouldBan: boolean,
  banReason: string | null
): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    if (!isUuid(targetUserId)) {
      return { success: false, message: 'Identifiant utilisateur invalide.' };
    }

    if (adminSession.userId === targetUserId) {
      return { success: false, message: "Action interdite sur votre propre compte administrateur." };
    }

    const cleanReason = sanitizeBanReason(banReason);

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        is_banned: shouldBan,
        ban_reason: shouldBan ? (cleanReason || 'Non spécifié') : null,
      })
      .eq('id', targetUserId);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: shouldBan ? 'Compte suspendu.' : 'Compte réactivé.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminSetUserBalance(
  targetUserId: string,
  newBalance: number
): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    if (!isUuid(targetUserId)) {
      return { success: false, message: 'Identifiant utilisateur invalide.' };
    }

    const balanceCheck = validateBalance(newBalance);
    if (!balanceCheck.ok) {
      return { success: false, message: balanceCheck.message || 'Solde invalide.' };
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', targetUserId);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Solde mis à jour.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminProcessTransaction(
  transactionId: string,
  decision: 'approved' | 'rejected',
  adminNote: string
): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    if (!isUuid(transactionId)) {
      return { success: false, message: 'Transaction invalide.' };
    }

    if (!['approved', 'rejected'].includes(decision)) {
      return { success: false, message: 'Décision invalide.' };
    }

    const cleanNote = sanitizeAdminNote(adminNote || '');

    const { data, error } = await supabaseAdmin.rpc('admin_process_finance_transaction', {
      p_transaction_id: transactionId,
      p_decision: decision,
      p_admin_note: cleanNote,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    const result = data as { success?: boolean; message?: string } | null;
    return {
      success: result?.success ?? false,
      message: result?.message || 'Transaction traitée.',
    };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminCreateCoupon(code: string, amount: number): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    const normalizedCode = sanitizeCode(code);
    const codeCheck = validateRequiredText(normalizedCode, 'Le code', 40);
    if (!codeCheck.ok) {
      return { success: false, message: codeCheck.message || 'Code invalide.' };
    }

    const amountCheck = validatePositiveAmount(amount, 'Le montant');
    if (!amountCheck.ok) {
      return { success: false, message: amountCheck.message || 'Montant invalide.' };
    }

    const { error } = await supabaseAdmin
      .from('coupons')
      .insert([{ code: normalizedCode, amount }]);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Coupon créé.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminToggleCouponStatus(couponId: string, currentStatus: boolean): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    if (!isUuid(couponId)) {
      return { success: false, message: 'Identifiant coupon invalide.' };
    }

    const { error } = await supabaseAdmin
      .from('coupons')
      .update({ is_active: !currentStatus })
      .eq('id', couponId);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Statut coupon mis à jour.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminCreateMarketPack(input: MarketPackInput): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    const nameCheck = validateRequiredText(input.nom, 'Le nom du pack', 80);
    if (!nameCheck.ok) {
      return { success: false, message: nameCheck.message || 'Nom invalide.' };
    }

    const priceCheck = validatePositiveAmount(input.prix_htg, 'Le prix');
    if (!priceCheck.ok) {
      return { success: false, message: priceCheck.message || 'Prix invalide.' };
    }

    const quantityCheck = validateIntegerInRange(input.jetons_quantite, 'La quantité de jetons', 1, 1_000_000_000);
    if (!quantityCheck.ok) {
      return { success: false, message: quantityCheck.message || 'Quantité invalide.' };
    }

    const bonusCheck = validateIntegerInRange(input.bonus_star_pourcent, 'Le bonus star', 0, 1000);
    if (!bonusCheck.ok) {
      return { success: false, message: bonusCheck.message || 'Bonus invalide.' };
    }

    const { error } = await supabaseAdmin
      .from('boutique_packs')
      .insert([
        {
          nom: input.nom.trim(),
          prix_htg: input.prix_htg,
          jetons_quantite: input.jetons_quantite,
          bonus_star_pourcent: input.bonus_star_pourcent,
        },
      ]);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Pack créé.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminToggleMarketPackStatus(packId: string, currentStatus: boolean): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    if (!isUuid(packId)) {
      return { success: false, message: 'Identifiant pack invalide.' };
    }

    const { error } = await supabaseAdmin
      .from('boutique_packs')
      .update({ active: !currentStatus })
      .eq('id', packId);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Statut pack mis à jour.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminDeleteMarketPack(packId: string): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    if (!isUuid(packId)) {
      return { success: false, message: 'Identifiant pack invalide.' };
    }

    const { error } = await supabaseAdmin
      .from('boutique_packs')
      .delete()
      .eq('id', packId);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Pack supprimé.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminBroadcastNotification(title: string, message: string): Promise<ActionResult<{ sentTo: number }>> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    const titleCheck = validateRequiredText(title, 'Le titre', 120);
    if (!titleCheck.ok) {
      return { success: false, message: titleCheck.message || 'Titre invalide.' };
    }

    const messageCheck = validateRequiredText(message, 'Le message', 2000);
    if (!messageCheck.ok) {
      return { success: false, message: messageCheck.message || 'Message invalide.' };
    }

    const { data: users, error: userError } = await supabaseAdmin.from('profiles').select('id');
    if (userError) {
      return { success: false, message: userError.message };
    }

    if (!users || users.length === 0) {
      return { success: true, message: 'Aucun utilisateur cible.', data: { sentTo: 0 } };
    }

    const payload = users.map((u) => ({
      user_id: u.id,
      title: title.trim().toUpperCase(),
      content: message.trim(),
      is_read: false,
      type: 'system',
    }));

    const { error: insertError } = await supabaseAdmin.from('notifications').insert(payload);
    if (insertError) {
      return { success: false, message: insertError.message };
    }

    return { success: true, message: 'Diffusion enregistrée.', data: { sentTo: users.length } };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminMarkMessagesRead(targetUserId: string): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    if (!isUuid(targetUserId)) {
      return { success: false, message: 'Identifiant utilisateur invalide.' };
    }

    const { error } = await supabaseAdmin
      .from('messages')
      .update({ is_read_by_admin: true })
      .eq('user_id', targetUserId)
      .eq('is_admin_message', false);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Messages marqués comme lus.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminSendChatReply(targetUserId: string, content: string): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    if (!isUuid(targetUserId)) {
      return { success: false, message: 'Identifiant utilisateur invalide.' };
    }

    const contentCheck = validateRequiredText(content, 'Le message', 4000);
    if (!contentCheck.ok) {
      return { success: false, message: contentCheck.message || 'Message invalide.' };
    }

    const { error } = await supabaseAdmin.from('messages').insert({
      content: content.trim(),
      user_id: targetUserId,
      is_admin_message: true,
      is_read_by_admin: true,
      is_read_by_client: false,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Réponse envoyée.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminCreateChallenge(input: ChallengeCreateInput): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    const validationResult = validateChallengeCreateInput(input);
    if (!validationResult.ok) {
      return { success: false, message: validationResult.message };
    }

    const { error } = await insertChallenge(validationResult.value);
    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Mission créée.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminCloseChallenge(challengeId: string): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    if (!isUuid(challengeId)) {
      return { success: false, message: 'Identifiant mission invalide.' };
    }

    const { error } = await closeChallengeById(challengeId);
    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Mission clôturée.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminDeleteChallenge(challengeId: string): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    if (!isUuid(challengeId)) {
      return { success: false, message: 'Identifiant mission invalide.' };
    }

    const { error } = await deleteChallengeById(challengeId);
    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Mission supprimée.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

export async function adminOpenLotterySession(moment: string, multiplicateur: number): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    const openInput = validateLotteryOpenInput({ moment, multiplicateur });
    if (!openInput.ok) {
      return { success: false, message: openInput.message };
    }

    const { data: existingOpen, error: openCheckError } = await getOpenTirage();
    if (openCheckError) {
      return { success: false, message: openCheckError.message };
    }
    if (existingOpen) {
      return { success: false, message: "Une session est déjà ouverte dans la base de données. Fermez-la d'abord." };
    }

    const numGagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const pool = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
      .filter((n) => n !== numGagnant)
      .sort(() => Math.random() - 0.5)
      .slice(0, 9);
    const grilleVisible = [...pool, numGagnant].sort(() => Math.random() - 0.5);

    const { data, error } = await createTirage(openInput.value, numGagnant, grilleVisible);
    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: `Session ${openInput.value.moment} ouverte avec succès !`, data };
  } catch (err: unknown) {
    return { success: false, message: "Erreur lors de l'ouverture : " + getErrorMessage(err) };
  }
}

export async function adminCloseLotterySession(tirageId: string): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    const sessionIdCheck = validateLotterySessionId(tirageId);
    if (!sessionIdCheck.ok) {
      return { success: false, message: sessionIdCheck.message };
    }

    const { data: tirage, error: tirageError } = await getTirageById(tirageId);
    if (tirageError || !tirage) {
      return { success: false, message: 'Session introuvable.' };
    }
    if (tirage.status !== 'ouvert') {
      return { success: false, message: 'La session est déjà fermée.' };
    }

    const { error: closeError } = await closeTirage(tirageId);
    if (closeError) {
      return { success: false, message: closeError.message };
    }

    const { data: mises, error: misesError } = await getPendingMisesByTirage(tirageId);
    if (misesError) {
      return { success: false, message: misesError.message };
    }

    if (mises && mises.length > 0) {
      for (const mise of mises) {
        const gagne = mise.chiffre_choisi === tirage.chiffre_gagnant;
        const gain = gagne ? (Number(mise.montant) * Number(mise.multiplicateur_moment)) : 0;

        const { error: settleError } = await settleMise(mise.id, gagne ? 'gagné' : 'perdu', gain);
        if (settleError) {
          return { success: false, message: settleError.message };
        }

        if (gagne && gain > 0) {
          const { error: creditError } = await incrementUserBalance(mise.user_id, gain);
          if (creditError) {
            return { success: false, message: creditError.message };
          }
        }
      }
    }

    return { success: true, message: 'Session fermée manuellement. Tout est en ordre.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur lors de la clôture : ' + getErrorMessage(err) };
  }
}

export async function adminToggleMiniGameStatus(gameId: string, currentStatus: boolean): Promise<ActionResult> {
  try {
    const adminSession = await requireAdminSession();
    if (!adminSession.ok) {
      return { success: false, message: adminSession.message };
    }

    if (!isValidAdminGameId(gameId)) {
      return { success: false, message: 'Jeu invalide.' };
    }

    const { error } = await updateGameSettingStatus(gameId, !currentStatus);
    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Statut du jeu mis à jour.' };
  } catch (err: unknown) {
    return { success: false, message: 'Erreur serveur : ' + getErrorMessage(err) };
  }
}

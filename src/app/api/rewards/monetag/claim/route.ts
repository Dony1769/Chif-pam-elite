import { NextResponse } from 'next/server';
import { requireUserSession } from '@/server/user/auth';
import { getSupabaseAdminClient } from '@/server/supabase/admin';
import { isSameOriginRequest, verifySignedValue } from '@/lib/security';

type ClaimPayload = {
  claimId?: string;
  token?: string;
};

const MIN_ELAPSED_SECONDS = 12;

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ success: false, message: 'Requete non autorisee.' }, { status: 403 });
    }

    const session = await requireUserSession();
    if (!session.ok) {
      return NextResponse.json({ success: false, message: session.message }, { status: 401 });
    }

    const body = (await request.json()) as ClaimPayload;
    const claimId = String(body.claimId ?? '');
    const token = String(body.token ?? '');

    if (!claimId || !token) {
      return NextResponse.json({ success: false, message: 'Demande invalide.' }, { status: 400 });
    }

    const secret = process.env.REWARDED_AD_SECRET;
    if (!secret) {
      return NextResponse.json({ success: false, message: 'Secret serveur manquant.' }, { status: 500 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    const { data: claim, error: claimReadError } = await supabaseAdmin
      .from('ad_reward_claims')
      .select('id, user_id, status, nonce, expires_at, started_at')
      .eq('id', claimId)
      .eq('user_id', session.userId)
      .maybeSingle();

    if (claimReadError || !claim) {
      return NextResponse.json({ success: false, message: 'Session publicitaire introuvable.' }, { status: 404 });
    }

    if (claim.status !== 'started') {
      return NextResponse.json({ success: false, message: 'Session deja utilisee.' }, { status: 409 });
    }

    const now = Date.now();
    const startedAt = new Date(claim.started_at).getTime();
    const expiresAt = new Date(claim.expires_at).getTime();

    if (now > expiresAt) {
      return NextResponse.json({ success: false, message: 'Session expiree.' }, { status: 410 });
    }

    if (now - startedAt < MIN_ELAPSED_SECONDS * 1000) {
      return NextResponse.json(
        { success: false, message: 'Delai minimum de visionnage non atteint.' },
        { status: 429 }
      );
    }

    const signaturePayload = `${claim.id}:${session.userId}:${claim.nonce}:${claim.expires_at}`;
    const validToken = verifySignedValue(signaturePayload, token, secret);

    if (!validToken) {
      return NextResponse.json({ success: false, message: 'Jeton invalide.' }, { status: 403 });
    }

    const { data: result, error: rewardError } = await supabaseAdmin.rpc('grant_rewarded_ad_bonus', {
      p_claim_id: claim.id,
      p_user_id: session.userId,
    });

    if (rewardError) {
      return NextResponse.json({ success: false, message: 'Attribution de recompense impossible.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rewards: result ?? { diamonds: 5, xp: 10 },
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Erreur serveur inattendue.' }, { status: 500 });
  }
}

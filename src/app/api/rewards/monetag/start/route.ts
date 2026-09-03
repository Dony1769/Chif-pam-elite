import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireUserSession } from '@/server/user/auth';
import { getSupabaseAdminClient } from '@/server/supabase/admin';
import { isSameOriginRequest, signValue } from '@/lib/security';

const AD_URL = 'https://omg10.com/4/11431323';
const CLAIM_TTL_SECONDS = 600;
const CLAIM_COOLDOWN_SECONDS = 300;

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ success: false, message: 'Requete non autorisee.' }, { status: 403 });
    }

    const session = await requireUserSession();
    if (!session.ok) {
      return NextResponse.json({ success: false, message: session.message }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    const { data: recentCompleted } = await supabaseAdmin
      .from('ad_reward_claims')
      .select('claimed_at')
      .eq('user_id', session.userId)
      .eq('status', 'completed')
      .order('claimed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentCompleted?.claimed_at) {
      const elapsedMs = Date.now() - new Date(recentCompleted.claimed_at).getTime();
      if (elapsedMs < CLAIM_COOLDOWN_SECONDS * 1000) {
        const waitSeconds = Math.ceil((CLAIM_COOLDOWN_SECONDS * 1000 - elapsedMs) / 1000);
        return NextResponse.json(
          {
            success: false,
            message: `Veuillez patienter ${waitSeconds}s avant une nouvelle recompense.`,
          },
          { status: 429 }
        );
      }
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + CLAIM_TTL_SECONDS * 1000);
    const nonce = randomUUID();

    const { data: claim, error: claimError } = await supabaseAdmin
      .from('ad_reward_claims')
      .insert({
        user_id: session.userId,
        provider: 'monetag',
        status: 'started',
        nonce,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select('id, nonce, expires_at')
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ success: false, message: 'Creation de session publicitaire impossible.' }, { status: 500 });
    }

    const secret = process.env.REWARDED_AD_SECRET;
    if (!secret) {
      return NextResponse.json({ success: false, message: 'Secret serveur manquant.' }, { status: 500 });
    }

    const signaturePayload = `${claim.id}:${session.userId}:${claim.nonce}:${claim.expires_at}`;
    const token = signValue(signaturePayload, secret);

    return NextResponse.json({
      success: true,
      claimId: claim.id,
      token,
      adUrl: AD_URL,
      expiresAt: claim.expires_at,
      minWaitSeconds: 12,
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Erreur serveur inattendue.' }, { status: 500 });
  }
}

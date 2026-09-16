import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/server/supabase/admin';
import { isSameOriginRequest } from '@/lib/security';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_INTERVAL_MS = 2 * 60 * 1000;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: 'Requête non autorisée.' }, { status: 403 });
  }
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ success: false, message: 'Session requise.' }, { status: 401 });

  try {
    const body = (await request.json()) as { email?: string };
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ success: false, message: 'Adresse email invalide.' }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ success: false, message: 'Session expirée.' }, { status: 401 });

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email_verification_last_sent_at')
      .eq('id', authData.user.id)
      .single();
    if (profileError || !profile) return NextResponse.json({ success: false, message: 'Profil introuvable.' }, { status: 404 });

    const lastSent = profile.email_verification_last_sent_at ? new Date(profile.email_verification_last_sent_at).getTime() : 0;
    if (Date.now() - lastSent < RESEND_INTERVAL_MS) {
      return NextResponse.json({ success: false, message: 'Un email vient déjà d’être envoyé. Réessayez dans deux minutes.' }, { status: 429 });
    }

    const { data: existing, error: existingError } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .neq('id', authData.user.id)
      .maybeSingle();
    if (existingError) return NextResponse.json({ success: false, message: 'Impossible de vérifier cet email.' }, { status: 503 });
    if (existing) return NextResponse.json({ success: false, message: 'Cet email est déjà associé à un autre compte.' }, { status: 409 });

    const { error: timestampError } = await admin
      .from('profiles')
      .update({ email_verification_last_sent_at: new Date().toISOString() })
      .eq('id', authData.user.id);
    if (timestampError) return NextResponse.json({ success: false, message: 'Impossible de préparer la confirmation.' }, { status: 500 });

    return NextResponse.json({ success: true, email });
  } catch {
    return NextResponse.json({ success: false, message: 'Erreur serveur inattendue.' }, { status: 500 });
  }
}
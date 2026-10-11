import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/server/supabase/admin';
import { requireUserSession } from '@/server/user/auth';
import { normalizePhoneNumber } from '@/lib/phone';
import { isSameOriginRequest } from '@/lib/security';

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false, message: 'Requete non autorisee.' }, { status: 403 });
  const session = await requireUserSession();
  if (!session.ok) return NextResponse.json({ success: false, message: session.message }, { status: 401 });
  try {
    const body = (await request.json()) as { phone?: string };
    const phone = normalizePhoneNumber(String(body.phone ?? ''));
    const admin = getSupabaseAdminClient();
    const { data: existing } = await admin.from('profiles').select('id').eq('phone', phone).neq('id', session.userId).maybeSingle();
    if (existing) return NextResponse.json({ success: false, message: 'Ce numéro est déjà associé à un compte.' }, { status: 409 });
    const { error } = await admin.from('profiles').update({ phone }).eq('id', session.userId);
    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    return NextResponse.json({ success: true, phone });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Numéro invalide.' }, { status: 400 });
  }
}
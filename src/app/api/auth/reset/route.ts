import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/server/supabase/admin';
import { normalizePhoneNumber } from '@/lib/phone';
import { isSameOriginRequest } from '@/lib/security';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false, message: 'Requete non autorisee.' }, { status: 403 });
  try {
    const body = (await request.json()) as { phone?: string };
    const phone = normalizePhoneNumber(String(body.phone ?? ''));
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.from('profiles').select('id, email').eq('phone', phone).maybeSingle();
    if (error || !data) return NextResponse.json({ success: false, message: 'Numéro introuvable.' }, { status: 404 });
    return NextResponse.json({ success: true, userId: data.id, email: data.email, message: 'Numéro normalisé. Le flux OTP peut continuer.' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Numéro invalide.' }, { status: 400 });
  }
}
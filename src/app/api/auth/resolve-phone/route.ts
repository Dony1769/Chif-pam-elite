import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/server/supabase/admin';
import { normalizePhoneNumber, phoneDigits } from '@/lib/phone';
import { isSameOriginRequest } from '@/lib/security';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false, message: 'Requete non autorisee.' }, { status: 403 });
  try {
    const body = (await request.json()) as { phone?: string };
    const phone = normalizePhoneNumber(String(body.phone ?? ''));
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.from('profiles').select('id').eq('phone', phone).maybeSingle();
    if (error) return NextResponse.json({ success: false, message: 'Impossible de vérifier le numéro.' }, { status: 500 });
    if (!data) return NextResponse.json({ success: false, message: 'Numéro ou mot de passe incorrect.' }, { status: 401 });
    return NextResponse.json({ success: true, email: `${phoneDigits(phone)}@chifpam.ht` });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Numéro invalide.' }, { status: 400 });
  }
}
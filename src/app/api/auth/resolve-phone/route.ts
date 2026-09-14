import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/server/supabase/admin';
import { normalizePhoneNumber } from '@/lib/phone';
import { isSameOriginRequest } from '@/lib/security';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false, message: 'Requete non autorisee.' }, { status: 403 });
  try {
    const body = (await request.json()) as { phone?: string };
    const rawPhone = String(body.phone ?? '');
    if (!/^\d{8}$/.test(rawPhone) && !/^509\d{8}$/.test(rawPhone) && !/^\+509\d{8}$/.test(rawPhone)) {
      return NextResponse.json({ success: false, message: 'Le numéro de téléphone doit contenir exactement 8 chiffres.' }, { status: 400 });
    }
    const phone = normalizePhoneNumber(rawPhone);
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.from('profiles').select('id, email').eq('phone', phone).maybeSingle();
    if (error) return NextResponse.json({ success: false, message: 'Impossible de vérifier le numéro.' }, { status: 500 });
    if (!data?.email) return NextResponse.json({ success: false, message: 'Compte sans identifiant de connexion valide.' }, { status: 401 });
    return NextResponse.json({ success: true, email: data.email });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Numéro invalide.' }, { status: 400 });
  }
}
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/server/supabase/admin';
import { normalizePhoneNumber, phoneDigits } from '@/lib/phone';
import { isSameOriginRequest } from '@/lib/security';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false, message: 'Requete non autorisee.' }, { status: 403 });
  try {
    const body = (await request.json()) as { phone?: string };
    const rawPhone = String(body.phone ?? '');
    let phone: string;
    try {
      phone = normalizePhoneNumber(rawPhone);
    } catch {
      return NextResponse.json({ success: false, message: 'Le numéro de téléphone doit contenir 8 chiffres ou un format international valide.' }, { status: 400 });
    }
    const admin = getSupabaseAdminClient();
    const digits = phoneDigits(phone);
    const { data: candidates, error } = await admin
      .from('profiles')
      .select('id, email, phone')
      .ilike('phone', `%${digits}`)
      .limit(10);

    if (error) {
      console.error('[auth/resolve-phone] profile lookup failed', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
        phoneDigits: digits,
      });
      return NextResponse.json({ success: false, message: 'Impossible de vérifier le numéro pour le moment. Réessayez.' }, { status: 500 });
    }

    const matches = (candidates ?? []).filter((candidate) => {
      try {
        return normalizePhoneNumber(String(candidate.phone ?? '')) === phone;
      } catch {
        return false;
      }
    });

    if (matches.length > 1) {
      console.error('[auth/resolve-phone] duplicate normalized phone', { phoneDigits: digits, matchCount: matches.length });
      return NextResponse.json({ success: false, message: 'Ce numéro est associé à plusieurs comptes. Contactez le support.' }, { status: 409 });
    }

    const data = matches[0];
    if (!data?.email) return NextResponse.json({ success: false, message: 'Numéro ou mot de passe incorrect.' }, { status: 401 });
    return NextResponse.json({ success: true, email: data.email });
  } catch (error) {
    console.error('[auth/resolve-phone] unexpected failure', error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Numéro invalide.' }, { status: 400 });
  }
}
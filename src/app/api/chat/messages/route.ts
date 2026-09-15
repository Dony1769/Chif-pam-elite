import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/server-supabase';
import { isSameOriginRequest, sanitizePlainText } from '@/lib/security';
import { isAdminRole } from '@/lib/auth-routing';

type SendMessagePayload = {
  clientId?: string;
  content?: string;
  asAdmin?: boolean;
};

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ success: false, message: 'Requete non autorisee.' }, { status: 403 });
    }

    const db = await supabaseServer();

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: 'Session invalide.' }, { status: 401 });
    }

    const body = (await request.json()) as SendMessagePayload;
    const content = sanitizePlainText(String(body.content ?? ''), 1000);
    const asAdmin = Boolean(body.asAdmin);

    if (!content) {
      return NextResponse.json({ success: false, message: 'Message vide.' }, { status: 400 });
    }

    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = isAdminRole(profile?.role);

    if (asAdmin && !isAdmin) {
      return NextResponse.json({ success: false, message: 'Permissions insuffisantes.' }, { status: 403 });
    }

    const userId = asAdmin ? String(body.clientId ?? '') : user.id;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Client cible manquant.' }, { status: 400 });
    }

    const { data, error } = await db
      .from('messages')
      .insert({
        user_id: userId,
        content,
        is_admin_message: asAdmin,
        is_read_by_admin: asAdmin,
        is_read_by_client: !asAdmin,
      })
      .select('id, user_id, content, created_at, is_admin_message, is_read_by_admin, is_read_by_client')
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: 'Envoi impossible.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: data });
  } catch {
    return NextResponse.json({ success: false, message: 'Erreur serveur inattendue.' }, { status: 500 });
  }
}

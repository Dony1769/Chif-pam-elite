import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/server/supabase/admin';
import { normalizePhoneNumber } from '@/lib/phone';
import { isSameOriginRequest, sanitizePlainText } from '@/lib/security';

type SignupPayload = {
  phone?: string;
  password?: string;
  username?: string;
  email?: string;
  referralCode?: string;
};

function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 72;
}

function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_\-. ]{3,24}$/.test(username);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ success: false, message: 'Requete non autorisee.' }, { status: 403 });
    }

    const body = (await request.json()) as SignupPayload;

    const rawPhone = String(body.phone ?? '').replace(/\s/g, '');
    if (!/^\d{8}$/.test(rawPhone) && !/^\+509\d{8}$/.test(rawPhone)) {
      return NextResponse.json({ success: false, message: 'Numero invalide. 8 chiffres requis.' }, { status: 400 });
    }

    let phone: string;
    try {
      phone = normalizePhoneNumber(rawPhone);
    } catch (error) {
      return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Numero invalide.' }, { status: 400 });
    }
    const password = String(body.password ?? '');
    const username = sanitizePlainText(String(body.username ?? ''), 24);
    const email = String(body.email ?? '').trim().toLowerCase();
    const referralCode = sanitizePlainText(String(body.referralCode ?? ''), 24).toUpperCase();

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { success: false, message: 'Mot de passe invalide. Utilisez 8 a 72 caracteres.' },
        { status: 400 }
      );
    }

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { success: false, message: 'Pseudo invalide. 3 a 24 caracteres alphanumeriques.' },
        { status: 400 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: 'Adresse email invalide.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data: existingProfile, error: uniquenessError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('phone', phone)
      .maybeSingle();
    if (uniquenessError) {
      return NextResponse.json({ success: false, message: 'Impossible de vérifier ce numéro pour le moment. Réessayez.' }, { status: 503 });
    }
    if (existingProfile) {
      return NextResponse.json({ success: false, message: 'Ce numéro est déjà associé à un compte. Connectez-vous ou utilisez le reset du mot de passe.' }, { status: 409 });
    }
    const { data: existingEmail, error: emailLookupError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (emailLookupError) {
      return NextResponse.json({ success: false, message: 'Impossible de vérifier cet email pour le moment. Réessayez.' }, { status: 503 });
    }
    if (existingEmail) {
      return NextResponse.json({ success: false, message: 'Cet email est déjà associé à un compte.' }, { status: 409 });
    }

    const { data: userData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        username,
        phone,
        referral_code: referralCode || null,
      },
    });

    if (createAuthError || !userData.user) {
      const message = createAuthError?.message?.toLowerCase() ?? '';
      const alreadyExists = message.includes('already') || message.includes('registered') || message.includes('exists');

      return NextResponse.json(
        {
          success: false,
          message: alreadyExists
            ? 'Nimewo w la gentan anrejistre kliyan , ou met al konekte san tet kase'
            : 'Inscription impossible pour le moment.',
        },
        { status: alreadyExists ? 409 : 500 }
      );
    }

    const userId = userData.user.id;

    // The auth.users trigger owns profile creation. Verify it completed before
    // reporting success instead of attempting a second profiles insert.
    const { data: createdProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !createdProfile) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);
      return NextResponse.json(
        { success: false, message: 'Compte cree mais profil invalide. Reessayez.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Inscription reussie.' }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, message: 'Erreur serveur inattendue.' }, { status: 500 });
  }
}

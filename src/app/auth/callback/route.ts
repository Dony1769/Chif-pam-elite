import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const AUTH_ERROR_MESSAGE = 'Ce lien de confirmation ne peut plus être utilisé dans ce navigateur. Reconnectez-vous avec vos identifiants.';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const response = NextResponse.redirect(new URL('/client/home', request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as 'email' | null;
  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error('Missing confirmation code.') };

  if (result.error) {
    const errorUrl = new URL('/connexion', request.url);
    errorUrl.searchParams.set('auth_error', AUTH_ERROR_MESSAGE);
    return NextResponse.redirect(errorUrl);
  }

  return response;
}
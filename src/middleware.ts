import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_ID;
  const ADMIN_EMAIL = "99999999@chifpam.ht";
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin-chif-pam');

  if (isAdminPath) {
    // Si l'utilisateur n'est pas connecté
    if (!user) {
      return NextResponse.redirect(new URL('/connexion', request.url));
    }

    // Double vérification : par ID ou par Email
    const isMaster = user.id === ADMIN_ID || user.email === ADMIN_EMAIL;

    if (!isMaster) {
      return NextResponse.redirect(new URL('/connexion', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

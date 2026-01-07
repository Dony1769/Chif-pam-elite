import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

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

  // On récupère la session. 
  // IMPORTANT: On utilise getSession() ici car c'est plus rapide pour le middleware
  const { data: { session } } = await supabase.auth.getSession();

  const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";
  const path = request.nextUrl.pathname;

  // Si on essaie d'aller sur une page admin
  if (path.startsWith('/admin-chif-pam')) {
    // Si pas de session OU si l'ID ne correspond pas à l'admin
    if (!session || session.user.id !== ADMIN_ID) {
      console.log("Accès refusé - Redirection vers accueil");
      return NextResponse.redirect(new URL('/connexion', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

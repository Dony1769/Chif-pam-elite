import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // IMPORTANT: On utilise getUser() pour forcer la vérification du jeton
  const { data: { user } } = await supabase.auth.getUser();

  const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin-chif-pam');

  if (isAdminPage) {
    // Si l'utilisateur n'est pas connecté ou n'est pas l'admin
    if (!user || user.id !== ADMIN_ID) {
      console.log("Accès refusé. User:", user?.id); // Pour debug en local
      // Redirige vers la racine si l'accès est interdit
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

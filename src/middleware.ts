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

  // Utiliser getUser() est plus sûr car cela vérifie la validité du token auprès de Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();

  const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";
  const path = request.nextUrl.pathname;

  // 1. SI l'utilisateur tente d'accéder à l'admin
  if (path.startsWith('/admin-chif-pam')) {
    
    // Exception : On laisse passer si c'est la page de login admin spécifique (si tu en as une)
    // Sinon, on vérifie si l'utilisateur est connecté ET s'il est l'admin
    if (!user || user.id !== ADMIN_ID) {
      // Si ce n'est pas le bon admin, redirection vers la page de login principale
      return NextResponse.redirect(new URL('/login', request.url)); 
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

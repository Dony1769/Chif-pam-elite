import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin-chif-pam');
  const isAgentRoute = pathname.startsWith('/agent');
  if (!isAdminRoute && !isAgentRoute) return NextResponse.next();

  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/connexion', request.url));

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = profile?.role;
  if (isAdminRoute && role !== 'admin') return NextResponse.redirect(new URL(role === 'agent' ? '/agent/dashboard' : '/client/home', request.url));
  if (isAgentRoute && role !== 'agent') return NextResponse.redirect(new URL(role === 'admin' ? '/admin-chif-pam/dashboard' : '/client/home', request.url));
  return response;
}

export const config = {
  matcher: ['/admin-chif-pam/:path*', '/agent/:path*'],
};
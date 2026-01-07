import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // Middleware minimal pass-through. Ajoute ici la logique si nécessaire (auth, redirections, proxy, etc.)
  return NextResponse.next();
}

export const config = {
  // Ajuste le matcher si tu veux restreindre le middleware à certaines routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // TODO: ajouter la logique si nécessaire (auth, redirections, etc.)
  return NextResponse.next();
}

export const config = {
  // Ajuste le matcher si tu veux limiter les routes surveillées par le middleware
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

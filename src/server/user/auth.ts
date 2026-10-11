import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export type UserSessionResult =
  | { ok: true; userId: string }
  | { ok: false; message: string };

export async function requireUserSession(): Promise<UserSessionResult> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, message: 'Session invalide. Reconnectez-vous.' };
  }

  return { ok: true, userId: user.id };
}

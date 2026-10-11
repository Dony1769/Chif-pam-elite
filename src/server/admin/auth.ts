import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export type AdminSessionResult =
  | { ok: true; userId: string }
  | { ok: false; message: string };

export async function requireAdminSession(): Promise<AdminSessionResult> {
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, message: 'Session invalide. Reconnectez-vous.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return { ok: false, message: "Droits insuffisants. Vous n'êtes pas administrateur." };
  }

  return { ok: true, userId: user.id };
}
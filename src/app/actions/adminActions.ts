'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 1. Client Admin (Pour bypasser les restrictions et changer le MDP)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function adminResetPassword(targetUserId: string, newPassword: string) {
  // CORRECTIF ICI : On attend que les cookies soient résolus
  const cookieStore = await cookies();

  // 2. Client pour vérifier l'identité de l'admin
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Maintenant cookieStore est résolu, on peut appeler .get()
          return cookieStore.get(name)?.value;
        },
        // Optionnel mais recommandé pour éviter d'autres erreurs TS
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Non authentifié." };
  }

  // 3. Vérification du rôle admin
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentUserProfile?.role !== 'admin') {
    return { success: false, message: "Accès refusé." };
  }

  // 4. Action de réinitialisation
  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    targetUserId,
    { password: newPassword }
  );

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Mot de passe modifié avec succès !" };
}

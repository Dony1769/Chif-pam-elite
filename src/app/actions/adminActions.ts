// app/actions/adminActions.ts
'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 1. Client Admin (Bypass RLS pour les actions critiques)
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
  const cookieStore = cookies();

  // 2. Vérifier qui fait la demande (Sécurité)
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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Non authentifié." };
  }

  // 3. Vérifier si l'utilisateur connecté est bien un ADMIN dans la table profiles
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentUserProfile?.role !== 'admin') {
    return { success: false, message: "Accès refusé. Vous n'êtes pas administrateur." };
  }

  // 4. Action Admin : Changer le mot de passe de la cible
  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    targetUserId,
    { password: newPassword }
  );

  if (error) {
    console.error("Erreur Admin Update:", error);
    return { success: false, message: error.message };
  }

  return { success: true, message: "Mot de passe mis à jour avec succès !" };
}

"use server";

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Client lourd pour les modifications (Service Role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function adminResetPassword(targetUserId: string, newPassword: string) {
  const cookieStore = await cookies();

  // Client léger pour vérifier l'identité du demandeur via cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
=======

// On utilise la clé SERVICE_ROLE ici car c'est du code serveur sécurisé
// Cela permet de contourner toutes les restrictions RLS pour l'admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Assurez-vous d'avoir cette variable dans votre .env.local
);

export async function adminResetPassword(userId: string, newPassword: string) {
  try {
    // 1. Mise à jour directe via l'API Admin de Supabase
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error("Erreur Reset Password:", error);
      return { success: false, message: error.message };
>>>>>>> 7803cbd765003e0c370d6d78b01bc7abe83efa9f
    }

<<<<<<< HEAD
  try {
    // 1. Vérifier la session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, message: "Session invalide. Reconnectez-vous." };
    }

    // 2. Vérifier le rôle Admin dans la table 'profiles'
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { success: false, message: "Droits insuffisants. Vous n'êtes pas administrateur." };
    }

    // 3. Exécution avec le client Admin (Modification du mot de passe)
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (error) throw error;

    return { success: true, message: "Mot de passe mis à jour !" };

  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
=======
    return { success: true, message: "Mot de passe mis à jour avec succès." };
  } catch (err: any) {
    return { success: false, message: "Erreur serveur : " + err.message };
  }
}
>>>>>>> 7803cbd765003e0c370d6d78b01bc7abe83efa9f

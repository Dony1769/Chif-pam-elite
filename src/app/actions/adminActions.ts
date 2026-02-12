"use server";

import { createClient } from '@supabase/supabase-js';

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
    }

    return { success: true, message: "Mot de passe mis à jour avec succès." };
  } catch (err: any) {
    return { success: false, message: "Erreur serveur : " + err.message };
  }
}

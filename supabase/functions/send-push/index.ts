import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3.6.6"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gestion du CORS pour les appels depuis le navigateur
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, title, body, url } = await req.json()

    // Configuration des clés VAPID (Variables d'environnement Supabase)
    webpush.setVapidDetails(
      "mailto:jeanguidonyguillaume1@gmail.com",
      Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!
    )

    // Initialisation du client admin pour lire les abonnements
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 1. Récupérer le token de l'utilisateur
    const { data: pushData, error: dbError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)
      .single()

    if (dbError || !pushData) {
      throw new Error("Abonnement push introuvable pour cet utilisateur")
    }

    // 2. Envoyer la notification
    const payload = JSON.stringify({
      title: title || "Chif Pam",
      body: body || "Nouvelle mise à jour !",
      url: url || "/client/notifications"
    })

    await webpush.sendNotification(pushData.subscription, payload)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

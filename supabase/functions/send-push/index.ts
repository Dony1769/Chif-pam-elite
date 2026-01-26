// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
// @ts-ignore
import webpush from "https://esm.sh/web-push@3.6.7"

// Cette ligne magique empêche Next.js de planter s'il regarde le fichier
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, title, body, url } = await req.json()

    webpush.setVapidDetails(
      "mailto:jeanguidonyguillaume1@gmail.com",
      Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!
    )

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: pushData, error: dbError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)
      .single()

    if (dbError || !pushData) {
      return new Response(JSON.stringify({ error: "No subscription found" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const payload = JSON.stringify({
      title: title || "Chif Pam",
      body: body || "Nouvelle mise à jour !",
      url: url || "/client/notifications"
    })

    await webpush.sendNotification(pushData.subscription, payload)

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

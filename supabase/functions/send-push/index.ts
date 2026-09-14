// @ts-expect-error Deno resolves remote ESM imports at runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
// @ts-expect-error Deno resolves remote ESM imports at runtime.
import webpush from "https://esm.sh/web-push@3.6.7"

// Cette ligne magique empêche Next.js de planter s'il regarde le fichier
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

type PushRequestPayload = {
  user_id?: string;
  title?: string;
  body?: string;
  url?: string;
};

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = (await req.json()) as PushRequestPayload
    const { user_id, title, body, url } = payload

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    webpush.setVapidDetails(
      "mailto:jeanguidonyguillaume1@gmail.com",
      getRequiredEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
      getRequiredEnv("VAPID_PRIVATE_KEY")
    )

    const supabaseAdmin = createClient(
      getRequiredEnv("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || getRequiredEnv("SERVICE_ROLE_KEY")
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

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

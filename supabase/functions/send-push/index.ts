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
  content?: string;
  body?: string;
  type?: string;
  link?: string;
  url?: string;
  record?: PushRequestPayload;
};

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function targetUrl(payload: PushRequestPayload): string {
  if (payload.url || payload.link) return payload.url || payload.link || "/client/notifications";
  const type = (payload.type || "").toLowerCase();
  const text = `${payload.title || ""} ${payload.content || payload.body || ""}`.toLowerCase();
  if (type.includes("challenge") || text.includes("défi") || text.includes("defi")) return "/client/challenges";
  if (type.includes("transaction") || type.includes("finance") || text.includes("dépôt") || text.includes("retrait") || text.includes("refus")) return "/client/finance";
  if (type.includes("victory") || type.includes("game") || text.includes("victoire") || text.includes("gagn")) return "/client/list";
  return "/client/notifications";
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
    const rawPayload = (await req.json()) as PushRequestPayload
    const payload = rawPayload.record || rawPayload
    const { user_id, title, content, body } = payload

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
      .select('id, subscription')
      .eq('user_id', user_id)
      .returns<Array<{ id: string; subscription: webpush.PushSubscription }>>();

    if (dbError || !pushData || pushData.length === 0) {
      return new Response(JSON.stringify({ error: "No subscription found" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const pushBody = JSON.stringify({
      title: title || "Chif Pam",
      body: content || body || "Nouvelle mise à jour !",
      url: targetUrl(payload),
    })

    const results = await Promise.allSettled(pushData.map(async (item) => {
      try {
        await webpush.sendNotification(item.subscription, pushBody)
        return { sent: true }
      } catch (error: unknown) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 0
        if (statusCode === 404 || statusCode === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", item.id)
          return { sent: false, removed: true }
        }
        throw error
      }
    }))
    const sent = results.filter((result) => result.status === "fulfilled" && result.value.sent).length
    const removed = results.filter((result) => result.status === "fulfilled" && result.value.removed).length

    return new Response(JSON.stringify({ sent, removed, attempted: pushData.length }), {
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

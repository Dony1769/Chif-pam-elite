// app/api/send-notification/route.ts
import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Configuration Web Push
webpush.setVapidDetails(
  'mailto:99999999@chifpam.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY! // Gardez la clé privée UNIQUEMENT côté serveur (env)
);

export async function POST(request: Request) {
  try {
    const { userId, title, message } = await request.json();

    // 1. Initialiser Supabase Admin (pour contourner RLS si besoin)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Utilisez la clé service_role ici
    );

    // 2. Récupérer l'abonnement push du client
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
    }

    const subscription = JSON.parse(data.subscription);

    // 3. Envoyer la notification via les serveurs de Google/Apple
    const payload = JSON.stringify({
      title: title,
      body: message,
      url: "/client/notifications"
    });

    await webpush.sendNotification(subscription, payload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erreur Push:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

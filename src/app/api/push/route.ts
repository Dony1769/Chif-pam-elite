import { createClient } from '@supabase/supabase-js'; // Plus simple que SSR pour une API Route
import { NextResponse } from 'next/server';
import webpush from 'web-push';

// Configuration WebPush
webpush.setVapidDetails(
  'mailto:jeanguidonyguillaume1@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    // Utilisation du client Service Role pour contourner les RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { title, message, url } = await req.json();

    // Récupérer TOUS les abonnements
    const { data: subs, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription');

    if (error) throw error;

    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: false, error: "Aucun abonné trouvé" });
    }

    // Envoi groupé
    const results = await Promise.allSettled(
      subs.map((item: any) => {
        return webpush.sendNotification(
          item.subscription,
          JSON.stringify({
            title: title || "Chif Pam",
            body: message || "Nouveau message !",
            url: url || "/client/notifications"
          })
        );
      })
    );

    return NextResponse.json({ 
      success: true, 
      details: `Envoyé à ${results.length} appareils` 
    });

  } catch (err: any) {
    console.error("Erreur API Push:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

// On s'assure que les clés sont bien chargées
webpush.setVapidDetails(
  'mailto:jeanguidonyguillaume1@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Crucial pour lire les abonnements
    );

    // Récupérer les données envoyées (soit par ton code, soit par un webhook)
    const body = await req.json();
    const { user_id, title, content } = body;

    // 1. Chercher les abonnements
    let query = supabaseAdmin.from('push_subscriptions').select('subscription');
    
    // Si un user_id est fourni, on n'envoie qu'à lui, sinon à tout le monde
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: subs, error: dbError } = await query;

    if (dbError || !subs || subs.length === 0) {
      return NextResponse.json({ success: false, error: "Aucun abonné trouvé" });
    }

    // 2. Envoyer les notifications
    const payload = JSON.stringify({
      title: title || "CHIF PAM",
      body: content || "Nouvelle notification disponible",
      url: "/client/notifications"
    });

    const pushPromises = subs.map((item: any) => 
      webpush.sendNotification(item.subscription, payload)
        .catch(err => console.error("Erreur d'envoi pour un token:", err.statusCode))
    );

    await Promise.all(pushPromises);

    return NextResponse.json({ success: true, count: subs.length });

  } catch (err: any) {
    console.error("Erreur API Route:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

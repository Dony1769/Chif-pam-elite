import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

// Configuration VAPID avec votre email réel
webpush.setVapidDetails(
  'mailto:jeanguidonyguillaume1@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function POST(req: Request) {
  try {
    // CORRECTION : cookies() doit être attendu (await) dans les versions récentes de Next.js
    const cookieStore = await cookies();
    
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

    const { title, message } = await req.json();

    // Récupération des abonnements
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('subscription');

    if (error || !subs || subs.length === 0) {
      return NextResponse.json({ success: true, message: "Aucun abonné trouvé" });
    }

    // Envoi des notifications push
    const pushPromises = subs.map((item: any) => {
      return webpush.sendNotification(
        item.subscription,
        JSON.stringify({
          title: title.toUpperCase(),
          body: message,
          url: "/client/notifications"
        })
      ).catch(err => {
        // Nettoyage silencieux des abonnements expirés (Optionnel)
        console.error("Erreur d'envoi push:", err.statusCode);
      });
    });

    await Promise.all(pushPromises);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erreur API Push:", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
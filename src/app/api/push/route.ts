import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
// @ts-ignore
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:jeanguidonyguillaume1@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
        },
      }
    );

    const { title, message } = await req.json();

    // On récupère TOUS les champs pour déboguer si besoin
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('subscription');

    if (error || !subs || subs.length === 0) {
      console.log("Aucun abonnement trouvé en base.");
      return NextResponse.json({ success: true, message: "Aucun abonné" });
    }

    console.log(`Envoi à ${subs.length} abonnés...`);

    const pushPromises = subs.map((item: any) => {
      // IMPORTANT : Vérification que l'abonnement est valide
      if (!item.subscription || !item.subscription.endpoint) {
        return Promise.resolve(); // Ignore les abonnements corrompus
      }

      return webpush.sendNotification(
        item.subscription,
        JSON.stringify({
          title: title.toUpperCase(),
          body: message,
          url: "/client/notifications"
        })
      ).catch((err: any) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // L'utilisateur n'existe plus ou a révoqué la permission
          console.log("Abonnement expiré, nettoyage recommandé.");
          // Ici, tu pourrais ajouter une logique pour supprimer cet abonnement de la DB
        } else {
          console.error("Erreur WebPush:", err.statusCode, err.body);
        }
      });
    });

    await Promise.all(pushPromises);
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Erreur API Push:", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

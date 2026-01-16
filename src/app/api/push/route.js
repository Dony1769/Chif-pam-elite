import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:votre-email@domaine.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { title, message } = await req.json();

  // 1. Récupérer tous les abonnements push
  const { data: subs, error } = await supabase.from('push_subscriptions').select('subscription');

  if (error || !subs) return NextResponse.json({ error: "No subs" }, { status: 500 });

  // 2. Envoyer en parallèle pour plus de rapidité
  const pushPromises = subs.map(item => {
    const sub = item.subscription as any;
    return webpush.sendNotification(sub, JSON.stringify({
      title: title.toUpperCase(),
      body: message,
      url: "/client/notifications"
    })).catch(err => {
        // Optionnel : Supprimer l'abonnement s'il est expiré (410 Gone)
        console.error("Push failed for a user", err);
    });
  });

  await Promise.all(pushPromises);
  return NextResponse.json({ success: true });
}


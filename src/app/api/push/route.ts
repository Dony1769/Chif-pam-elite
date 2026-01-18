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
    // Correction : On passe la fonction asynchrone directement dans la configuration
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookieStore = await cookies();
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { title, message } = await req.json();

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('subscription');

    if (error || !subs || subs.length === 0) {
      return NextResponse.json({ success: true, message: "Aucun abonné" });
    }

    const pushPromises = subs.map((item: any) => {
      if (!item.subscription || !item.subscription.endpoint) return Promise.resolve();

      return webpush.sendNotification(
        item.subscription,
        JSON.stringify({
          title: title.toUpperCase(),
          body: message,
          url: "/client/notifications"
        })
      ).catch((err: any) => {
        console.error("Erreur WebPush sur un abonné:", err.statusCode);
      });
    });

    await Promise.all(pushPromises);
    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

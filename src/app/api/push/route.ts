import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:votre-email@domaine.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { title, message } = await req.json();

  const { data: subs, error } = await supabase.from('push_subscriptions').select('subscription');

  if (error || !subs) return NextResponse.json({ error: "No subs found" }, { status: 500 });

  const pushPromises = subs.map(item => {
    const sub = item.subscription as any;
    return webpush.sendNotification(sub, JSON.stringify({
      title: title.toUpperCase(),
      body: message,
      url: "/client/notifications"
    })).catch(err => console.error("Push error:", err));
  });

  await Promise.all(pushPromises);
  return NextResponse.json({ success: true });
}

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  "mailto:99999999@chifpam.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async (req: Request) => {
  try {
    const { title, body } = await req.json();

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("subscription");

    if (error) throw error;

    await Promise.all(
      data.map((row: any) =>
        webpush.sendNotification(
          row.subscription,
          JSON.stringify({ title, body })
        )
      )
    );

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
};

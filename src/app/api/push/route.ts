import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

type PushSubscriptionRow = {
  user_id: string;
  subscription: webpush.PushSubscription;
};

type PushPayload = {
  user_id?: string;
  title?: string;
  content?: string;
  body?: string;
  url?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parsePushPayload(body: unknown): PushPayload {
  if (!isObject(body)) return {};
  const source = isObject(body.record) ? body.record : body;

  return {
    user_id: typeof source.user_id === 'string' ? source.user_id : undefined,
    title: typeof source.title === 'string' ? source.title : undefined,
    content: typeof source.content === 'string' ? source.content : undefined,
    body: typeof source.body === 'string' ? source.body : undefined,
    url: typeof source.url === 'string' ? source.url : undefined,
  };
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erreur inconnue';
}

function getHeaderToken(req: Request): string | null {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey) return apiKey;

  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  const bearerPrefix = 'Bearer ';
  return authHeader.startsWith(bearerPrefix)
    ? authHeader.slice(bearerPrefix.length)
    : authHeader;
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { success: false, error: 'Configuration serveur incomplète.' },
        { status: 500 }
      );
    }

    const pushApiToken = process.env.PUSH_API_TOKEN;
    if (pushApiToken) {
      const token = getHeaderToken(req);
      if (token !== pushApiToken) {
        return NextResponse.json({ success: false, error: 'Non autorisé.' }, { status: 401 });
      }
    }

    webpush.setVapidDetails(
      'mailto:jeanguidonyguillaume1@gmail.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Initialisation du client Admin
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    // 1. Récupération des données du corps de la requête
    const requestBody: unknown = await req.json();
    const payloadData = parsePushPayload(requestBody);

    // Extraction des champs de la table 'notifications'
    const { user_id, title, content, body, url } = payloadData;

    console.log(`Tentative d'envoi pour user_id: ${user_id || 'Tous'}`);

    // 2. Recherche des abonnements
    let query = supabaseAdmin.from('push_subscriptions').select('user_id, subscription');
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: subs, error: dbError } = await query.returns<PushSubscriptionRow[]>();

    if (dbError || !subs || subs.length === 0) {
      console.log("Info: Aucun abonnement trouvé dans la base de données.");
      return NextResponse.json({ success: false, error: "Aucun abonné trouvé" });
    }

    // 3. Préparation du message
    const pushPayload = JSON.stringify({
      title: title || "CHIF PAM ⚡",
      body: content || body || "Nouvelle mise à jour disponible !",
      url: url || "/client/notifications"
    });

    // 4. Envoi des notifications avec logs détaillés pour le debug
    const pushPromises = subs.map((item) => 
      webpush.sendNotification(item.subscription, pushPayload)
        .then(() => {
          console.log("✅ Notification envoyée avec succès");
        })
        .catch((err: unknown) => {
          const statusCode = isObject(err) && typeof err.statusCode === 'number' ? err.statusCode : undefined;
          const errBody = isObject(err) && typeof err.body === 'string' ? err.body : '';

          // LOG CRUCIAL : C'est ici qu'on verra pourquoi le 403 arrive
          console.error(`❌ ERREUR PUSH ${statusCode || 'UNKNOWN'}:`);
          if (errBody) {
            console.error("Détails du serveur de push:", errBody);
          }
          
          // Note : Si c'est un 410 (Gone), l'utilisateur a désinstallé/bloqué, 
          // il faudrait idéalement supprimer cet abonnement de ta DB.
        })
    );

    await Promise.all(pushPromises);

    const mode = isObject(requestBody) && isObject(requestBody.record) ? 'webhook' : 'manual';

    return NextResponse.json({ 
      success: true, 
      sent_to: subs.length,
      mode,
    });

  } catch (err: unknown) {
    const message = getErrorMessage(err);
    console.error("🔥 Erreur critique API Route:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

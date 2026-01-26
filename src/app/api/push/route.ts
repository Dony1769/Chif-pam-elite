import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

// Configuration de WebPush avec tes clés VAPID
webpush.setVapidDetails(
  'mailto:jeanguidonyguillaume1@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    // Initialisation du client Admin (nécessaire pour lire la table push_subscriptions)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    );

    // 1. Récupération et extraction intelligente des données
    const body = await req.json();
    
    // Si body.record existe, c'est que ça vient d'un Webhook Supabase
    // Sinon, on prend le corps du message directement (appel manuel)
    const payloadData = body.record ? body.record : body;

    // On extrait les champs nécessaires (assure-toi que ta table 'notifications' a bien ces noms de colonnes)
    const { user_id, title, content } = payloadData;

    // 2. Recherche des abonnements dans la base de données
    let query = supabaseAdmin.from('push_subscriptions').select('subscription');
    
    // Si un user_id est présent, on cible uniquement cet utilisateur
    // Utile pour les notifications de victoires ou messages personnels
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: subs, error: dbError } = await query;

    // Si erreur ou aucun abonné, on arrête proprement
    if (dbError || !subs || subs.length === 0) {
      console.log("Info: Aucun abonnement trouvé pour l'envoi.");
      return NextResponse.json({ success: false, error: "Aucun abonné trouvé" });
    }

    // 3. Préparation du message à envoyer au téléphone
    const pushPayload = JSON.stringify({
      title: title || "CHIF PAM ⚡",
      body: content || "Nouvelle mise à jour disponible !",
      url: "/client/notifications" // URL vers laquelle l'utilisateur est redirigé au clic
    });

    // 4. Envoi des notifications en parallèle
    const pushPromises = subs.map((item: any) => 
      webpush.sendNotification(item.subscription, pushPayload)
        .catch((err: any) => {
          // Si le token est expiré (410) ou invalide (403), on log l'erreur
          console.error(`Échec d'envoi pour un appareil: ${err.statusCode}`);
        })
    );

    await Promise.all(pushPromises);

    return NextResponse.json({ 
      success: true, 
      sent_to: subs.length,
      mode: body.record ? "webhook" : "manual"
    });

  } catch (err: any) {
    console.error("Erreur critique dans l'API Push:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

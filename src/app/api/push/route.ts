import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

// Configuration de WebPush avec tes clés VAPID
// On utilise les variables d'environnement de Vercel
webpush.setVapidDetails(
  'mailto:jeanguidonyguillaume1@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    // Initialisation du client Admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    );

    // 1. Récupération des données du corps de la requête
    const body = await req.json();
    
    // Détection auto : Webhook Supabase (body.record) ou Appel manuel (body)
    const payloadData = body.record ? body.record : body;

    // Extraction des champs de la table 'notifications'
    const { user_id, title, content } = payloadData;

    console.log(`Tentative d'envoi pour user_id: ${user_id || 'Tous'}`);

    // 2. Recherche des abonnements
    let query = supabaseAdmin.from('push_subscriptions').select('subscription');
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: subs, error: dbError } = await query;

    if (dbError || !subs || subs.length === 0) {
      console.log("Info: Aucun abonnement trouvé dans la base de données.");
      return NextResponse.json({ success: false, error: "Aucun abonné trouvé" });
    }

    // 3. Préparation du message
    const pushPayload = JSON.stringify({
      title: title || "CHIF PAM ⚡",
      body: content || "Nouvelle mise à jour disponible !",
      url: "/client/notifications"
    });

    // 4. Envoi des notifications avec logs détaillés pour le debug
    const pushPromises = subs.map((item: any) => 
      webpush.sendNotification(item.subscription, pushPayload)
        .then(() => {
          console.log("✅ Notification envoyée avec succès");
        })
        .catch((err: any) => {
          // LOG CRUCIAL : C'est ici qu'on verra pourquoi le 403 arrive
          console.error(`❌ ERREUR PUSH ${err.statusCode}:`);
          console.error("Détails du serveur de push:", err.body);
          
          // Note : Si c'est un 410 (Gone), l'utilisateur a désinstallé/bloqué, 
          // il faudrait idéalement supprimer cet abonnement de ta DB.
        })
    );

    await Promise.all(pushPromises);

    return NextResponse.json({ 
      success: true, 
      sent_to: subs.length,
      mode: body.record ? "webhook" : "manual"
    });

  } catch (err: any) {
    console.error("🔥 Erreur critique API Route:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

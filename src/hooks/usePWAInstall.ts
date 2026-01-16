// hooks/useNotifications.ts
export const subscribeUserToPush = async () => {
  // 1. Vérifier le support
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;

    // 2. Demander la permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // 3. S'abonner au serveur push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
    });

    // 4. Envoyer à Supabase
    // On stocke le JSON de la souscription pour ce user_id
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_subscriptions").upsert({
        user_id: user.id,
        subscription: JSON.stringify(subscription)
      });
    }
  } catch (error) {
    console.error("Erreur d'abonnement Push:", error);
  }
};

// Fonction utilitaire indispensable pour les clés VAPID
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

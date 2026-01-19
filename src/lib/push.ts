// /lib/push.ts

export async function subscribeUserToPush() {
  // Correction : Vérifier si nous sommes bien dans le navigateur
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey)  {
        console.error("VAPID Public Key manquante");
        return null;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }
    return subscription;
  } catch (error) {
    console.error("Erreur PushManager:", error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  // Correction : Protection contre l'exécution côté serveur
  if (typeof window === 'undefined') return new Uint8Array();

  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

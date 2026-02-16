// public/sw.js

// 1. CONFIGURATION MONETAG (Ne pas toucher)
self.options = {
    "domain": "3nbf4.com",
    "zoneId": 10585090
}
self.lary = ""
importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')

// 2. GESTION DES PUSH (Réception)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  // On essaie de lire les données. Si ce n'est pas du JSON (ex: pub cryptée), on laisse tomber.
  let payload = null;
  try {
    payload = event.data.json();
  } catch (e) {
    // Ce n'est pas tes données JSON -> C'est probablement une pub ou du texte brut.
    // On ne fait rien et on laisse le script Monetag gérer (s'il y en a un).
    return; 
  }

  // Si le JSON contient un titre spécifique à CHIF PAM, on prend le contrôle
  if (payload && (payload.title || payload.message)) {
      const title = payload.title || "CHIF PAM ⚡";
      const options = {
        body: payload.message || payload.body || "Nouvelle mise à jour !",
        icon: "/icons/icon-192.png", // Assure-toi que cette image existe
        badge: "/icons/icon-192.png",
        vibrate: [200, 100, 200], // Vibration distinctive
        tag: "chif-pam-notif", // IMPORTANT : Identifiant unique pour tes notifs
        renotify: true, // Re-sonne si une nouvelle notif arrive
        data: { 
            url: payload.url || "/client/notifications",
            dateOfArrival: Date.now() 
        },
        actions: [
            { action: "open", title: "👀 VOIR MAINTENANT" }
        ]
      };

      // On force l'affichage de TA notification
      event.waitUntil(
        self.registration.showNotification(title, options)
      );
  }
});

// 3. GESTION DES CLICS (Ouverture de l'app)
self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  
  // On ne touche QU'AUX notifications "CHIF PAM"
  if (notification.tag === "chif-pam-notif") {
      event.notification.close(); // Ferme la notif dans la barre

      const targetUrl = notification.data.url || "/client/notifications";

      event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
          // A. Si l'app est déjà ouverte, on met le focus dessus
          for (const client of clientList) {
            const clientUrl = new URL(client.url, self.location.origin).pathname;
            if (clientUrl === targetUrl && "focus" in client) {
              return client.focus();
            }
          }
          // B. Sinon, on ouvre une nouvelle fenêtre
          if (clients.openWindow) {
            return clients.openWindow(targetUrl);
          }
        })
      );
  }
});

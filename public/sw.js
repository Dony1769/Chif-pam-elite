// public/sw.js

// 1. CONFIGURATION MONETAG
// ⚠️ ATTENTION : Si ce script échoue, tout le SW plante. C'est le risque des régies pubs.
self.options = {
    "domain": "3nbf4.com",
    "zoneId": 10585090
}
self.lary = ""
try {
    importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')
} catch (e) {
    console.warn("Monetag script failed to load", e);
}

// 2. GESTION DES PUSH (Venant du Serveur / Edge Function)
// Ce code s'exécute quand l'app est FERMÉE et qu'un serveur envoie un push
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = null;
  try {
    payload = event.data.json();
  } catch (e) {
    return; // Pas du JSON (probablement pub Monetag), on laisse faire
  }

  // Si c'est une notif CHIF PAM
  if (payload && (payload.title || payload.message)) {
      const title = payload.title || "CHIF PAM ⚡";
      const options = {
        body: payload.message || payload.body || "Nouvelle information disponible !",
        icon: "/icons/icon-192.png", 
        badge: "/icons/icon-192.png",
        vibrate: [200, 100, 200],
        tag: "chif-pam-notif", // Tag unique pour ne pas empiler les notifs
        renotify: true,
        data: { 
            url: payload.url || "/client/notifications"
        }
      };

      event.waitUntil(
        self.registration.showNotification(title, options)
      );
  }
});

// 3. GESTION DES CLICS (Le plus important pour l'UX)
self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  
  // On ne gère que NOS notifications
  if (notification.tag === "chif-pam-notif") {
      event.notification.close(); // On ferme la notif

      const targetUrl = notification.data.url || "/client/notifications";

      // Logique pour rouvrir l'app ou mettre le focus
      event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
          // A. Chercher si un onglet est déjà ouvert
          for (const client of clientList) {
            const clientUrl = new URL(client.url, self.location.origin).pathname;
            // Si on est sur le site (peu importe la page exact), on focus
            if (client.url.includes(self.location.origin) && "focus" in client) {
              // Si on veut rediriger vers la page spécifique :
              if (client.navigate) {
                  client.navigate(targetUrl);
              }
              return client.focus();
            }
          }
          // B. Sinon, ouvrir une nouvelle fenêtre
          if (clients.openWindow) {
            return clients.openWindow(targetUrl);
          }
        })
      );
  }
});

// public/sw.js

// ===== Monetag / PropellerAds Push (NOUVEAU CODE) =====
self.options = {
    "domain": "3nbf4.com",
    "zoneId": 10585090
}
self.lary = ""
importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')

// ===== Tes notifications custom CHIF PAM (GARDE ÇA) =====
self.addEventListener("push", (event) => {
  // On vérifie si c'est une notif Monetag (souvent elles n'ont pas de structure JSON standard ou sont gérées par le script importé au-dessus)
  // Si le script importé gère l'événement, il peut arrêter la propagation.
  // Sinon, on gère nos propres notifs.
  
  let data = {
    title: "CHIF PAM ⚡",
    body: "Nouveau message disponible !",
    url: "/client/notifications"
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      // Si le payload vient de ton back-end, il aura tes champs spécifiques.
      if (payload.title) {
          data = { ...data, ...payload };
          
          const options = {
            body: data.body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            vibrate: [300, 100, 300],
            tag: "chif-pam-notif",
            renotify: true,
            data: { url: data.url },
            actions: [{ action: "open", title: "VOIR" }]
          };

          event.waitUntil(self.registration.showNotification(data.title, options));
      }
    } catch (e) {
      // Ignorer les erreurs de parsing pour ne pas casser les pubs
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  // Gestion du clic uniquement pour tes notifications
  if (event.notification.tag === "chif-pam-notif") {
      event.notification.close();
      const targetUrl = event.notification.data.url || "/client/notifications";

      event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(targetUrl) && "focus" in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) return clients.openWindow(targetUrl);
        })
      );
  }
});

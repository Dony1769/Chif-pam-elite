// /public/sw.js

self.addEventListener("push", (event) => {
  let data = { title: "Chif Pam", body: "Nouvelle mise à jour disponible !" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "Chif Pam", body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png", // Petite icône monochrome pour la barre d'état
    vibrate: [200, 100, 200],
    tag: "crash-elite-notif", // Empêche le flood (remplace la précédente)
    renotify: true,
    data: {
      url: data.url || "/client/notifications"
    },
    actions: [
      { action: "open", title: "Voir" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Si l'onglet est déjà ouvert, on fait le focus dessus
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      // Sinon on ouvre une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

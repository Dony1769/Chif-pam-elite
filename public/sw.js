self.addEventListener("push", (event) => {
  let data = { title: "Chif Pam", body: "Nouvelle mise à jour !", url: "/client/notifications" };

  if (event.data) {
    try {
      const json = event.data.json();
      data = { ...data, ...json }; // Fusionne les valeurs par défaut
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png", // Assure-toi que cette image existe dans /public/icons/
    badge: "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url
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
  const targetUrl = event.notification.data.url || "/client/notifications";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus sur l'onglet existant s'il y en a un
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      // Sinon ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

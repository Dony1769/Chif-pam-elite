self.addEventListener("push", function (event) {
  const data = event.data?.json() || {};

  const title = data.title || "Chif Pam";
  const options = {
    body: data.body || "Nouvelle notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: {
      url: data.url || "/client/notifications", // ouvrir la page notifications en cliquant
      id: data.id || null
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Cliquer sur la notification ouvre la page notifications
self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  const url = event.notification.data.url;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      // Si une fenêtre est déjà ouverte, on l'utilise
      for (let client of windowClients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      // Sinon, on ouvre une nouvelle fenêtre
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

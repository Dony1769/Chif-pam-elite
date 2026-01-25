self.addEventListener("push", (event) => {
  let data = { 
    title: "Chif Pam", 
    body: "Nouveau message ou défi disponible !", 
    url: "/client/notifications" 
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png", 
    badge: "/icons/icon-192.png",
    vibrate: [300, 100, 300],
    tag: "chif-pam-notif", // Empêche d'empiler 50 notifs identiques
    renotify: true,
    data: { url: data.url },
    actions: [{ action: "open", title: "Ouvrir l'application" }]
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
      // Si l'appli est déjà ouverte, on focus et on navigue
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Sinon on ouvre une nouvelle fenêtre
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

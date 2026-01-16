self.addEventListener("push", event => {
  const data = event.data?.json() || {};

  const options = {
    body: data.body || "Nouvelle notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      url: "/client/notifications"
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Chif Pam",
      options
    )
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes("/client/notifications")) {
          return client.focus();
        }
      }
      return clients.openWindow("/client/notifications");
    })
  );
});

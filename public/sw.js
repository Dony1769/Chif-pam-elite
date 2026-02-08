// ===== PropellerAds Push =====
self.options = {
  "domain": "5gvci.com",
  "zoneId": 10584237
}
self.lary = ""
importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw')

// ===== MultiTag Luminous Push =====
self.options2 = {
  "domain": "3nbf4.com",  // ou 3nbf4.com pour MultiTag
  "zoneId": 10585090
}
self.lary2 = ""
importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')

// ===== Tes notifications custom =====
self.addEventListener("push", (event) => {
  let data = {
    title: "CHIF PAM ⚡",
    body: "Nouveau message disponible !",
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
    tag: "chif-pam-notif",
    renotify: true,
    data: { url: data.url },
    actions: [{ action: "open", title: "VOIR" }]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
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
});

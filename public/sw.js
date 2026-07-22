// public/sw.js

const CACHE_VERSION = "chifpam-static-v1";
const RUNTIME_CACHE = "chifpam-runtime-v1";
const PRECACHE_URLS = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  if (self.registration.navigationPreload) {
    event.waitUntil(self.registration.navigationPreload.enable());
  }
  self.clients.claim();
});

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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isHttp = url.protocol === "http:" || url.protocol === "https:";
  const isSameOrigin = url.origin === self.location.origin;
  const isSupabase = url.hostname.includes("supabase.co");
  const isApi = url.pathname.startsWith("/api/");
  const isAdOrAnalytics =
    url.hostname.includes("googlesyndication") ||
    url.hostname.includes("google-analytics") ||
    url.hostname.includes("magsrv.com") ||
    url.hostname.includes("effectivegatecpm.com") ||
    url.hostname.includes("3nbf4.com");

  if (!isHttp || isSupabase || isApi || isAdOrAnalytics) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) return preloadResponse;
          const networkResponse = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch {
          const cached = await caches.match(request);
          return cached || caches.match("/");
        }
      })()
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && isSameOrigin) {
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

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

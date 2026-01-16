self.addEventListener("push", function (event) {
  const data = event.data?.json() || {};
  self.registration.showNotification(data.title || "Chif Pam", {
    body: data.body || "Nouvelle notification",
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg"
  });
});

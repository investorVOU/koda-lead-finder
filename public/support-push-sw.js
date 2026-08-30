self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(self.registration.showNotification(data.title || "KodarAI Support", {
    body: data.body || "A customer needs support.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: data.url || "/support" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/support"));
});

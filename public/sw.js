// BooKanto Web Push Service Worker
self.addEventListener("push", (event) => {
  let data = {
    title: "BooKanto Notification",
    body: "You have a new update.",
    url: "/account",
    tag: "default",
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/account" },
    tag: data.tag || "bookanto-alert",
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/account";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.navigate(targetUrl).then((c) => c.focus());
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});

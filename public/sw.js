// BooKanto Service Worker
// Version: 1.0.0
// Features: Offline shell, navigation fallback, today's schedule API caching, and Web Push notifications.

const SHELL_CACHE_NAME = "bookanto-shell-v2";
const DATA_CACHE_NAME = "bookanto-data-v1";

const PRECACHE_RESOURCES = [
  "/offline",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// 1. Install lifecycle: precache offline shell resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_RESOURCES))
      .then(() => self.skipWaiting()),
  );
});

// 2. Activate lifecycle: clean up obsolete caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== SHELL_CACHE_NAME && key !== DATA_CACHE_NAME) {
              return caches.delete(key);
            }
            return null;
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// 3. Fetch strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Ignore cross-origin requests for offline cache
  if (url.origin !== self.location.origin) {
    return;
  }

  // Strategy A: Today's Dashboard API - Network First with Data Cache fallback
  if (url.pathname === "/api/dashboard/today") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Strategy B: Navigation requests (HTML pages) - Network First with /offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid navigation response, return it
          return response;
        })
        .catch(async () => {
          // Check if specific route was cached
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fall back to offline shell
          const offlineShell = await caches.match("/offline");
          if (offlineShell) {
            return offlineShell;
          }
          return new Response(
            "<!DOCTYPE html><html><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>",
            { headers: { "Content-Type": "text/html" } },
          );
        }),
    );
    return;
  }

  // Strategy C: Static assets (_next/static, icons, images) - Cache First with Network Fallback
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch update in background (stale-while-revalidate)
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(SHELL_CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(SHELL_CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      }),
    );
    return;
  }
});

// 4. Client messages (e.g. skip waiting on update)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// 5. Web Push Notification listener
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

// 6. Notification click handler
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

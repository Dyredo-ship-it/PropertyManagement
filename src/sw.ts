/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

// Allow the new service worker to take control immediately after install.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Precache everything emitted by Vite (filled by workbox-build at build time).
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Navigation requests → index.html fallback so React routing works offline.
const allowlist: RegExp[] = [/^\/$/, /^\/[^.]*$/];
const denylist: RegExp[] = [/^\/api\//, /^\/functions\//];
registerRoute(
  new NavigationRoute(
    async ({ event }) => {
      const cache = await caches.open("workbox-precache-v2");
      const precached = await cache.match("/index.html");
      if (precached) return precached;
      return fetch(event.request);
    },
    { allowlist, denylist },
  ),
);

// Supabase REST calls: NetworkFirst with short cache for flaky-network resilience.
registerRoute(
  ({ url }) => /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\//i.test(url.href),
  new NetworkFirst({
    cacheName: "supabase-rest",
    networkTimeoutSeconds: 5,
    plugins: [],
  }),
);

/* ─── Web Push ─────────────────────────────────────────────── */

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  category?: string;
}

self.addEventListener("push", (event: PushEvent) => {
  let payload: PushPayload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: "Palier", body: event.data?.text() ?? "Nouvelle notification" };
  }

  const title = payload.title || "Palier";
  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || "/pwa-192x192.png",
    badge: payload.badge || "/pwa-192x192.png",
    tag: payload.tag,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({ type: "navigate", url: target });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});

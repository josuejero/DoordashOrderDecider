/// <reference lib="webworker" />

import { BackgroundSyncPlugin } from "workbox-background-sync";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import {
  cleanupOutdatedCaches,
  precacheAndRoute,
  type PrecacheEntry,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

const OFFLINE_FALLBACK_URL = "/offline.html";

const pageStrategy = new NetworkFirst({
  cacheName: "dd-pages-v1",
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
    new ExpirationPlugin({
      maxEntries: 16,
      maxAgeSeconds: 7 * 24 * 60 * 60,
    }),
  ],
});

registerRoute(
  new NavigationRoute(async (options: { request: Request }) => {
    try {
      const response = await pageStrategy.handle(options as any);
      if (response) return response;
    } catch {
      // fall through to offline fallback
    }

    const cached = await caches.match(OFFLINE_FALLBACK_URL);
    return cached ?? Response.error();
  }),
);

registerRoute(
  ({ request }: { request: Request }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "worker",
  new StaleWhileRevalidate({
    cacheName: "dd-static-assets-v1",
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
);

registerRoute(
  ({ request }: { request: Request }) =>
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "manifest",
  new CacheFirst({
    cacheName: "dd-media-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);

registerRoute(
  ({ url, request }: { url: URL; request: Request }) =>
    request.method === "GET" &&
    (url.pathname.startsWith("/api/analytics") ||
      url.pathname.startsWith("/api/orders/history")),
  new NetworkFirst({
    cacheName: "dd-analytics-history-v1",
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60,
      }),
    ],
  }),
);

registerRoute(
  ({ url, request }: { url: URL; request: Request }) =>
    request.method === "GET" && url.pathname.startsWith("/api/drivers"),
  new StaleWhileRevalidate({
    cacheName: "dd-profile-cache-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  }),
);

registerRoute(
  ({ url, request }: { url: URL; request: Request }) =>
    request.method === "GET" &&
    (url.hostname.startsWith("ml.") || url.pathname.startsWith("/api/model")),
  new StaleWhileRevalidate({
    cacheName: "dd-model-cache-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  }),
);

const backgroundSyncPlugin = new BackgroundSyncPlugin(
  "dd-api-write-queue-v1",
  {
    maxRetentionTime: 24 * 60, // minutes
  },
);

registerRoute(
  ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
  new NetworkOnly({
    plugins: [backgroundSyncPlugin],
  }),
  "POST",
);

registerRoute(
  ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
  new NetworkOnly({
    plugins: [backgroundSyncPlugin],
  }),
  "PUT",
);

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

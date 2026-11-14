// Kill-switch: replaces the old offline worker so returning visitors load the latest version.
function isWorkboxCacheForThisRegistration(name) {
  const hasWorkboxBucket = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  return hasWorkboxBucket && name.endsWith(self.registration.scope);
}
const LEGACY_RUNTIME_CACHES = ["royale-assets-cache", "api-cache", "image-cache", "font-cache"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        const ours = names.filter((n) => isWorkboxCacheForThisRegistration(n) || LEGACY_RUNTIME_CACHES.includes(n));
        await Promise.allSettled(ours.map((n) => caches.delete(n)));
        await self.clients.claim();
        const windows = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windows.map((c) => c.navigate(c.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);

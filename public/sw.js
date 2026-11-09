// Minimalus service worker: leidžia įdiegti programą kaip PWA.
// Neprisijungus veikimas (offline talpykla) bus pridėtas vėliau.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

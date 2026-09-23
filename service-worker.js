/* Basic app-shell cache so the system keeps working offline once opened once.
   MIGRATION NOTE: firebase-config.js is gone (backend is now Netlify
   Functions + Neon - see source/02-state.js). Bumped the cache name so
   every installed client picks up this change and drops the old entry. */
var CACHE_NAME = "ladybird-school-v3";
var ASSETS = [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(e){
  if (e.request.method !== "GET") return;
  // Never cache API calls (auth/session cookies, school data, media) - a
  // stale or shared cache entry here would risk showing one user's data
  // to another, or a signed-out state as signed-in. Always hit the network
  // for these (see master prompt section 53).
  if (e.request.url.indexOf("/.netlify/functions/") !== -1) return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, copy); });
        return resp;
      }).catch(function(){ return cached; });
    })
  );
});

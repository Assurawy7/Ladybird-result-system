/* ==========================================================================
   service-worker.template.js
   This is the file to EDIT. `npm run build` generates the real
   `service-worker.js` from this template, substituting __CACHE_VERSION__
   with a hash computed automatically from app.js/styles.css/index.html/
   manifest.json - so the cache name always changes whenever any of those
   files change, and installed clients always pick up the update. You no
   longer need to remember to bump a version number by hand.

   MIGRATION NOTE: firebase-config.js is gone (backend is now Netlify
   Functions + Neon - see source/02-state.js).

   Basic app-shell cache so the system keeps working offline once opened
   once.
   ========================================================================== */
var CACHE_NAME = "ladybird-school-__CACHE_VERSION__";
var ASSETS = [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function(e){
  // cache:"reload" makes every file come fresh from the server, never from the
  // browser's own HTTP cache - otherwise a new service worker could store an
  // OLD copy of app.js under its new cache name. Any failed download aborts
  // the install so a half-cached app is never activated.
  e.waitUntil(caches.open(CACHE_NAME).then(function(cache){
    return Promise.all(ASSETS.map(function(url){
      return fetch(new Request(url, { cache: "reload" })).then(function(resp){
        if (!resp.ok) throw new Error("Could not cache " + url + " (" + resp.status + ")");
        return cache.put(url, resp);
      });
    }));
  }));
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
      if (cached) return cached;
      return fetch(e.request).then(function(resp){
        // Only keep good same-origin responses - never store errors.
        if (resp && resp.ok && resp.type === "basic"){
          var copy = resp.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, copy); });
        }
        return resp;
      }).catch(function(){
        // Offline and not cached: open the app shell for page loads instead of
        // a browser error page; fail cleanly for anything else.
        if (e.request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      });
    })
  );
});

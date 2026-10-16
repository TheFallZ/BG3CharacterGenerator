"use strict";

// Keeps a copy of the site on the device so it opens without a connection. Pages always come
// from the network when there is one, so updates show up right away; the copy is only used
// offline or when the connection is too slow to answer.
//
// Bump CACHE with the ?v= number on the pages, so old copies are cleared out.
const CACHE = "bg3-generator-v91";
const PAGES = ["./", "saved/", "settings/", "about/", "whats-new/"];
// Waits this long for the network before showing the saved copy of a page.
const NETWORK_TIMEOUT = 4000;
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

// Saves every page, then the scripts, styles and icons each page links to, at the versions it links.
async function saveSite() {
  const cache = await caches.open(CACHE);
  const assets = new Set();
  for (const page of PAGES) {
    const url = new URL(page, self.registration.scope).href;
    const response = await fetch(url, {cache: "no-cache"});
    if (!response.ok) continue;
    const html = await response.clone().text();
    await cache.put(url, response);
    for (const [, link] of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|svg|png)(?:\?v=\d+)?)"/g)) {
      const asset = new URL(link, url);
      if (asset.origin === self.location.origin) assets.add(asset.href);
    }
  }
  await cache.addAll([...assets]);
}

self.addEventListener("install", event => {
  event.waitUntil(saveSite().then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Pages: the network first, falling back to the saved copy. A link to a page that was never
// saved (or a share link's address) falls back to the Generator.
async function page(request) {
  const cache = await caches.open(CACHE);
  const key = new URL(request.url);
  key.search = "";
  key.hash = "";
  const network = fetch(request).then(response => {
    if (response.ok) cache.put(key.href, response.clone());
    return response;
  });
  network.catch(() => {});
  const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT));
  try {
    const response = await Promise.race([network, timeout]);
    if (response) return response;
  } catch {
    // Offline; use the saved copy below.
  }
  const saved = await cache.match(key.href) ?? await cache.match(new URL("./", self.registration.scope).href);
  return saved ?? network;
}

// Scripts, styles, icons and fonts: the saved copy first, since a new version has a new address.
// Anything fetched is saved for next time.
async function asset(request) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(request);
  if (saved) return saved;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    // Offline with a newer version than the one saved: an older copy beats nothing.
    const older = await cache.match(request, {ignoreSearch: true});
    if (older) return older;
    throw error;
  }
}

self.addEventListener("fetch", event => {
  const {request} = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(page(request));
  } else if (url.origin === self.location.origin || FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(asset(request));
  }
  // Everything else, like the visit counter, goes straight to the network.
});

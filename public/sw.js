// ESA Housekeeping service worker: shows lock-screen notifications sent by the server
// (lib/push.ts) and opens the right page when one is tapped. No offline caching.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let msg = { title: "ESA Housekeeping", body: "", url: "/my-rooms" };
  try { msg = { ...msg, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      tag: msg.tag,
      icon: "/icon.png",
      badge: "/icon.png",
      data: { url: msg.url },
      vibrate: [200, 100, 200],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/my-rooms", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.startsWith(self.location.origin) && "focus" in c) { c.navigate(url); return c.focus(); }
      return self.clients.openWindow(url);
    }),
  );
});

// Service worker: what actually makes the "pop-up" notification possible.
// This runs in the background even when the app/tab isn't open, which is
// what lets a push notification appear on the lock screen or notification
// tray.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A new announcement arrives here as a push message from the server
// (see lib/push.js). We turn it into an OS-level notification.
self.addEventListener("push", (event) => {
  let data = { title: "New announcement", body: "" };
  try {
    if (event.data) data = event.data.json();
  } catch {
    if (event.data) data.body = event.data.text();
  }

  const title = data.title || "New announcement";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    // "image" shows a larger photo inside the notification itself. Support
    // varies by platform (Android/Chrome shows it, iOS Safari currently
    // ignores it) -- harmless to include either way, and the photo always
    // shows in the feed regardless.
    ...(data.imageUrl ? { image: data.imageUrl } : {}),
    data: { url: "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification focuses an existing tab if one is open, or opens
// a new one to the announcements feed.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

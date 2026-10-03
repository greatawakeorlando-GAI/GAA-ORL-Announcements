import webpush from "web-push";
import { getSubscriptions, removeSubscription } from "./db";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!publicKey || !privateKey) {
    throw new Error(
      "Missing VAPID keys. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY " +
        "(see .env.example / README for how to generate them)."
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

/**
 * Sends a push notification to every subscribed device. Subscriptions that
 * the browser has revoked (410 Gone / 404 Not Found) are cleaned up
 * automatically so the subscriber list doesn't accumulate dead entries.
 */
export async function notifySubscribers({ title, body }) {
  ensureConfigured();
  const subscriptions = await getSubscriptions();
  const payload = JSON.stringify({ title, body });

  const results = await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification(sub, payload))
  );

  await Promise.all(
    results.map(async (result, i) => {
      if (result.status === "rejected") {
        const statusCode = result.reason?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await removeSubscription(subscriptions[i].endpoint);
        }
      }
    })
  );

  return {
    sent: results.filter((r) => r.status === "fulfilled").length,
    total: subscriptions.length,
  };
}

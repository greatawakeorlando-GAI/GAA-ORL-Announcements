// Minimal Upstash Redis REST client (no SDK dependency) + the two data
// operations this app needs: announcements (a list) and push subscriptions
// (a hash keyed by subscription endpoint, so re-subscribing just overwrites).
//
// Why Redis instead of a SQL database: the data model is tiny (a feed of
// posts, a set of push subscriptions), Upstash's free tier is generous for a
// single congregation, and its REST API works over plain HTTPS fetch calls,
// which plays nicely with serverless hosting (no connection pooling to
// manage). If GAI outgrows this later, swapping lib/db.js for a real
// database is a self-contained change -- nothing else in the app needs to
// know how data is stored.

const BASE_URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...command) {
  if (!BASE_URL || !TOKEN) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN environment variables. " +
        "See .env.example for where to get these."
    );
  }
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upstash Redis error (${res.status}): ${text}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(`Upstash Redis error: ${data.error}`);
  return data.result;
}

const ANNOUNCEMENTS_KEY = "gai:announcements";
const SUBSCRIPTIONS_KEY = "gai:subscriptions";
const MAX_ANNOUNCEMENTS = 200; // keep the feed from growing forever

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Returns announcements newest-first. */
export async function getAnnouncements() {
  const raw = await redis("LRANGE", ANNOUNCEMENTS_KEY, 0, -1);
  return (raw || []).map((item) => JSON.parse(item));
}

/** Adds a new announcement and returns it (with id + createdAt filled in). */
export async function addAnnouncement({ title, body }) {
  const announcement = {
    id: makeId(),
    title: String(title).slice(0, 200),
    body: String(body).slice(0, 4000),
    createdAt: new Date().toISOString(),
  };
  await redis("LPUSH", ANNOUNCEMENTS_KEY, JSON.stringify(announcement));
  await redis("LTRIM", ANNOUNCEMENTS_KEY, 0, MAX_ANNOUNCEMENTS - 1);
  return announcement;
}

export async function deleteAnnouncement(id) {
  const all = await getAnnouncements();
  const match = all.find((a) => a.id === id);
  if (!match) return false;
  await redis("LREM", ANNOUNCEMENTS_KEY, 0, JSON.stringify(match));
  return true;
}

/** Stores/updates a push subscription, keyed by its unique endpoint URL. */
export async function saveSubscription(subscription) {
  if (!subscription || !subscription.endpoint) {
    throw new Error("Invalid push subscription");
  }
  await redis(
    "HSET",
    SUBSCRIPTIONS_KEY,
    subscription.endpoint,
    JSON.stringify(subscription)
  );
}

export async function removeSubscription(endpoint) {
  await redis("HDEL", SUBSCRIPTIONS_KEY, endpoint);
}

/** Returns all stored push subscriptions. */
export async function getSubscriptions() {
  const raw = await redis("HGETALL", SUBSCRIPTIONS_KEY);
  // Upstash returns HGETALL as a flat [field, value, field, value, ...] array.
  const subs = [];
  for (let i = 0; i < (raw || []).length; i += 2) {
    try {
      subs.push(JSON.parse(raw[i + 1]));
    } catch {
      // skip malformed entries rather than failing the whole batch
    }
  }
  return subs;
}

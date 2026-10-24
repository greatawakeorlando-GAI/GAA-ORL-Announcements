// Deliberately simple: one shared admin password (set via the ADMIN_PASSWORD
// env var), sent as a Bearer token on every admin request. There are no
// individual staff accounts. That's a reasonable trade-off for a single
// church admin/communications team posting occasional announcements; if GAI
// later wants per-user logins and an audit trail, that's a bigger change
// (e.g. swapping in NextAuth) layered on top of this same API shape.
export function isAuthorized(request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === expected;
}

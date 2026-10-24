import { NextResponse } from "next/server";

// Lets the admin page check a password against ADMIN_PASSWORD without ever
// shipping that env var to the browser. On success the client just remembers
// the password itself (in localStorage) and re-sends it as a Bearer token on
// every subsequent admin request -- there's no separate session/JWT layer.
export async function POST(request) {
  const { password } = await request.json();
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "Server is missing ADMIN_PASSWORD. Set it in your environment." },
      { status: 500 }
    );
  }
  if (password === expected) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
}


import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// POST /api/contact
// The Contact Us form (public/contact.html) sends its fields here, and this
// emails them straight to the church Gmail. Hitting "Reply" in Gmail answers
// the member directly.
//
// Vercel environment variables:
//   GMAIL_USER          the Gmail address that sends + receives, e.g. yourchurch@gmail.com
//   GMAIL_APP_PASSWORD  the 16-character Google App Password (NOT the normal password)
//   CONTACT_TO_EMAIL    optional -- send to a different address, or several separated by commas
// Uses the existing UPSTASH_REDIS_REST_URL / _TOKEN only for a simple
// "5 messages per hour" limit; if those are missing, the limit is skipped.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000\r]/g, "").trim().slice(0, max);
}
function oneLine(v) {
  return v.replace(/\n+/g, " ");
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

async function tooMany(request) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  try {
    const ip = (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    const key = `contact:rate:${ip}`;
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, 3600]]),
      cache: "no-store",
    });
    const [count] = await res.json();
    return count.result > 5;
  } catch {
    return false;
  }
}

export async function POST(request) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_TO_EMAIL } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return NextResponse.json(
      { error: "The contact form is not set up yet. Please try again later." },
      { status: 500 }
    );
  }

  let b;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  // Spam trap: real people never see or fill the hidden "website" field.
  if (b.website) return NextResponse.json({ ok: true });

  const msg = {
    name: oneLine(clean(b.name, 120)),
    email: oneLine(clean(b.email, 200)),
    phone: oneLine(clean(b.phone, 40)),
    address: clean(b.address, 300),
    comments: clean(b.comments, 4000),
  };

  const errors = [];
  if (!msg.name) errors.push("Please enter your name.");
  if (!msg.email && !msg.phone) errors.push("Please enter an email or phone number so we can reach you.");
  if (msg.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.email)) errors.push("Please check your email address.");
  if (msg.phone && msg.phone.replace(/\D/g, "").length < 7) errors.push("Please check your phone number.");
  if (!msg.comments) errors.push("Please enter a comment or question.");
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  if (await tooMany(request)) {
    return NextResponse.json({ error: "Too many messages. Please try again later." }, { status: 429 });
  }

  const when = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());

  const rows = [
    ["Name", msg.name],
    ["Email", msg.email],
    ["Phone", msg.phone],
    ["Address", msg.address],
    ["Comments", msg.comments],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v || "-"}`).join("\n\n") + `\n\nSent from the GAI app, ${when}`;
  const tel = msg.phone.replace(/[^\d+]/g, "");
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1f2430;max-width:560px">
      <div style="background:#1c3f6e;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.85">GAI App &middot; Contact Form</div>
        <div style="font-size:22px;font-weight:bold;margin-top:4px">New message from ${esc(msg.name)}</div>
      </div>
      <div style="border:1px solid #e6e2dc;border-top:0;padding:16px 20px;border-radius:0 0 12px 12px">
        ${msg.email ? `<p><b>Email:</b> <a href="mailto:${esc(msg.email)}">${esc(msg.email)}</a></p>` : ""}
        ${msg.phone ? `<p><b>Phone:</b> <a href="tel:${esc(tel)}">${esc(msg.phone)}</a></p>` : ""}
        ${msg.address ? `<p><b>Address:</b> ${esc(msg.address).replace(/\n/g, "<br>")}</p>` : ""}
        <p><b>Comments:</b></p>
        <div style="background:#f7f5f2;border-radius:8px;padding:12px 14px;white-space:pre-wrap">${esc(msg.comments)}</div>
        <p style="color:#6b7280;font-size:13px;margin-top:16px">Sent ${esc(when)}${msg.email ? " &middot; Reply to this email to answer them directly." : ""}</p>
      </div>
    </div>`;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD.replace(/\s/g, "") },
    });
    await transporter.sendMail({
      from: { name: "GAI App Contact Form", address: GMAIL_USER },
      to: (CONTACT_TO_EMAIL || GMAIL_USER).split(",").map((s) => s.trim()).filter(Boolean),
      replyTo: msg.email ? { name: msg.name, address: msg.email } : undefined,
      subject: `GAI App: message from ${msg.name}`,
      text,
      html,
    });
  } catch (err) {
    console.error("contact form email failed:", err && err.message);
    return NextResponse.json(
      { error: "Sorry, your message could not be sent. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

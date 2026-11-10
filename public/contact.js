// POST /api/contact
// A member submits the Contact Us form → the message is emailed straight to the church Gmail.
// Hitting "Reply" in Gmail replies directly to the member.
//
// Vercel environment variables:
//   GMAIL_USER            the Gmail address that sends the message, e.g. gaichurch@gmail.com
//   GMAIL_APP_PASSWORD    a 16-character Google App Password for that account (NOT the normal password)
//   CONTACT_TO_EMAIL      optional — where messages go (defaults to GMAIL_USER; separate several with commas)
// Optional flood protection (uses the app's existing Upstash Redis, if set):
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN   or   KV_REST_API_URL + KV_REST_API_TOKEN

const nodemailer = require('nodemailer');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function clean(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000\r]/g, '').trim().slice(0, max);
}
function oneLine(v) { return v.replace(/\n+/g, ' '); }
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Max 5 messages per hour from one connection (skipped if Redis isn't configured).
async function tooMany(req) {
  if (!REDIS_URL || !REDIS_TOKEN) return false;
  try {
    const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
    const k = `contact:rate:${ip}`;
    const r = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', k], ['EXPIRE', k, 3600]]),
    });
    const [count] = await r.json();
    return count.result > 5;
  } catch (_) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_TO_EMAIL } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    res.status(500).json({ error: 'The contact form is not set up yet. Please try again later.' });
    return;
  }

  try {
    const b = await readBody(req);

    // Spam trap: real people never see or fill the "website" field.
    if (b.website) { res.status(200).json({ ok: true }); return; }

    const msg = {
      name: oneLine(clean(b.name, 120)),
      email: oneLine(clean(b.email, 200)),
      phone: oneLine(clean(b.phone, 40)),
      address: clean(b.address, 300),
      comments: clean(b.comments, 4000),
    };

    const errors = [];
    if (!msg.name) errors.push('Please enter your name.');
    if (!msg.email && !msg.phone) errors.push('Please enter an email or phone number so we can reach you.');
    if (msg.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.email)) errors.push('Please check your email address.');
    if (msg.phone && msg.phone.replace(/\D/g, '').length < 7) errors.push('Please check your phone number.');
    if (!msg.comments) errors.push('Please enter a comment or question.');
    if (errors.length) { res.status(400).json({ error: errors.join(' ') }); return; }

    if (await tooMany(req)) {
      res.status(429).json({ error: 'Too many messages — please try again later.' });
      return;
    }

    const when = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short',
    }).format(new Date());

    const rows = [
      ['Name', msg.name], ['Email', msg.email], ['Phone', msg.phone],
      ['Address', msg.address], ['Comments', msg.comments],
    ];
    const text = rows.map(([k, v]) => `${k}: ${v || '—'}`).join('\n\n') + `\n\nSent from the GAI app · ${when}`;
    const tel = msg.phone.replace(/[^\d+]/g, '');
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#0f1a33;max-width:560px">
        <div style="background:#1e4fd8;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.85">GAI App · Contact Form</div>
          <div style="font-size:22px;font-weight:bold;margin-top:4px">New message from ${esc(msg.name)}</div>
        </div>
        <div style="border:1px solid #dbe3f5;border-top:0;padding:16px 20px;border-radius:0 0 12px 12px">
          ${msg.email ? `<p><b>Email:</b> <a href="mailto:${esc(msg.email)}">${esc(msg.email)}</a></p>` : ''}
          ${msg.phone ? `<p><b>Phone:</b> <a href="tel:${esc(tel)}">${esc(msg.phone)}</a></p>` : ''}
          ${msg.address ? `<p><b>Address:</b> ${esc(msg.address).replace(/\n/g, '<br>')}</p>` : ''}
          <p><b>Comments:</b></p>
          <div style="background:#f4f7fd;border-radius:8px;padding:12px 14px;white-space:pre-wrap">${esc(msg.comments)}</div>
          <p style="color:#5b6785;font-size:13px;margin-top:16px">Sent ${esc(when)}${msg.email ? ' · Reply to this email to answer them directly.' : ''}</p>
        </div>
      </div>`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD.replace(/\s/g, '') },
    });

    await transporter.sendMail({
      from: { name: 'GAI App Contact Form', address: GMAIL_USER },
      to: (CONTACT_TO_EMAIL || GMAIL_USER).split(',').map((s) => s.trim()).filter(Boolean),
      replyTo: msg.email ? { name: msg.name, address: msg.email } : undefined,
      subject: `GAI App: message from ${msg.name}`,
      text,
      html,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact form error:', err && err.message);
    res.status(500).json({ error: 'Sorry, your message could not be sent. Please try again.' });
  }
};

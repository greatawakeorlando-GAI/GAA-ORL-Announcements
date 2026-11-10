import { NextResponse } from "next/server";
import IcalExpander from "ical-expander";

// GET /api/events?year=2026&month=11
// Reads the church's Google Calendar (its iCal feed) and returns that month's
// events for the Events page (public/events.html). Google Calendar is the
// master: add, edit, or delete events there and the page updates on its own
// (within about 5 minutes).
//
// Vercel environment variables:
//   GCAL_ICS_URL     the calendar's "Secret address in iCal format" (required)
//   GCAL_PUBLIC_URL  optional -- the calendar's "Public URL"; shows an
//                    "Add to my calendar" button for members

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pad(n) {
  return String(n).padStart(2, "0");
}

// All-day events come back as plain dates so they never shift a day.
function toOut(time) {
  if (time.isDate) return `${time.year}-${pad(time.month)}-${pad(time.day)}`;
  return time.toJSDate().toISOString();
}

function shape(ev, start, end, id) {
  return {
    id,
    title: (ev.summary || "Untitled event").trim(),
    start: toOut(start),
    end: end ? toOut(end) : null,
    allDay: !!start.isDate,
    location: (ev.location || "").trim(),
    description: (ev.description || "").trim(),
  };
}

export async function GET(request) {
  const url = process.env.GCAL_ICS_URL;
  if (!url) {
    return NextResponse.json(
      { error: "The calendar is not connected yet (GCAL_ICS_URL is missing in Vercel)." },
      { status: 500 }
    );
  }

  const params = new URL(request.url).searchParams;
  const now = new Date();
  const year = parseInt(params.get("year"), 10) || now.getFullYear();
  const month = Math.min(12, Math.max(1, parseInt(params.get("month"), 10) || now.getMonth() + 1));

  // Pad the window 2 days each side so time-zone edges are never missed;
  // the page places each event on the right Eastern-time day.
  const from = new Date(Date.UTC(year, month - 1, 1) - 2 * 864e5);
  const to = new Date(Date.UTC(year, month, 1) + 2 * 864e5);

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Calendar feed returned ${res.status}`);
    const ics = await res.text();

    const expander = new IcalExpander({ ics, maxIterations: 2000 });
    const { events, occurrences } = expander.between(from, to);

    const out = [
      ...events.map((e) => shape(e, e.startDate, e.endDate, `${e.uid}`)),
      ...occurrences.map((o) =>
        shape(o.item, o.startDate, o.endDate, `${o.item.uid}-${o.recurrenceId.toString()}`)
      ),
    ].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

    return NextResponse.json(
      {
        year,
        month,
        timeZone: "America/New_York",
        subscribeUrl: process.env.GCAL_PUBLIC_URL || null,
        updated: new Date().toISOString(),
        events: out,
      },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error("events feed error:", err && err.message);
    return NextResponse.json({ error: "Couldn't read the church calendar right now." }, { status: 500 });
  }
}

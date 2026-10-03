import { NextResponse } from "next/server";
import { getAnnouncements, addAnnouncement, deleteAnnouncement } from "@/lib/db";
import { notifySubscribers } from "@/lib/push";
import { isAuthorized } from "@/lib/auth";

export async function GET() {
  try {
    const announcements = await getAnnouncements();
    return NextResponse.json({ announcements });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { title, body } = await request.json();
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json(
        { error: "Title and body are required." },
        { status: 400 }
      );
    }
    const announcement = await addAnnouncement({ title, body });

    // Best-effort: a failure to push should not stop the announcement from
    // being saved and shown in the feed.
    let pushResult = { sent: 0, total: 0, error: null };
    try {
      pushResult = await notifySubscribers({ title, body });
    } catch (err) {
      pushResult.error = err.message;
    }

    return NextResponse.json({ announcement, push: pushResult });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await request.json();
    const removed = await deleteAnnouncement(id);
    return NextResponse.json({ removed });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

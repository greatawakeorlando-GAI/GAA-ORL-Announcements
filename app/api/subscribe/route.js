import { NextResponse } from "next/server";
import { saveSubscription, removeSubscription } from "@/lib/db";

export async function POST(request) {
  try {
    const subscription = await request.json();
    await saveSubscription(subscription);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { endpoint } = await request.json();
    await removeSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

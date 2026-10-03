import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isAuthorized } from "@/lib/auth";

// Vercel's serverless functions cap request bodies around 4.5MB on the
// Hobby plan, so we enforce a slightly smaller limit here and give a clear
// error rather than a confusing failure from the platform itself.
const MAX_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "No file provided." },
      { status: 400 }
    );
  }

  try {
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Please upload a JPEG, PNG, WEBP, or GIF image." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Please use one under 4MB." },
        { status: 400 }
      );
    }

    const extension = file.type.split("/")[1];
    const blob = await put(`announcements/photo.${extension}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    // Most likely cause if this fails on a fresh deploy: no Blob store has
    // been connected to the project yet (see README).
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

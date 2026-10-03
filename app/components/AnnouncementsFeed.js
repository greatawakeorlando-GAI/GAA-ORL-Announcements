"use client";

import { useEffect, useState } from "react";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AnnouncementsFeed({ initialAnnouncements }) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);

  // Keep tabs that are left open in sync even without a push notification --
  // e.g. someone browsing the feed while staff posts a new update.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/announcements", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data.announcements);
        }
      } catch {
        // silent -- next poll will retry
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!announcements.length) {
    return (
      <div className="empty-state">
        <p>No announcements yet. Check back soon.</p>
      </div>
    );
  }

  return (
    <div>
      {announcements.map((a) => (
        <article className="card" key={a.id}>
          <h2>{a.title}</h2>
          <time dateTime={a.createdAt}>{formatDate(a.createdAt)}</time>
          {a.imageUrl && (
            <img
              src={a.imageUrl}
              alt=""
              style={{
                width: "100%",
                borderRadius: 10,
                display: "block",
                marginBottom: 10,
              }}
            />
          )}
          <p>{a.body}</p>
        </article>
      ))}
    </div>
  );
}

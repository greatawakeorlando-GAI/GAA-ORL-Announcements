import { getAnnouncements } from "@/lib/db";
import AnnouncementsFeed from "./components/AnnouncementsFeed";
import NotificationButton from "./components/NotificationButton";

const churchName =
  process.env.NEXT_PUBLIC_CHURCH_NAME || "Great Awakening International";

// Where the "Give" button sends people (your online giving page). Set this as
// NEXT_PUBLIC_GIVE_URL in Vercel -> Settings -> Environment Variables.
const giveUrl = (
  process.env.NEXT_PUBLIC_GIVE_URL ||
  "https://givebutter.com/great-awakening-assembly-orlando-corporation"
).trim();

export const dynamic = "force-dynamic"; // always show the latest announcements

export default async function HomePage() {
  let announcements = [];
  let loadError = null;
  try {
    announcements = await getAnnouncements();
  } catch (err) {
    loadError = err.message;
  }

  return (
    <>
      <header className="app-header">
        <h1>{churchName}</h1>
        <p>Announcements &amp; Updates</p>
      </header>
      <nav className="tab-bar" aria-label="Main">
        <a href="/" className="tab active" aria-current="page">
          Announcements
        </a>
        {giveUrl ? (
          <a
            href={giveUrl}
            className="tab"
            target="_blank"
            rel="noopener noreferrer"
          >
            Give
          </a>
        ) : (
          <span className="tab disabled" title="Giving link not set up yet">
            Give
          </span>
        )}
      </nav>
      <main className="container">
        <NotificationButton />
        {loadError ? (
          <div className="banner">
            Couldn&apos;t load announcements right now ({loadError}).
          </div>
        ) : (
          <AnnouncementsFeed initialAnnouncements={announcements} />
        )}
      </main>
      <footer className="app-footer">
        <a href="/admin">Staff sign-in</a>
      </footer>
    </>
  );
}

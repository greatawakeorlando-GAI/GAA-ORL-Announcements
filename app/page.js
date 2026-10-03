import { getAnnouncements } from "@/lib/db";
import AnnouncementsFeed from "./components/AnnouncementsFeed";
import NotificationButton from "./components/NotificationButton";

const churchName =
  process.env.NEXT_PUBLIC_CHURCH_NAME || "Great Awakening International";

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

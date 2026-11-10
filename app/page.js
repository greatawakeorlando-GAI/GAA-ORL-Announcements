import { getAnnouncements } from "@/lib/db";
import AnnouncementsFeed from "./components/AnnouncementsFeed";
import NotificationButton from "./components/NotificationButton";

const churchName =
  process.env.NEXT_PUBLIC_CHURCH_NAME || "Great Awakening International";

// Where the "Give" button sends people (your online giving page).
const giveUrl = (
  process.env.NEXT_PUBLIC_GIVE_URL ||
  "https://givebutter.com/great-awakening-assembly-orlando-corporation"
).trim();

// The extra link buttons. To turn one on, put its web address between the
// quotes after "url:". A button with empty quotes shows as a greyed-out
// placeholder that does nothing when tapped. "Contact Us" can also be an
// email link, written like: "mailto:office@yourchurch.org"
const LINK_BUTTONS = [
  { label: "2027 Feast Days", url: "" },
  { label: "About Us", url: "" },
  { label: "Shabbat Schedule", url: "/shabbat.html" },
  { label: "Events", url: "/events.html" },
  { label: "Contact Us", url: "/contact.html" },
];

// Styles for the button bar live here so this one file is all that changes.
const buttonStyles = `
nav.tab-bar { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-width: 640px; margin: 0 auto; padding: 16px 16px 0; }
nav.tab-bar .tab { display: block; flex: none; text-align: center; text-decoration: none; padding: 12px 10px; border-radius: 999px; font-weight: 700; font-size: 1rem; color: var(--brand); background: transparent; border: 2px solid var(--brand); }
nav.tab-bar .tab.active { background: var(--brand); color: var(--brand-ink); }
nav.tab-bar .tab.give { background: #ffbf00; color: #222222; border-color: #222222; }
nav.tab-bar .tab.link:last-child:nth-child(odd) { grid-column: 1 / -1; }
nav.tab-bar .tab.disabled { opacity: 0.45; cursor: default; }
`;

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
      <style>{buttonStyles}</style>
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
            className="tab give"
            target="_blank"
            rel="noopener noreferrer"
          >
            Give
          </a>
        ) : (
          <span className="tab give disabled" title="Giving link not set up yet">
            Give
          </span>
        )}
        {LINK_BUTTONS.map((l) => {
          const url = (l.url || "").trim();
          if (!url) {
            return (
              <span
                key={l.label}
                className="tab link disabled"
                aria-disabled="true"
              >
                {l.label}
              </span>
            );
          }
          return (
            <a
              key={l.label}
              href={url}
              className="tab link"
              {...(/^https?:/i.test(url)
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {l.label}
            </a>
          );
        })}
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

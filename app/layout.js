import "./globals.css";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

const churchName =
  process.env.NEXT_PUBLIC_CHURCH_NAME || "Great Awakening International";

export const metadata = {
  title: `${churchName} Announcements`,
  description: `Announcements and updates for ${churchName}`,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: `${churchName} Announcements`,
  },
};

export const viewport = {
  themeColor: "#7a1f2b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}

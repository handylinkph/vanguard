import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { OfflineBootstrap } from "@/components/offline/connectivity";
import { ErrorReporter } from "@/components/offline/error-reporter";

export const metadata: Metadata = {
  title: { default: "Vanguard — Disaster preparedness for every Filipino", template: "%s · Vanguard" },
  description: "Plan, prepare and practise for typhoons, earthquakes, floods and more. Ready at all times, all things, all places.",
  manifest: "/manifest.webmanifest",
  applicationName: "Vanguard",
  appleWebApp: { capable: true, title: "Vanguard", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#0b1f3a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-PH">
      <body>
        {children}
        <OfflineBootstrap signedIn={false} />
        <ErrorReporter />
      </body>
    </html>
  );
}

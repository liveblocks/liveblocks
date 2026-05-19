import "./globals.css";
import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

import { LiveblocksClientProvider } from "@/components/LiveblocksClientProvider";

export const metadata = {
  title: "Markdown Versions",
  description:
    "Multiplayer markdown editor with version history (Liveblocks + Yjs + Monaco)",
};

// Inline script that runs before React hydration. Reads the stored theme
// (or falls back to the OS preference) and sets the `dark` class on
// `<html>` so the first paint matches the user's choice with no flash.
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = stored ? stored === "dark" : prefersDark;
    if (isDark) document.documentElement.classList.add("dark");
  } catch (_) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://liveblocks.io/favicon-32x32.png"
          rel="icon"
          sizes="32x32"
          type="image/png"
        />
        <link
          href="https://liveblocks.io/favicon-16x16.png"
          rel="icon"
          sizes="16x16"
          type="image/png"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SessionProvider>
          <LiveblocksClientProvider>{children}</LiveblocksClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

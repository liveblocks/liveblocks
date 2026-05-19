import "./globals.css";
import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

import { LiveblocksClientProvider } from "@/components/LiveblocksClientProvider";

export const metadata = {
  title: "Markdown Versions",
  description:
    "Multiplayer markdown editor with version history (Liveblocks + Yjs + Monaco)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
      </head>
      <body>
        <SessionProvider>
          <LiveblocksClientProvider>{children}</LiveblocksClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

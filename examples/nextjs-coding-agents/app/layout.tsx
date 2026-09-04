import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { LoadingScreen, Providers } from "@/app/providers";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Liveblocks Coding Agents",
  description:
    "A multiplayer coding-agent chat built with Liveblocks Feeds, Notifications, Presence, and the Cursor SDK.",
};

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
      <body className={`${inter.className} h-dvh overflow-hidden`}>
        <Suspense fallback={<LoadingScreen />}>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}

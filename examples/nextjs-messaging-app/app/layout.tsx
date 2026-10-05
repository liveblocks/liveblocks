import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Liveblocks Messaging App",
  description:
    "A Slack-like messaging demo built with Liveblocks Feeds, Storage, and Presence.",
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
        {children}
      </body>
    </html>
  );
}

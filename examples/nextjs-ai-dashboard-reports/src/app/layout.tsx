import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import React from "react";
import { Providers } from "./providers";
import { AiPopup } from "@/ai-popup/AiPopup";
import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-ui/styles/dark/attributes.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liveblocks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, user-scalable=no" />
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
      <body
        className={`${GeistSans.className} overflow-x-hidden overflow-y-scroll scroll-auto bg-gray-50 antialiased selection:bg-blue-100 selection:text-blue-700 dark:bg-gray-950`}
      >
        <Providers>
          <div>{children}</div>
          <AiPopup />
        </Providers>
      </body>
    </html>
  );
}

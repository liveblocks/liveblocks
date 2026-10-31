import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { type ReactNode, Suspense } from "react";
import { GOOGLE_ENABLED } from "@/lib/auth";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Language Tutoring - Liveblocks",
};

const sans = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
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
      <body className="absolute inset-0 bg-neutral-50 font-sans text-neutral-900 antialiased">
        <Suspense>
          <Providers googleEnabled={GOOGLE_ENABLED}>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}

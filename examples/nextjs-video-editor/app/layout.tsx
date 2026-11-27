import "./globals.css";
import type { Metadata } from "next";
import {
  Anton,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
} from "next/font/google";
import { ReactNode, Suspense } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Liveblocks — Video editor",
};

// Inter for the interface; the others are the fonts text clips can use.
const sans = Inter({ subsets: ["latin"], variable: "--font-inter" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});
const display = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} ${display.variable} ${mono.variable}`}
    >
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
      <body>
        <Providers>
          <Suspense>{children}</Suspense>
        </Providers>
      </body>
    </html>
  );
}

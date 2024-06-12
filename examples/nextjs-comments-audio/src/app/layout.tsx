import { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: "Soundblocks | Liveblocks example",
  description:
    "This example shows how to build a audio player with comments using Liveblocks, and Next.js.",
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
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
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Suspense } from "react";
import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: "Parallel | Liveblocks example",
  description:
    "This example shows how to build a project manager using Liveblocks, and Next.js.",
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
      <Suspense>
        <body className="bg-neutral-200/50 text-gray-900 antialiased absolute inset-0 overflow-hidden">
          <Providers>{children}</Providers>
        </body>
      </Suspense>
    </html>
  );
}

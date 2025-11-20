import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { auth } from "@/auth/manager";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

import "./globals.css";
import { Shell } from "./_components/shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Collaboration notifications",
};

// Learn how to structure your collaborative Next.js app
// https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-nextjs-app-directory

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
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
      <body className={inter.className}>
        <Providers session={session}>
          <Shell>{children}</Shell>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}

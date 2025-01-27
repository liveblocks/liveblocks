import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { auth } from "@/auth/manager";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Liveblocks User Notifications",
};

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
          <main className="text-base bg-background/95 text-foreground">
            {children}
          </main>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}

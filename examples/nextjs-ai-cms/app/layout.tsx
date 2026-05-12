import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Providers } from "./Providers";
import DefaultLayout from "./components/DefaultLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Liveblocks — Next.js AI CMS",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://liveblocks.io/favicon-32x32.png"
          rel="icon"
          sizes="32x32"
          type="image/png"
        />
      </head>
      <body className={inter.className}>
        <main className="text-base relative h-screen max-h-screen bg-zinc-50 text-zinc-900">
          <Suspense>
            <Providers>
              <DefaultLayout>{children}</DefaultLayout>
            </Providers>
          </Suspense>
        </main>
      </body>
    </html>
  );
}

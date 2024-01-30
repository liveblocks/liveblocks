import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

import "../styles/globals.css";
import "../styles/text-editor.css";
import "@liveblocks/react-comments/styles.css";
import "@liveblocks/react-comments/styles/dark/media-query.css";
import "../styles/text-editor-comments.css";
import { ClientProviders } from "@/app/ClientProviders";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Liveblocks Starter Kit",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <SessionProvider session={session}>
      <ClientProviders>
        <html lang="en">
          <head>
            <link href="/favicon.svg" rel="icon" type="image/svg" />
          </head>
          <body className={inter.className}>{children}</body>
        </html>
      </ClientProviders>
    </SessionProvider>
  );
}

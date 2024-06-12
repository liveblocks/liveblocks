import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/app/Providers";
import { auth } from "@/auth";
import "../styles/normalize.css";
import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-ui/styles/dark/media-query.css";
import "../styles/globals.css";
import "../styles/text-editor.css";
import "../styles/text-editor-comments.css";

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
    <html lang="en">
      <body className={inter.className}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}

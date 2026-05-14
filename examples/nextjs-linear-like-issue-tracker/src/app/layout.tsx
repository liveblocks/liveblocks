import { Metadata } from "next";
import { Inter } from "next/font/google";
import { ReactNode } from "react";
import { Providers } from "./Providers";
import "../globals.css";
import "../liveblocks.css";

export const metadata: Metadata = {
  title: "Liveblocks",
  description:
    "This example shows how to build a project manager using Liveblocks, and Next.js.",
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.className} absolute inset-0`}>
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
      <body className="bg-neutral-200/50 text-neutral-900 antialiased h-full w-full overflow-hidden">
        <Providers>{children}</Providers>

        <a
          className="fixed bottom-4 right-4"
          href="https://liveblocks.io"
          rel="noreferrer"
          target="_blank"
        >
          <picture>
            <source
              srcSet="https://liveblocks.io/badge-dark.svg"
              media="(prefers-color-scheme: dark)"
            />
            <img
              src="https://liveblocks.io/badge-light.svg"
              alt="Made with Liveblocks"
              className=""
            />
          </picture>
        </a>
      </body>
    </html>
  );
}

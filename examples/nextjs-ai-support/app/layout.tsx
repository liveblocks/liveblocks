import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Liveblocks",
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
        <link
          href="https://liveblocks.io/favicon-16x16.png"
          rel="icon"
          sizes="16x16"
          type="image/png"
        />
      </head>
      <body
        className={`${inter.className} text-neutral-900 flex flex-col justify-center items-stretch bg-neutral-50 antialiased gap-12 overflow-y-scroll`}
      >
        <Providers>
          <header className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
            <a
              className="font-semibold text-neutral-900 transition-opacity dark:text-neutral-50 opacity-100"
              href="/"
            >
              Acme Corp.
            </a>
            <div>
              <Image
                src="https://liveblocks.io/avatars/avatar-6.png"
                alt="User avatar"
                className="size-8 rounded-full bg-black dark:bg-white"
                width={32}
                height={32}
              />
            </div>
          </header>
          <div className="px-4">{children}</div>
          <footer></footer>
        </Providers>
      </body>
    </html>
  );
}

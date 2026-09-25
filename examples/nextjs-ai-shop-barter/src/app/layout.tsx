import Link from "next/link";
import "../styles/globals.css";
import { Providers } from "./Providers";
import Image from "next/image";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Liveblocks</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, user-scalable=no" />
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
      <body className="absolute inset-0 flex flex-col overflow-x-hidden overflow-y-auto">
        <Providers>
          <header className="border-b border-gray-200 px-8 flex items-center justify-between gap-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="32 45 64 38"
              fill="none"
            >
              <g id="group" fill="black" fillRule="evenodd" clipRule="evenodd">
                <path id="top" d="M96 83H51L83.0504 51V69.56L96 83Z" />
                <path id="bottom" d="M32 45H77L44.9496 77V58.44L32 45Z" />
              </g>
            </svg>

            <nav className="flex grow justify-between items-center py-5 text-sm text-neutral-600 font-medium">
              <span className="flex gap-7">
                <Link href="#">Home</Link>
                <Link href="#">Women</Link>
                <Link href="#">Men</Link>
                <Link href="#">Children</Link>
              </span>

              <Link href="#" className="flex items-center">
                <span className="sr-only">Cart</span>
                <svg
                  className="size-6 shrink-0 text-neutral-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                  data-slot="icon"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                  />
                </svg>
              </Link>
            </nav>
          </header>
          <main className="grow min-h-0 h-full">{children}</main>
          <footer></footer>
        </Providers>
      </body>
    </html>
  );
}

import { Inter } from "next/font/google"
import type { Metadata } from "next"
import React from "react"
import { Providers } from "./providers"
import { AiPopup } from "@/ai-popup/AiPopup"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-ui/styles/dark/attributes.css"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Liveblocks",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
      <body
        className={`${inter.className} overflow-x-hidden overflow-y-scroll scroll-auto bg-neutral-50 antialiased selection:bg-blue-100 selection:text-blue-700 dark:bg-black`}
      >
        <Providers>
          <div>{children}</div>
          <AiPopup />
        </Providers>
      </body>
    </html>
  )
}

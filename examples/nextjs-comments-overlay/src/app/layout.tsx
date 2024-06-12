import "@/styles/globals.css";
import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import { Header } from "@/components/site/Header";
import { Providers } from "./Providers";

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
  weight: ["400", "500", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Liveblocks",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
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
      <body className={archivo.variable + " " + inter.className}>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}

/**
 * Checking that your Liveblocks API key has been added
 * https://liveblocks.io/dashboard/apikeys
 */
const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
const API_KEY_WARNING = process.env.CODESANDBOX_SSE
  ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n`
  : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n`;

if (!API_KEY) {
  console.warn(API_KEY_WARNING);
}

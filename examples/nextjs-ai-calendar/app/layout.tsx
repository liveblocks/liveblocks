import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { ComponentProps } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liveblocks",
};

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  async function newChat() {
    "use server";

    const newChatId = nanoid();
    redirect(`/${newChatId}`);
  }
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} antialiased`}>
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
        className={`font-sans absolute antialiased inset-0 text-neutral-900 flex justify-center items-center bg-neutral-100/70`}
      >
        <Providers>
          <div className="flex h-full w-full overflow-hidden font-sans">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}

function ChatsIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 9a2 2 0 01-2 2H6l-4 4V4a2 2 0 012-2h8a2 2 0 012 2zM18 9h2a2 2 0 012 2v11l-4-4h-6a2 2 0 01-2-2v-1" />
    </svg>
  );
}

function PlusIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M7.9 20A9 9 0 104 16.1L2 22zM8 12h8M12 8v8" />
    </svg>
  );
}

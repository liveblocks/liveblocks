import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { ChatList } from "./chat-list";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Liveblocks",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  async function newChat() {
    "use server";

    const newChatId = nanoid();
    redirect(`/${newChatId}`);
  }
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
      <Providers>
        <body className={`${inter.className} absolute inset-0 text-stone-900`}>
          <div className="flex h-full">
            <aside className="w-[260px] bg-stone-100 border-r border-stone-200 shrink-0 flex flex-col gap-4">
              <Link href="/" className="p-4 pb-1 text-stone-900 font-medium">
                Acme
              </Link>

              <form action={newChat} className="block w-full">
                <button className="p-2 text-sm hover:bg-stone-300/50 rounded-md mx-2 text-left flex items-center gap-1.5 text-orange-700 font-medium justify-self-stretch">
                  <PlusIcon />
                  New chat
                </button>
              </form>

              <div className="p-2">
                <div className="p-2 pb-1 text-stone-600 font-medium text-xs">
                  Recents
                </div>
                <ChatList />
              </div>
            </aside>
            <main className="relative grow">{children}</main>
          </div>
        </body>
      </Providers>
    </html>
  );
}

function PlusIcon() {
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
    >
      <circle cx={12} cy={12} r={10} />
      <path d="M8 12h8M12 8v8" />
    </svg>
  );
}

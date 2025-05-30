import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { ChatList } from "./chat-list";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { ComponentProps } from "react";
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
      <body className={`${inter.className} absolute inset-0 text-stone-900`}>
        <Providers>
          <div className="flex h-full">
            <aside className="w-[260px] bg-stone-100 border-r border-stone-200 shrink-0 flex flex-col gap-4">
              <Link
                href="/chats"
                className="font-serif text-xl p-4 pb-1 text-stone-900 font-medium"
              >
                Acme
              </Link>

              <form action={newChat} className="block w-full">
                <button className="group p-2 text-sm hover:bg-stone-300/50 rounded-md mx-2 text-left flex items-center gap-1.5 text-orange-700 font-medium justify-self-stretch">
                  <PlusIcon className="opacity-80 group-hover:opacity-100" />
                  New chat
                </button>
                <Link
                  href="/chats"
                  className="group p-2 text-sm hover:bg-stone-300/50 rounded-md mx-2 text-left flex items-center gap-1.5 justify-self-stretch"
                >
                  <ChatsIcon className="opacity-70 group-hover:opacity-90" />
                  Chats
                </Link>
              </form>

              <div className="p-2">
                <div className="p-2 pb-1 text-stone-600 font-medium text-xs">
                  Recents
                </div>
                <ChatList />
              </div>
            </aside>

            <main className="relative grow bg-stone-50 overflow-y-scroll">
              {children}
            </main>
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

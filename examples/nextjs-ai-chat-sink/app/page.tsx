"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="h-screen w-full max-w-4xl mx-auto flex p-4 py-8 flex-col">
      <h1 className="text-2xl font-bold mb-4">Examples</h1>

      <div className="flex flex-col gap-4">
        <Link href="/chats" className="underline">
          Chats
        </Link>
        <Link href="/knowledge" className="underline">
          Knowledge
        </Link>
        <Link href="/todo" className="underline">
          Todo
        </Link>
      </div>
    </main>
  );
}

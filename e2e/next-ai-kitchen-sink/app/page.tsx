"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="h-screen w-full max-w-4xl mx-auto flex p-4 py-8 flex-col">
      <h1 className="text-2xl font-bold mb-4">Examples</h1>

      <div className="flex flex-col gap-4">
        <Link href="/simple" className="underline">
          Simple chat
        </Link>
        <Link href="/chats" className="underline">
          Multiple chats
        </Link>
        <Link href="/todo" className="underline">
          Todo list example
        </Link>
        <Link href="/knowledge" className="underline">
          Registering client-side knowledge
        </Link>
        <Link href="/dual-chat" className="underline">
          Dual chat - Knowledge isolation & sharing
        </Link>
        <Link href="/styles" className="underline">
          Default styles playground
        </Link>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";


export default function Home() {
  return (
    <main className="h-screen w-full max-w-4xl mx-auto flex p-4 py-8 flex-col">

      <h1 className="text-2xl font-bold mb-4">Feeds E2E Playground</h1>
      <ul>
        <li>
          <Link href="/kitchen-sink" className="text-blue-500 underline hover:text-blue-600">Kitchen Sink</Link>
        </li>
        <li>
          <Link href="/chat-room" className="text-blue-500 underline hover:text-blue-600">Chat Room</Link>
        </li>
      </ul>
    </main>
  );
}

"use client";

import Link from "next/link";


export default function Home() {
  return (
    <main className="h-screen w-full max-w-4xl mx-auto flex p-4 py-8 flex-col">

      <h1>Feeds E2E Playground</h1>
      <ul>
        <li>
          <Link href="/sample">Sample</Link>
        </li>
      </ul>
    </main>
  );
}

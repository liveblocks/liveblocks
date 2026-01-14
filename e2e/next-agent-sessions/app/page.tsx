"use client";

import Link from "next/link";


export default function Home() {
  return (
    <main className="h-screen w-full max-w-4xl mx-auto flex p-4 py-8 flex-col">

      <h1 className="text-2xl font-bold">Agent Sessions Examples</h1>
      <ul className="mt-4 list-disc">
        <li><Link href="/sample" className="underline">Sample</Link></li>
      </ul>
    </main>
  );
}

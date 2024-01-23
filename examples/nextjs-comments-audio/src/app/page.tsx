"use client";

import { Room } from "@/app/Room";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Logo } from "@/components/Logo";
import { Presence } from "@/components/Presence";
import RoomErrors from "@/components/RoomErrors";

export default function Home() {
  return (
    <Room>
      <div className="relative max-sm:py-4 p-6 mx-auto max-w-screen-lg flex flex-col">
        <header className="flex justify-between items-center">
          <h1 className="font-bold tracking-tight text-xl sm:text-2xl">
            <span className="sr-only">SoundBlocks</span>
            <Logo className="h-4 sm:h-5 w-auto" />
          </h1>
          <Presence />
        </header>
        <main className="mt-20 sm:mt-28">
          <AudioPlayer />
        </main>
      </div>
      <RoomErrors />
    </Room>
  );
}

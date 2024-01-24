"use client";

import { Room } from "@/app/Room";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Logo } from "@/components/Logo";
import { Presence } from "@/components/Presence";
import RoomErrors from "@/components/RoomErrors";
import { Threads } from "@/components/Threads";

export default function Home() {
  return (
    <Room>
      <div className="relative py-4 px-5 sm:p-6 mx-auto max-w-screen-lg flex flex-col">
        <header className="flex justify-between items-center">
          <h1>
            <span className="sr-only">SoundBlocks</span>
            <Logo className="h-4 sm:h-5 w-auto fill-current" />
          </h1>
          <Presence />
        </header>
        <main className="pt-20 pb-16">
          <AudioPlayer />
          <Threads />
        </main>
      </div>
      <RoomErrors />
    </Room>
  );
}

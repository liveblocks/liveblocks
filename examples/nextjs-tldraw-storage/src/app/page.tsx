"use client";

import { Room } from "@/app/Room";
import { StorageTldraw } from "@/components/StorageTldraw";

export default function Home() {
  return (
    <Room>
      <StorageTldraw />
    </Room>
  );
}

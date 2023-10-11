"use client";

import { ReactNode } from "react";
import { RoomProvider } from "@/liveblocks.config";
import { usePathname } from "next/navigation";

type Props = { children: ReactNode };

export function Room({ children }: Props) {
  // Using the current path as a unique room id
  const pathname = usePathname();

  return (
    <RoomProvider
      id={"http://localhost:3000" + pathname}
      initialPresence={{ cursor: null, editingText: null }}
    >
      {children}
    </RoomProvider>
  );
}

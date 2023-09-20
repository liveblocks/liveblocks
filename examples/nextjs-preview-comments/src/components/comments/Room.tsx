"use client";

import { ReactNode } from "react";
import { RoomProvider } from "@/liveblocks.config";
import { usePathname } from "next/navigation";

type Props = { children: ReactNode };

export function Room({ children }: Props) {
  // Using the current path as a unique room id
  const pathname = usePathname();

  // Display edit controls if `?edit=true`
  // const searchParams = useSearchParams();
  // if (searchParams.get("edit") !== "true") {
  //   return children;
  // }

  return (
    <RoomProvider
      // id={"http://localhost:3000" + pathname}
      id="my-temporary-room-name-11"
      initialPresence={{ cursor: null }}
    >
      {children}
    </RoomProvider>
  );
}

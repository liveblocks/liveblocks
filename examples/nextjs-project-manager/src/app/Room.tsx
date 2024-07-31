"use client";

import { RoomProvider } from "@liveblocks/react/suspense";
import { LiveList, LiveObject } from "@liveblocks/client";
import { useSearchParams } from "next/navigation";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { getRoomId } from "@/config";

export function Room({
  children,
  issueId,
}: {
  children: ReactNode;
  issueId: string;
}) {
  const initialRoomId = useExampleRoomId(getRoomId(issueId));

  return (
    <RoomIdProvider initialRoomId={initialRoomId}>
      <RoomComponent>{children}</RoomComponent>
    </RoomIdProvider>
  );
}

function RoomComponent({ children }: { children: ReactNode }) {
  const { roomId } = useRoomId();

  return (
    <RoomProvider
      id={roomId}
      initialStorage={{
        meta: new LiveObject({ title: "Untitled issue" }),
        properties: new LiveObject({
          progress: "none",
          priority: "none",
          assignedTo: "none",
        }),
        labels: new LiveList([]),
      }}
    >
      {children}
    </RoomProvider>
  );
}

type RoomIdContextType = {
  roomId: string;
  setRoomId: (roomId: string) => void;
};

const RoomIdContext = createContext<RoomIdContextType | undefined>(undefined);

export function useRoomId() {
  const context = useContext(RoomIdContext);
  if (!context) {
    throw new Error("useRoomId must be used within a RoomIdProvider");
  }
  return context;
}

export function RoomIdProvider({
  children,
  initialRoomId,
}: {
  children: ReactNode;
  initialRoomId: string;
}) {
  const [roomId, setRoomId] = useState(initialRoomId);

  return (
    <RoomIdContext.Provider value={{ roomId, setRoomId }}>
      {children}
    </RoomIdContext.Provider>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");

  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}

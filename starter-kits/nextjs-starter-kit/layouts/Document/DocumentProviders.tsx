import { RoomProvider } from "@liveblocks/react/suspense";
import { ReactNode } from "react";
import { InitialDocumentProvider } from "@/lib/hooks";
import {
  createInitialPresence,
  createInitialStorage,
} from "@/liveblocks.config";
import { Document } from "@/types";

type Props = {
  roomId: string;
  initialDocument: Document;
  children: ReactNode;
};

export function DocumentProviders({
  roomId,
  initialDocument,
  children,
}: Props) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={createInitialPresence()}
      initialStorage={createInitialStorage()}
    >
      <InitialDocumentProvider initialDocument={initialDocument}>
        {children}
      </InitialDocumentProvider>
    </RoomProvider>
  );
}

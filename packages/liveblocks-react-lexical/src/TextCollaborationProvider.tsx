/**
 * NOTE: this will move into RoomProvider or another package so it can be used by other text editors
 **/

import type { BaseUserMeta, Json, JsonObject, LsonObject } from "@liveblocks/client";
import { useRoomContextBundle } from "@liveblocks/react";
import LiveblocksProvider from "@liveblocks/yjs";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Doc } from "yjs";

interface TextCollaborationContext {
  provider?: LiveblocksProvider<JsonObject, LsonObject, BaseUserMeta, Json>;
  doc: Doc;
}

const TextCollabContext = createContext<TextCollaborationContext | null>(null);

function useTextCollaboration(): TextCollaborationContext {
  const textCollabContext = useContext(TextCollabContext);

  if (!textCollabContext) {
    throw new Error(
      "useTextCollaboration has to be used within <TextCollaborationProvider>"
    );
  }

  return textCollabContext;
}

function useDocumentSyncState(): { synced: boolean } {
  const textCollabContext = useContext(TextCollabContext);
  const [synced, setSynced] = useState(textCollabContext?.provider?.synced || false);

  if (!textCollabContext) {
    throw new Error(
      "useDocumentSyncState has to be used within <TextCollaborationProvider>"
    );
  }
  const { provider } = textCollabContext;
  useEffect(() => {
    if (!provider) {
      return;
    }
    provider.on("sync", setSynced);
    return () => {
      provider.off("sync", setSynced)
    }
  }, [provider])

  return { synced };
}

function TextCollaborationProvider({ children }: { children: React.ReactNode }) {
  const { useRoom } = useRoomContextBundle();
  const [provider, setProvider] = useState<LiveblocksProvider<JsonObject, LsonObject, BaseUserMeta, Json> | undefined>();
  const room = useRoom();
  const doc = useMemo(() => new Doc(), []);
  useEffect(() => {
    const _provider = new LiveblocksProvider(room, doc);
    setProvider(_provider);
    return () => {
      _provider.destroy();
      setProvider(undefined);
    }
  }, [room, doc]);

  return <TextCollabContext.Provider value={{ provider, doc }}>{children}</TextCollabContext.Provider>
}
export { TextCollaborationProvider, useDocumentSyncState, useTextCollaboration }
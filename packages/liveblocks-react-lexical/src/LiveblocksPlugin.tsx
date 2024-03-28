
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import type { Provider } from "@lexical/yjs";
import { useRoomContextBundle } from "@liveblocks/react";
import LiveblocksProvider from "@liveblocks/yjs";
import React from "react";
import * as Y from "yjs";

export const LiveblocksPlugin = (): JSX.Element => {
  const { useRoom } = useRoomContextBundle();
  const room = useRoom();
  return (<CollaborationPlugin
    providerFactory={(id, yjsDocMap) => {
      const doc = new Y.Doc();
      yjsDocMap.set(id, doc);
      const provider = new LiveblocksProvider(room, doc) as Provider;
      return provider;
    }}
    id="liveblocks-yjs-plugin"
    shouldBootstrap={true}
  />)
};

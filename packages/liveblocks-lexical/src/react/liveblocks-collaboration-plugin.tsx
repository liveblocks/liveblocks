import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Room } from "@liveblocks/client";
import { useEffect, useRef } from "react";

import { LiveblocksCollaboration } from "../collaboration";
import type { LiveRootNode } from "../types";
import { RemoteCursorsPlugin } from "./remote-cursors";

export type LiveblocksCollaborationPluginProps = {
  room: Room;
  root: LiveRootNode;
};

export function LiveblocksCollaborationPlugin({
  room,
  root,
}: LiveblocksCollaborationPluginProps) {
  const [editor] = useLexicalComposerContext();
  const _collaboration = useRef<LiveblocksCollaboration | null>(null);
  if (_collaboration.current === null) {
    _collaboration.current = new LiveblocksCollaboration(editor, room, root);
  }
  const collaboration = _collaboration.current;

  useEffect(() => {
    collaboration.register();
    return () => {
      collaboration.unregister();
    };
  }, [collaboration]);

  return (
    <RemoteCursorsPlugin
      manager={collaboration.manager}
      root={root}
      room={room}
    />
  );
}

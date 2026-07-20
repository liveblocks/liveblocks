import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef, createContext } from "react";

import { LiveblocksCollaboration } from "../collaboration";
import type { LiveRootNode } from "../types";
import { useRoom } from "@liveblocks/react";

export type LiveblocksCollaborationPluginProps = {
  root: LiveRootNode;
  children?: React.ReactNode;
};

export const LiveblocksCollaborationContext =
  createContext<LiveblocksCollaboration | null>(null);

export function LiveblocksCollaborationPlugin({
  root,
  children,
}: LiveblocksCollaborationPluginProps) {
  const [editor] = useLexicalComposerContext();
  const room = useRoom();

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
    <LiveblocksCollaborationContext.Provider value={collaboration}>
      {children}
    </LiveblocksCollaborationContext.Provider>
  );
}

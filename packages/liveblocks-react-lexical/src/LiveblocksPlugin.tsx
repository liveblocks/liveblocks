
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Provider } from "@lexical/yjs";
import { useRoomContextBundle } from "@liveblocks/react";
import React, { useCallback, useEffect } from "react";
import type { Doc } from "yjs";

import { useDocumentSyncState, useTextCollaboration } from "./TextCollaborationProvider";

export type LiveblocksPluginProps = {
  /**
   * Optionally override user information. If not, user["info"] from auth will be used.
   */
  userInfo?: {
    name: string,
    color?: string,
  }
  /**
   * Whether or not the user can edit the document before it has been synced
   * default: true
   */
  allowEditsBeforeSync?: boolean

}

export const LiveblocksPlugin = ({ userInfo = undefined, allowEditsBeforeSync = true }: LiveblocksPluginProps): JSX.Element => {
  const { useSelf } = useRoomContextBundle();
  const { provider, doc } = useTextCollaboration();
  const [editor] = useLexicalComposerContext();
  const { synced } = useDocumentSyncState();

  // Get user info
  const info = useSelf(me => me.info);
  const username = userInfo?.name ?? info?.name;
  const cursorcolor = userInfo?.color ?? info?.color as string | undefined;

  // Disable the editor before sync
  useEffect(() => {
    if (!allowEditsBeforeSync) {
      editor.setEditable(synced);
    }
  }, [synced, editor, allowEditsBeforeSync]);

  // Create the provider factory
  const providerFactor = useCallback((id: string, yjsDocMap: Map<string, Doc>) => {
    yjsDocMap.set(id, doc);
    return provider as Provider;
  }, [provider, doc]);

  return (
    <>{provider &&   // NOTE: if we used suspense, we wouldn't need this provider &&
      <CollaborationPlugin
        providerFactory={providerFactor}
        id={"liveblocks-document"}
        username={username}
        cursorColor={cursorcolor}
        shouldBootstrap={true}
      />}
    </>)
};

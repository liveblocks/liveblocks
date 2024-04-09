
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Provider } from "@lexical/yjs";
import { useRoomContextBundle } from "@liveblocks/react";
import type { LexicalEditor } from "lexical";
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

  /**
   * Modify the state with this function to set the initial state. 
   * Ex. $createTextNode('initial text content'); 
   * 
   * @param editor 
   * @returns void
   */
  initialEditorState?: (editor: LexicalEditor) => void;

}

export const LiveblocksPlugin = ({ userInfo = undefined, allowEditsBeforeSync = true, initialEditorState = undefined }: LiveblocksPluginProps): JSX.Element => {
  const { useSelf } = useRoomContextBundle();
  const { provider, doc } = useTextCollaboration();
  const [editor] = useLexicalComposerContext();
  const { synced } = useDocumentSyncState();

  // Warn users if initialConfig.editorState, set on the composer, is not null
  useEffect(() => {
    // only in dev mode
    if (process.env.NODE_ENV !== "production") {
      // A user should not even be set an emptyState, but when passing null, getEditorState still has initial empty state
      if (!editor.getEditorState().isEmpty()) {
        console.warn("Warning: LiveblocksPlugin: editorState in initialConfig detected, but must be null.");
      }
    }
    // we know editor is already defined as we're inside LexicalComposer, and we only want this running the first time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get user info or allow override from props
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
        initialEditorState={initialEditorState}
        id={"liveblocks-document"}
        username={username}
        cursorColor={cursorcolor}
        shouldBootstrap={true}
      />}
    </>)
};

import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Provider } from "@lexical/yjs";
import type { ThreadSelection } from "@liveblocks/core";
import {
  ThreadSelectionGetterContext,
  useRoomContextBundle,
} from "@liveblocks/react";
import { $getSelection, $isRangeSelection, type LexicalEditor } from "lexical";
import React, { useCallback, useEffect } from "react";
import type { Doc } from "yjs";

import { CommentPluginProvider } from "./CommentPluginProvider";
import { LastActiveSelection } from "./LastActiveSelection";
import {
  useDocumentSyncState,
  useTextCollaboration,
} from "./TextCollaborationProvider";
import { getDomPath } from "./utils";

export type LiveblocksPluginProps = {
  /**
   * Optionally override user information. If not, user["info"] from auth will be used.
   */
  userInfo?: {
    name: string;
    color?: string;
  };
  /**
   * Whether or not the user can edit the document before it has been synced
   * default: true
   */
  allowEditsBeforeSync?: boolean;

  /**
   * Modify the state with this function to set the initial state.
   * Ex. $createTextNode('initial text content');
   *
   * @param editor
   * @returns void
   */
  initialEditorState?: (editor: LexicalEditor) => void;

  children?: React.ReactNode;
};

function $getEditorSelection(): ThreadSelection | undefined {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return undefined;
  const focus = selection.focus;
  const anchor = selection.anchor;
  const isBackward = selection.isBackward();
  const anchorPath = getDomPath(anchor.getNode());
  const focusPath = getDomPath(focus.getNode());

  return {
    editor: "lexical",
    anchorPath,
    anchorOffset: anchor.offset,
    anchorType: anchor.type,
    focusPath,
    focusOffset: focus.offset,
    focusType: focus.type,
    isBackward,
  };
}

export const LiveblocksPlugin = ({
  userInfo = undefined,
  allowEditsBeforeSync = true,
  initialEditorState = undefined,
  children,
}: LiveblocksPluginProps): JSX.Element => {
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
        console.warn(
          "Warning: LiveblocksPlugin: editorState in initialConfig detected, but must be null."
        );
      }
    }
    // we know editor is already defined as we're inside LexicalComposer, and we only want this running the first time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get user info or allow override from props
  const info = useSelf((me) => me.info);
  const username = userInfo?.name ?? info?.name;
  const cursorcolor = userInfo?.color ?? (info?.color as string | undefined);

  // Disable the editor before sync
  useEffect(() => {
    if (!allowEditsBeforeSync) {
      editor.setEditable(synced);
    }
  }, [synced, editor, allowEditsBeforeSync]);

  // Create the provider factory
  const providerFactory = useCallback(
    (id: string, yjsDocMap: Map<string, Doc>) => {
      yjsDocMap.set(id, doc);
      return provider as Provider;
    },
    [provider, doc]
  );

  const getEditorSelection = useCallback((): ThreadSelection | undefined => {
    const state = editor.getEditorState();
    const selection = state.read(() => $getEditorSelection());
    return selection;
  }, [editor]);

  return (
    <ThreadSelectionGetterContext.Provider value={getEditorSelection}>
      {provider && (
        <CollaborationPlugin
          providerFactory={providerFactory}
          initialEditorState={initialEditorState}
          id={"liveblocks-document"}
          username={username}
          cursorColor={cursorcolor}
          shouldBootstrap={true}
        />
      )}
      <CommentPluginProvider>
        <LastActiveSelection />
        {children}
      </CommentPluginProvider>
    </ThreadSelectionGetterContext.Provider>
  );
};

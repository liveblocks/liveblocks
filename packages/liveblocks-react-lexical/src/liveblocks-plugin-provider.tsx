import { CollaborationContext } from "@lexical/react/LexicalCollaborationContext";
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Provider } from "@lexical/yjs";
import { kInternal, nn } from "@liveblocks/core";
import { useClient, useRoom, useSelf } from "@liveblocks/react";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import React, { useCallback, useContext, useEffect, useRef } from "react";
import { Doc } from "yjs";

import { CommentPluginProvider } from "./comments/comment-plugin-provider";
import { MentionPlugin } from "./mentions/mention-plugin";

// TODO: Replace by ref once I understand why useRef is not stable (?!)
const providersMap = new Map<
  string,
  LiveblocksYjsProvider<never, never, never, never, never>
>();

export type LiveblocksPluginProps = {
  children?: React.ReactNode;
};

export const LiveblocksPlugin = ({
  children,
}: LiveblocksPluginProps): JSX.Element => {
  const client = useClient();
  const hasResolveMentionSuggestions =
    client[kInternal].resolveMentionSuggestions !== undefined;
  const [editor] = useLexicalComposerContext();
  const room = useRoom();
  const collabContext = useContext(CollaborationContext);
  const previousRoomIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    // Report that this is lexical and root is the rootKey
    room[kInternal].reportTextEditor("lexical", "root");
  }, [room]);

  // Get user info or allow override from props
  const info = useSelf((me) => me.info);
  const username = info?.name || ""; // use empty string to prevent random name
  const cursorcolor = info?.color as string | undefined;

  const providerFactory = useCallback(
    (id: string, yjsDocMap: Map<string, Doc>): Provider => {
      // Destroy previously used provider to avoid memory leaks
      // TODO: Find a way to destroy the last used provider on unmount (while working with StrictMode)
      if (
        previousRoomIdRef.current !== null &&
        previousRoomIdRef.current !== id
      ) {
        const previousProvider = providersMap.get(id);
        if (previousProvider !== undefined) {
          previousProvider.destroy();
        }
      }

      let doc = yjsDocMap.get(id);

      if (doc === undefined) {
        doc = new Doc();
        const provider = new LiveblocksYjsProvider(room, doc);
        yjsDocMap.set(id, doc);
        providersMap.set(id, provider);
      }

      return nn(
        providersMap.get(id),
        "Internal error. Should never happen"
      ) as Provider;
    },
    [room]
  );

  useEffect(() => {
    collabContext.name = username || "";
  }, [collabContext, username]);

  return (
    <>
      <CollaborationPlugin
        // Setting the key allows us to reset the internal Y.doc used by useYjsCollaboration
        // without implementing `reload` event
        key={room.id}
        id={room.id}
        providerFactory={providerFactory}
        username={username}
        cursorColor={cursorcolor}
        shouldBootstrap={true}
      />

      {hasResolveMentionSuggestions && <MentionPlugin />}

      <CommentPluginProvider>{children}</CommentPluginProvider>
    </>
  );
};

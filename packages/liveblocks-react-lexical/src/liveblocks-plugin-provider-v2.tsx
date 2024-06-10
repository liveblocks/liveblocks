import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Provider } from "@lexical/yjs";
import type {
  BaseMetadata,
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
} from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import { useClient, useRoom, useSelf } from "@liveblocks/react";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Doc } from "yjs";

import { CommentPluginProvider } from "./comments/comment-plugin-provider";
import { MentionPlugin } from "./mentions/mention-plugin";

export type LiveblocksPluginProps = {
  children?: React.ReactNode;
};

export const LiveblocksPlugin = ({ children }: LiveblocksPluginProps) => {
  const [editor] = useLexicalComposerContext();
  const room = useRoom();

  const [provider, setProvider] = useState<
    | LiveblocksYjsProvider<
      JsonObject,
      LsonObject,
      BaseUserMeta,
      Json,
      BaseMetadata
    >
    | undefined
  >();

  const doc = useMemo(() => new Doc(), []);

  useEffect(() => {
    const _provider = new LiveblocksYjsProvider(room, doc);
    setProvider(_provider);
    return () => {
      _provider.destroy();
      setProvider(undefined);
    };
  }, [room, doc]);

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

    // Report that this is lexical and root is the rootKey
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    // room[kInternal].reportTextEditor("lexical", "root");

    // we know editor is already defined as we're inside LexicalComposer, and we only want this running the first time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (provider === undefined) return null;

  return (
    <LiveblocksPluginImpl doc={doc} provider={provider}>
      {children}
    </LiveblocksPluginImpl>
  );
};

function LiveblocksPluginImpl({
  doc,
  provider,
  children,
}: {
  doc: Doc;
  provider: LiveblocksYjsProvider<
    JsonObject,
    LsonObject,
    BaseUserMeta,
    Json,
    BaseMetadata
  >;
  children: ReactNode;
}) {
  const self = useSelf();
  const client = useClient();
  const hasResolveMentionSuggestions =
    client[kInternal].resolveMentionSuggestions !== undefined;

  // Create the provider factory
  const providerFactory = useCallback(
    (id: string, yjsDocMap: Map<string, Doc>) => {
      yjsDocMap.set(id, doc);
      return provider as Provider;
    },
    [provider, doc]
  );

  if (self === null) return null;

  const name = self.info?.name;
  const color = self.info?.color;

  return (
    <>
      <CollaborationPlugin
        providerFactory={providerFactory}
        id={"liveblocks-document"}
        username={name}
        cursorColor={typeof color === "string" ? color : undefined}
        shouldBootstrap={true}
      />
      {hasResolveMentionSuggestions && <MentionPlugin />}

      <CommentPluginProvider>{children}</CommentPluginProvider>
    </>
  );
}

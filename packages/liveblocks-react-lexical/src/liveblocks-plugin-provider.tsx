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
import LiveblocksProvider from "@liveblocks/yjs";
import type { ComponentType } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Doc } from "yjs";

import { CommentPluginProvider } from "./comments/comment-plugin-provider";
import type { MentionSuggestionsProps } from "./liveblocks-config";
import { getLiveblocksLexicalConfig } from "./liveblocks-config";
import type { createMentionNodeFactory } from "./mentions/mention-node";
import MentionPlugin from "./mentions/mention-plugin";

export type LiveblocksPluginProps = {
  // TODO: Move these configuration options (if applicable and necessary) to the `liveblocksLexicalConfig` function to have all configuration in one place
  // /**
  //  * Optionally override user information. If not, user["info"] from auth will be used.
  //  */
  // userInfo?: {
  //   name: string;
  //   color?: string;
  // };
  // /**
  //  * Whether or not the user can edit the document before it has been synced
  //  * default: true
  //  */
  // allowEditsBeforeSync?: boolean;

  // /**
  //  * Modify the state with this function to set the initial state.
  //  * Ex. $createTextNode('initial text content');
  //  *
  //  * @param editor
  //  * @returns void
  //  */
  // initialEditorState?: (editor: LexicalEditor) => void;

  children?: React.ReactNode;
};

export interface LiveblocksLexicalInternalConfig {
  comments: boolean;
  mentions: {
    factory: ReturnType<typeof createMentionNodeFactory>;
    components: {
      MentionSuggestions: ComponentType<MentionSuggestionsProps>;
    };
  };
}

const LiveblocksLexicalConfigContext =
  createContext<LiveblocksLexicalInternalConfig | null>(null);

export const LiveblocksPlugin = ({
  // userInfo = undefined,
  // allowEditsBeforeSync = true,
  // initialEditorState = undefined,
  children,
}: LiveblocksPluginProps): JSX.Element => {
  const client = useClient();
  const hasResolveMentionSuggestions =
    client[kInternal].resolveMentionSuggestions !== undefined;
  const [editor] = useLexicalComposerContext();
  const room = useRoom();

  // TODO: Fix typing
  const [provider, setProvider] = useState<
    | LiveblocksProvider<
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
    const _provider = new LiveblocksProvider(room, doc);
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
    room[kInternal].reportTextEditor("lexical", "root");

    // we know editor is already defined as we're inside LexicalComposer, and we only want this running the first time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get user info or allow override from props
  const info = useSelf((me) => me.info);
  const username = info?.name;
  const cursorcolor = info?.color as string | undefined;

  // const [synced, setSynced] = useState(false);

  // useEffect(() => {
  //   if (!provider) {
  //     return;
  //   }
  //   provider.on("sync", setSynced);
  //   return () => {
  //     provider.off("sync", setSynced);
  //   };
  // }, [provider]);

  // // Disable the editor before sync
  // useEffect(() => {
  //   if (!allowEditsBeforeSync) {
  //     editor.setEditable(synced);
  //   }
  // }, [synced, editor, allowEditsBeforeSync]);

  // Create the provider factory
  const providerFactory = useCallback(
    (id: string, yjsDocMap: Map<string, Doc>) => {
      yjsDocMap.set(id, doc);
      return provider as Provider;
    },
    [provider, doc]
  );

  const configRef = useRef<LiveblocksLexicalInternalConfig | null>(null);
  if (configRef.current === null) {
    configRef.current = getLiveblocksLexicalConfig();
  }

  return (
    <LiveblocksLexicalConfigContext.Provider value={configRef.current}>
      {provider && (
        <CollaborationPlugin
          providerFactory={providerFactory}
          // initialEditorState={initialEditorState}
          id={"liveblocks-document"}
          username={username}
          cursorColor={cursorcolor}
          shouldBootstrap={true}
        />
      )}

      {hasResolveMentionSuggestions && <MentionPlugin />}

      {configRef.current.comments && (
        <CommentPluginProvider>{children}</CommentPluginProvider>
      )}
    </LiveblocksLexicalConfigContext.Provider>
  );
};

export function useLiveblocksLexicalConfigContext(): LiveblocksLexicalInternalConfig {
  const config = useContext(LiveblocksLexicalConfigContext);
  if (config === null) {
    throw new Error(
      "useLiveblocksLexicalConfigContext must be used within a LiveblocksPlugin"
    );
  }
  return config;
}

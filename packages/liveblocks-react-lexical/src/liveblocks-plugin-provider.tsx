import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Provider } from "@lexical/yjs";
import type {
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
  ThreadSelection,
} from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import {
  ThreadSelectionGetterContext,
  useRoomContextBundle,
} from "@liveblocks/react";
import LiveblocksProvider from "@liveblocks/yjs";
import type { ElementNode, LexicalEditor, TextNode } from "lexical";
import {
  $getSelection,
  $isRangeSelection,
  $isRootNode,
  $setSelection,
} from "lexical";
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
import { getLiveblocksLexicalConfig } from "./liveblocks-config";
import type { createMentionNodeFactory } from "./mentions/mention-node";
import MentionPlugin from "./mentions/mention-plugin";

export type LiveblocksPluginProviderProps = {
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

export interface LiveblocksLexicalInternalConfig {
  comments: boolean;
  mentions: {
    enabled: boolean;
    factory: ReturnType<typeof createMentionNodeFactory>;
  };
}

function getDomPath(el: TextNode | ElementNode | null) {
  const anchorNode = el;
  const path = [];
  let node = anchorNode;
  while (node !== null && !$isRootNode(node)) {
    path.unshift(node.getIndexWithinParent());
    node = node.getParent();
  }
  return path;
}

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

const LiveblocksLexicalConfigContext =
  createContext<LiveblocksLexicalInternalConfig | null>(null);

export const LiveblocksPluginProvider = ({
  userInfo = undefined,
  allowEditsBeforeSync = true,
  initialEditorState = undefined,
  children,
}: LiveblocksPluginProviderProps): JSX.Element => {
  const {
    useSelf,
    useRoom,
    [kInternal]: { useOptimisticThreadCreateListener },
  } = useRoomContextBundle();
  const [editor] = useLexicalComposerContext();
  const room = useRoom();

  const [provider, setProvider] = useState<
    LiveblocksProvider<JsonObject, LsonObject, BaseUserMeta, Json> | undefined
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
  const username = userInfo?.name ?? info?.name;
  const cursorcolor = userInfo?.color ?? (info?.color as string | undefined);

  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!provider) {
      return;
    }
    provider.on("sync", setSynced);
    return () => {
      provider.off("sync", setSynced);
    };
  }, [provider]);

  // Disable the editor before sync
  useEffect(() => {
    if (!allowEditsBeforeSync) {
      editor.setEditable(synced);
    }
  }, [synced, editor, allowEditsBeforeSync]);

  // Clear the current selection when a new thread is created
  useOptimisticThreadCreateListener(() => {
    editor.update(() => $setSelection(null));
  });

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

  const configRef = useRef<LiveblocksLexicalInternalConfig | null>(null);
  if (configRef.current === null) {
    configRef.current = getLiveblocksLexicalConfig();
  }

  return (
    <LiveblocksLexicalConfigContext.Provider value={configRef.current}>
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

        {configRef.current.mentions && <MentionPlugin />}

        {configRef.current.comments && (
          <CommentPluginProvider>{children}</CommentPluginProvider>
        )}
      </ThreadSelectionGetterContext.Provider>
    </LiveblocksLexicalConfigContext.Provider>
  );
};

export function useLiveblocksLexicalConfigContext(): LiveblocksLexicalInternalConfig {
  const config = useContext(LiveblocksLexicalConfigContext);
  if (config === null) {
    throw new Error(
      "useLiveblocksLexicalConfigContext must be used within a LiveblocksPluginProvider"
    );
  }
  return config;
}

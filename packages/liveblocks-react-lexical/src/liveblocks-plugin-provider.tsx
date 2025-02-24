import { autoUpdate, useFloating } from "@floating-ui/react-dom";
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Provider } from "@lexical/yjs";
import { TextEditorType } from "@liveblocks/core";
import { useRoom, useSelf } from "@liveblocks/react";
import {
  useLayoutEffect,
  useReportTextEditor,
  useResolveMentionSuggestions,
  useYjsProvider,
} from "@liveblocks/react/_private";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import type { MutableRefObject, ReactNode } from "react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Doc } from "yjs";

import { CommentPluginProvider } from "./comments/comment-plugin-provider";
import { ThreadMarkNode } from "./comments/thread-mark-node";
import { MentionNode } from "./mentions/mention-node";
import { MentionPlugin } from "./mentions/mention-plugin";
import { useRootElement } from "./use-root-element";

export type EditorStatus =
  /* The editor state is not loaded and has not been requested. */
  | "not-loaded"
  /* The editor state is loading from Liveblocks servers */
  | "loading"
  /**
   * Not working yet! Will be available in a future release.
   * Some editor state modifications has not been acknowledged yet by the server
   */
  | "synchronizing"
  /* The editor state is sync with Liveblocks servers */
  | "synchronized";

/**
 * Get the storage status.
 *
 * - `not-loaded`: Initial state when entering the room.
 * - `loading`: Once the editor state has been requested by LiveblocksPlugin.
 * - `synchronizing`: Not working yet! Will be available in a future release.
 * - `synchronized`:  The editor state is sync with Liveblocks servers.
 *
 * @deprecated Prefer `useIsEditorReady` or `useSyncStatus` (from @liveblocks/react)
 */
export function useEditorStatus(): EditorStatus {
  const provider = useYjsProvider();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (provider === undefined) return () => {};
      provider.on("status", onStoreChange);
      return () => {
        provider.off("status", onStoreChange);
      };
    },
    [provider]
  );

  const getSnapshot = useCallback(() => {
    if (provider === undefined) {
      return "not-loaded";
    }
    return provider.getStatus();
  }, [provider]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Returns whether the editor has loaded the initial text contents from the
 * server and is ready to be used.
 */
export function useIsEditorReady(): boolean {
  const yjsProvider = useYjsProvider();

  const getSnapshot = useCallback(() => {
    const status = yjsProvider?.getStatus();
    return status === "synchronizing" || status === "synchronized";
  }, [yjsProvider]);

  const subscribe = useCallback(
    (callback: () => void) => {
      if (yjsProvider === undefined) return () => {};
      yjsProvider.on("status", callback);
      return () => {
        yjsProvider.off("status", callback);
      };
    },
    [yjsProvider]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export type LiveblocksPluginProps = {
  children?: ReactNode;
};

/**
 * Liveblocks plugin for Lexical that adds collaboration to your editor.
 *
 * `LiveblocksPlugin` should always be nested inside `LexicalComposer`.
 *
 * @example
 *
 * import { LexicalComposer } from "@lexical/react/LexicalComposer";
 * import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
 * import { ContentEditable } from "@lexical/react/LexicalContentEditable";
 * import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
 * import { liveblocksConfig, LiveblocksPlugin } from "@liveblocks/react-lexical";
 *
 * const initialConfig = liveblocksConfig({
 *   namespace: "MyEditor",
 *   theme: {},
 *   nodes: [],
 *   onError: (err) => console.error(err),
 * });
 *
 * function Editor() {
 *   return (
 *     <LexicalComposer initialConfig={initialConfig}>
 *       <LiveblocksPlugin />
 *       <RichTextPlugin
 *         contentEditable={<ContentEditable />}
 *         placeholder={<div>Enter some text...</div>}
 *         ErrorBoundary={LexicalErrorBoundary}
 *       />
 *     </LexicalComposer>
 *   );
 * }
 */
export const LiveblocksPlugin = ({
  children,
}: LiveblocksPluginProps): JSX.Element => {
  const isResolveMentionSuggestionsDefined =
    useResolveMentionSuggestions() !== undefined;
  const [editor] = useLexicalComposerContext();
  const room = useRoom();

  if (!editor.hasNodes([ThreadMarkNode, MentionNode])) {
    throw new Error(
      "LiveblocksPlugin requires Lexical configuration to be wrapped in the `liveblocksConfig(options)` function. For more information: https://liveblocks.io/docs/api-reference/liveblocks-react-lexical#liveblocksConfig"
    );
  }

  const [containerRef, setContainerRef] = useState<
    MutableRefObject<HTMLDivElement | null> | undefined
  >(undefined);

  const {
    refs: { setReference, setFloating },
    strategy,
    x,
    y,
  } = useFloating({
    strategy: "fixed",
    placement: "bottom",
    whileElementsMounted: (...args) => {
      return autoUpdate(...args, {
        animationFrame: true,
      });
    },
  });

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

  useReportTextEditor(TextEditorType.Lexical, "root");

  // Get user info or allow override from props
  const self = useSelf();

  const providerFactory = useCallback(
    (id: string, yjsDocMap: Map<string, Doc>): Provider => {
      const provider = getYjsProviderForRoom(room);
      yjsDocMap.set(id, provider.getYDoc());

      return provider as Provider;
    },
    [room]
  );

  const root = useRootElement();

  useLayoutEffect(() => {
    if (root === null) return;
    setReference({
      getBoundingClientRect: () => root.getBoundingClientRect(),
    });
  }, [setReference, root]);

  const handleFloatingRef = useCallback(
    (node: HTMLDivElement) => {
      setFloating(node);
      setContainerRef({ current: node });
    },
    [setFloating, setContainerRef]
  );

  return (
    <>
      <div
        ref={handleFloatingRef}
        style={{
          position: strategy,
          top: 0,
          left: 0,
          transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
          minWidth: "max-content",
        }}
      />

      {self && (
        <CollaborationPlugin
          // Setting the key allows us to reset the internal Y.doc used by useYjsCollaboration
          // without implementing `reload` event
          key={room.id}
          id={room.id}
          providerFactory={providerFactory}
          username={self.info?.name ?? ""} // use empty string to prevent random name
          cursorColor={self.info?.color as string | undefined}
          cursorsContainerRef={containerRef}
          shouldBootstrap={true}
        />
      )}

      {isResolveMentionSuggestionsDefined && <MentionPlugin />}
      <CommentPluginProvider>{children}</CommentPluginProvider>
    </>
  );
};

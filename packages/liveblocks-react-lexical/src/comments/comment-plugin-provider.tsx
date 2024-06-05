import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  addClassNamesToElement,
  registerNestedElementResolver,
  removeClassNamesFromElement,
} from "@lexical/utils";
import { kInternal } from "@liveblocks/core";
import {
  CreateThreadError,
  useClient,
  useRoomContextBundle,
} from "@liveblocks/react";
import type { BaseSelection, NodeKey, NodeMutation } from "lexical";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
} from "lexical";
import type { PropsWithChildren } from "react";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector.js";

import { ActiveSelection } from "../active-selection";
import $getThreadMarkIds from "./get-thread-mark-ids";
import {
  $createThreadMarkNode,
  $isThreadMarkNode,
  ThreadMarkNode,
} from "./thread-mark-node";
import $unwrapThreadMarkNode from "./unwrap-thread-mark-node";
import $wrapSelectionInThreadMarkNode from "./wrap-selection-in-thread-mark-node";

type ThreadToNodesMap = Map<string, Set<NodeKey>>;

export function CommentPluginProvider({ children }: PropsWithChildren) {
  const [editor, context] = useLexicalComposerContext();

  const [threadToNodes, setThreadToNodes] = useState<ThreadToNodesMap>(
    new Map()
  ); // A map from thread id to a set of (thread mark) node keys that are associated with the thread

  const [activeThreads, setActiveThreads] = useState<string[]>([]); // The threads that are currently active (or selected) in the editor

  const [showActiveSelection, setShowActiveSelection] = useState(false);

  const client = useClient();
  const {
    useRoom,
    [kInternal]: {
      useCommentsErrorListener,
      ThreadCreateCallbackProvider,
      ThreadDeleteCallbackProvider,
      ComposerFocusCallbackProvider,
      IsThreadActiveCallbackProvider,
    },
  } = useRoomContextBundle();

  const room = useRoom();

  useEffect(() => {
    if (!editor.hasNodes([ThreadMarkNode])) {
      throw new Error(
        "CommentPluginProvider: ThreadMarkNode not registered on editor"
      );
    }
  }, [editor]);

  const isThreadActive = useCallback(
    (threadId: string) => {
      return activeThreads.includes(threadId);
    },
    [activeThreads]
  );

  /**
   * Create a new ThreadMarkNode and wrap the selected content in it.
   * @param threadId The id of the thread to associate with the selected content
   */
  const handleThreadCreate = useCallback(
    (threadId: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        // If the selection is collapsed, we do not create a new thread node in the editor.
        if (selection.isCollapsed()) return;

        const isBackward = selection.isBackward();
        // Wrap content in a ThreadMarkNode
        $wrapSelectionInThreadMarkNode(selection, isBackward, threadId);

        // Clear the selection after wrapping
        $setSelection(null);
      });
    },
    [editor]
  );

  /**
   * Remove the thread id from the associated nodes and unwrap the nodes if they are no longer associated with any threads.
   * @param threadId The id of the thread to remove
   */
  const handleThreadDelete = useCallback(
    (threadId: string) => {
      editor.update(() => {
        // Retrieve node keys associated with the thread
        const keys = threadToNodes.get(threadId);
        if (keys === undefined) return;

        // Iterate over each thread node and disassociate the thread if from the node and unwrap the node if it is no longer associated with any threads
        for (const key of keys) {
          const node = $getNodeByKey(key);
          if (!$isThreadMarkNode(node)) continue;
          node.deleteID(threadId);

          if (node.getIDs().length === 0) {
            $unwrapThreadMarkNode(node);
          }
        }
      });
    },
    [editor, threadToNodes]
  );

  useCommentsErrorListener((error) => {
    // If thread creation fails, we remove the thread id from the associated nodes and unwrap the nodes if they are no longer associated with any threads
    if (error instanceof CreateThreadError) {
      handleThreadDelete(error.context.threadId);
    }
  });

  const store = client[kInternal].cacheStore;

  const threads = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.get,
    store.get,
    useCallback(
      () =>
        client[kInternal].comments.selectedThreads(room.id, store.get(), {}),
      [client, room.id, store]
    )
  );

  /**
   * Only add styles to the thread mark elements that currently have threads associated with them.
   */
  useEffect(() => {
    function getThreadMarkElements() {
      const activeElements = new Set<HTMLElement>();

      for (const thread of threads) {
        const keys = threadToNodes.get(thread.id);
        if (keys === undefined) continue;

        for (const key of keys) {
          const element = editor.getElementByKey(key);
          if (element === null) continue;
          activeElements.add(element);
        }
      }
      return activeElements;
    }

    const elements = getThreadMarkElements();

    const theme = context.getTheme();
    if (theme === null || theme === undefined) return;

    elements.forEach((element) => {
      addClassNamesToElement(element, theme.lexicalThreadMark as string);
    });

    return () => {
      elements.forEach((element) => {
        removeClassNamesFromElement(element, theme.lexicalThreadMark as string);
      });
    };
  }, [context, editor, threadToNodes, threads]);

  /**
   * Register a mutation listener that listens for mutations on 'ThreadMarkNode's and updates the map of thread to node keys accordingly.
   */
  useEffect(() => {
    function onMutation(mutations: Map<string, NodeMutation>) {
      const state = editor.getEditorState();
      setThreadToNodes((prev) => {
        const updatedMap = new Map(prev);
        state.read(() => {
          for (const [key, mutation] of mutations) {
            // If the node is destroyed, we remove its key from the map of thread to node keys
            if (mutation === "destroyed") {
              for (const [, nodes] of updatedMap) {
                nodes.delete(key);
              }
            }
            // Otherwise, if a new node is created or an existing node is updated, we update the map of thread to node keys to include the new/updated node
            else if (mutation === "created" || mutation === "updated") {
              const node = $getNodeByKey(key);
              if (!$isThreadMarkNode(node)) continue;

              const threadIds = node.getIDs();

              for (const id of threadIds) {
                const keys = updatedMap.get(id) ?? new Set();
                keys.add(key);
                updatedMap.set(id, keys);
              }
            }
          }
        });
        return updatedMap;
      });
    }

    return editor.registerMutationListener(ThreadMarkNode, onMutation);
  }, [editor]);

  /**
   * Register an update listener that listens for changes in the selection and updates the active threads accordingly.
   */
  useEffect(() => {
    const selectedThreads = client[kInternal].comments.selectedThreads;

    function $getThreadIds(selection: BaseSelection | null): string[] {
      if (selection === null) return [];

      if (!$isRangeSelection(selection)) return [];

      const anchor = selection.anchor.getNode();
      if (!$isTextNode(anchor)) return [];

      return $getThreadMarkIds(anchor, selection.anchor.offset) ?? [];
    }

    function $onStateRead() {
      const selection = $getSelection();

      const threadIds = $getThreadIds(selection).filter((id) => {
        return selectedThreads(room.id, store.get(), {}).some(
          (thread) => thread.id === id
        );
      });
      setActiveThreads(threadIds);
    }

    const unsubscribeCache = store.subscribe(() => {
      editor.getEditorState().read($onStateRead);
    });

    const unregisterUpdateListener = editor.registerUpdateListener(
      ({ editorState: state }) => {
        state.read($onStateRead);
      }
    );

    return () => {
      unregisterUpdateListener();
      unsubscribeCache();
    };
  }, [editor, client, room.id, store]);

  /**
   * When active threads change, we add a data-state attribute and set it to "active" for all HTML elements that are associated with the active threads.
   */
  useEffect(() => {
    function getActiveElements() {
      const activeElements = new Set<HTMLElement>();

      for (const thread of activeThreads) {
        const keys = threadToNodes.get(thread);
        if (keys === undefined) continue;

        for (const key of keys) {
          const element = editor.getElementByKey(key);
          if (element === null) continue;
          activeElements.add(element);
        }
      }
      return activeElements;
    }

    const activeElements = getActiveElements();

    activeElements.forEach((element) => {
      element.setAttribute("data-state", "active");
    });

    return () => {
      activeElements.forEach((element) => {
        element.removeAttribute("data-state");
      });
    };
  }, [activeThreads, editor, threadToNodes]);

  useEffect(() => {
    return registerNestedElementResolver<ThreadMarkNode>(
      editor,
      ThreadMarkNode,
      (from: ThreadMarkNode) => {
        return $createThreadMarkNode(from.getIDs());
      },
      (from: ThreadMarkNode, to: ThreadMarkNode) => {
        const ids = from.getIDs();
        ids.forEach((id) => {
          to.addID(id);
        });
      }
    );
  }, [editor]);

  const handleComposerFocus = useCallback(
    (commentId: string | undefined, threadId: string | undefined) => {
      if (commentId === undefined && threadId === undefined) {
        setShowActiveSelection(true);
      } else {
        setShowActiveSelection(false);
      }
    },
    []
  );

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState: state, tags }) => {
      // Ignore selection updates related to collaboration
      if (tags.has("collaboration")) return;
      state.read(() => setShowActiveSelection(false));
    });
  }, [editor]);

  return (
    <ThreadCreateCallbackProvider value={handleThreadCreate}>
      <ThreadDeleteCallbackProvider value={handleThreadDelete}>
        <ComposerFocusCallbackProvider value={handleComposerFocus}>
          <IsThreadActiveCallbackProvider value={isThreadActive}>
            {showActiveSelection && <ActiveSelection />}
            {children}
          </IsThreadActiveCallbackProvider>
        </ComposerFocusCallbackProvider>
      </ThreadDeleteCallbackProvider>
    </ThreadCreateCallbackProvider>
  );
}

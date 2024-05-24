import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  addClassNamesToElement,
  registerNestedElementResolver,
  removeClassNamesFromElement,
} from "@lexical/utils";
import { kInternal } from "@liveblocks/core";
import { CreateThreadError, useRoomContextBundle } from "@liveblocks/react";
import type { BaseSelection, NodeKey, NodeMutation } from "lexical";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
} from "lexical";
import type { PropsWithChildren, RefObject } from "react";
import * as React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import $getThreadMarkIds from "./get-thread-mark-ids";
import {
  $createThreadMarkNode,
  $isThreadMarkNode,
  ThreadMarkNode,
} from "./thread-mark-node";
import $unwrapThreadMarkNode from "./unwrap-thread-mark-node";
import $wrapSelectionInThreadMarkNode from "./wrap-selection-in-thread-mark-node";

type ThreadToNodesMap = Map<string, Set<NodeKey>>;

export const ThreadToNodeKeysRefContext =
  createContext<RefObject<ThreadToNodesMap> | null>(null);

export const ActiveThreadsContext = createContext<string[] | null>(null);

export function CommentPluginProvider({ children }: PropsWithChildren) {
  const [editor, context] = useLexicalComposerContext();

  const threadToNodeKeysRef = useRef<ThreadToNodesMap>(new Map()); // A map from thread id to a set of (thread mark) node keys that are associated with the thread

  const [activeThreads, setActiveThreads] = useState<string[]>([]); // The threads that are currently active (or selected) in the editor

  const {
    [kInternal]: {
      useOptimisticThreadCreateListener,
      useOptimisticThreadDeleteListener,
      useCommentsErrorListener,
      useThreadsFromCache,
    },
  } = useRoomContextBundle();

  useEffect(() => {
    if (!editor.hasNodes([ThreadMarkNode])) {
      throw new Error(
        "CommentPluginProvider: ThreadMarkNode not registered on editor"
      );
    }
  }, [editor]);

  const threads = useThreadsFromCache();

  /**
   * Only add styles to the thread mark elements that currently have threads associated with them.
   */
  useEffect(() => {
    function getThreadMarkElements() {
      const activeElements = new Set<HTMLElement>();

      for (const thread of threads) {
        const keys = threadToNodeKeysRef.current.get(thread.id);
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
      addClassNamesToElement(element, theme.threadMark);
    });

    return () => {
      elements.forEach((element) => {
        removeClassNamesFromElement(element, theme.threadMark);
      });
    };
  }, [threads]);

  /**
   * Create a new ThreadMarkNode and wrap the selected content in it.
   * @param threadId The id of the thread to associate with the selected content
   */
  const handleThreadCreate = useCallback(
    (threadId: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

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
        const threadToNodes = threadToNodeKeysRef.current;
        const keys = threadToNodes.get(threadId);

        if (keys === undefined) return;

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
    [editor]
  );

  // Listen to (optimistic) thread creation to create a new ThreadMarkNode and associate the newly created thread to mark node.
  useOptimisticThreadCreateListener(handleThreadCreate);

  // Listen to (optimistic) thread deletion to remove the thread id from the associated nodes and unwrap the nodes if they are no longer associated with any threads.
  useOptimisticThreadDeleteListener(handleThreadDelete);

  useCommentsErrorListener((error) => {
    // If thread creation fails, we remove the thread id from the associated nodes and unwrap the nodes if they are no longer associated with any threads
    if (error instanceof CreateThreadError) {
      handleThreadDelete(error.context.threadId);
    }
  });

  /**
   * Register an update listener that listens for changes in the selection and updates the active threads accordingly.
   */
  useEffect(() => {
    function $getThreadIds(selection: BaseSelection | null): string[] {
      if (selection === null) return [];

      if (!$isRangeSelection(selection)) return [];

      const anchor = selection.anchor.getNode();
      if (!$isTextNode(anchor)) return [];

      return $getThreadMarkIds(anchor, selection.anchor.offset) ?? [];
    }

    function $onStateRead() {
      const selection = $getSelection();
      const threadIds = $getThreadIds(selection);
      setActiveThreads(threadIds);
    }

    return editor.registerUpdateListener(({ editorState: state }) => {
      state.read($onStateRead);
    });
  }, [editor]);

  /**
   * Register a mutation listener that listens for mutations on 'ThreadMarkNode's and updates the map of thread to node keys accordingly.
   */
  useEffect(() => {
    const threadToNodeKeys = threadToNodeKeysRef.current;

    function onMutation(mutations: Map<string, NodeMutation>) {
      const state = editor.getEditorState();
      state.read(() => {
        for (const [key, mutation] of mutations) {
          // If the node is destroyed, we remove its key from the map of thread to node keys
          if (mutation === "destroyed") {
            for (const [, nodes] of threadToNodeKeys) {
              nodes.delete(key);
            }
          }
          // Otherwise, if a new node is created or an existing node is updated, we update the map of thread to node keys to include the new/updated node
          else if (mutation === "created" || mutation === "updated") {
            const node = $getNodeByKey(key);
            if (!$isThreadMarkNode(node)) continue;

            const threadIds = node.getIDs();

            for (const id of threadIds) {
              const keys = threadToNodeKeys.get(id) ?? new Set();
              keys.add(key);
              threadToNodeKeys.set(id, keys);
            }
          }
        }
      });
    }

    return editor.registerMutationListener(ThreadMarkNode, onMutation);
  }, [editor]);

  /**
   * When active threads change, we add a data-state attribute and set it to "active" for all HTML elements that are associated with the active threads.
   */
  useEffect(() => {
    function getActiveElements() {
      const activeElements = new Set<HTMLElement>();

      for (const thread of activeThreads) {
        const keys = threadToNodeKeysRef.current.get(thread);
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
  }, [activeThreads, editor]);

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

  return (
    <ThreadToNodeKeysRefContext.Provider value={threadToNodeKeysRef}>
      <ActiveThreadsContext.Provider value={activeThreads}>
        {children}
      </ActiveThreadsContext.Provider>
    </ThreadToNodeKeysRefContext.Provider>
  );
}

export function useThreadToNodesMap() {
  const threadToNodesRef = useContext(ThreadToNodeKeysRefContext);
  if (threadToNodesRef === null) {
    throw new Error(
      "useThreadToNodesMap must be used within a CommentPluginProvider"
    );
  }

  return threadToNodesRef;
}

export function useActiveThreads() {
  const threads = useContext(ActiveThreadsContext);
  if (threads === null) {
    throw new Error(
      "useActiveThreads must be used within a CommentPluginProvider"
    );
  }
  return threads;
}

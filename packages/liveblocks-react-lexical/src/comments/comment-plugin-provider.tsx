import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  addClassNamesToElement,
  registerNestedElementResolver,
  removeClassNamesFromElement,
} from "@lexical/utils";
import { shallow } from "@liveblocks/client";
import { useClient, useErrorListener, useRoom } from "@liveblocks/react";
import {
  getUmbrellaStoreForClient,
  useSignal,
} from "@liveblocks/react/_private";
import type { BaseSelection, NodeKey, NodeMutation } from "lexical";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
} from "lexical";
import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import $getThreadMarkIds from "./get-thread-mark-ids";
import {
  $createThreadMarkNode,
  $isThreadMarkNode,
  ThreadMarkNode,
} from "./thread-mark-node";
import $unwrapThreadMarkNode from "./unwrap-thread-mark-node";

export const OnDeleteThreadCallback = createContext<
  ((threadId: string) => void) | null
>(null);

export const ActiveThreadsContext = createContext<string[] | null>(null);

export const IsActiveThreadContext = createContext<
  ((threadId: string) => boolean) | null
>(null);

export type ThreadToNodesMap = Map<string, Set<NodeKey>>;

export const ThreadToNodesContext = createContext<ThreadToNodesMap | null>(
  null
);

export function CommentPluginProvider({ children }: PropsWithChildren) {
  const [editor, context] = useLexicalComposerContext();

  const [threadToNodes, setThreadToNodes] = useState<ThreadToNodesMap>(
    new Map()
  ); // A map from thread id to a set of (thread mark) node keys that are associated with the thread

  const [activeThreads, setActiveThreads] = useState<string[]>([]); // The threads that are currently active (or selected) in the editor

  const client = useClient();

  const room = useRoom();

  const isThreadActive = useCallback(
    (threadId: string) => {
      return activeThreads.includes(threadId);
    },
    [activeThreads]
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

  useErrorListener((err) => {
    // If thread creation fails, we remove the thread id from the associated nodes and unwrap the nodes if they are no longer associated with any threads
    if (
      err.context.type === "CREATE_THREAD_ERROR" &&
      err.context.roomId === room.id
    ) {
      handleThreadDelete(err.context.threadId);
    }
  });

  const store = getUmbrellaStoreForClient(client);

  const roomId = room.id;
  const threadIds = useSignal(
    store.outputs.threads,
    useCallback(
      (state) =>
        state
          .findMany(roomId, { resolved: false }, "asc", undefined)
          .map((thread) => thread.id),
      [roomId]
    ),
    shallow
  );

  /**
   * Only add styles to the thread mark elements that currently have threads associated with them.
   */
  useEffect(() => {
    function getThreadMarkElements() {
      const activeElements = new Set<HTMLElement>();

      for (const id of threadIds) {
        const keys = threadToNodes.get(id);
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

    const classNames = ["lb-root", "lb-lexical-thread-mark"];
    if (theme && theme.liveblocks && "threadMark" in theme.liveblocks) {
      classNames.push((theme.liveblocks as { threadMark: string }).threadMark);
    }

    elements.forEach((element) => {
      addClassNamesToElement(element, ...classNames);
    });

    return () => {
      elements.forEach((element) => {
        removeClassNamesFromElement(element, ...classNames);
      });
    };
  }, [context, editor, threadToNodes, threadIds]);

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
        return store.outputs.threads
          .get()
          .findMany(roomId, { resolved: false }, "asc", undefined)
          .some((thread) => thread.id === id);
      });
      setActiveThreads(threadIds);
    }

    const unsubscribeCache = store.outputs.threads.subscribe(() => {
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
  }, [editor, client, roomId, store]);

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

  return (
    <OnDeleteThreadCallback.Provider value={handleThreadDelete}>
      <ActiveThreadsContext.Provider value={activeThreads}>
        <IsActiveThreadContext.Provider value={isThreadActive}>
          <ThreadToNodesContext.Provider value={threadToNodes}>
            {children}
          </ThreadToNodesContext.Provider>
        </IsActiveThreadContext.Provider>
      </ActiveThreadsContext.Provider>
    </OnDeleteThreadCallback.Provider>
  );
}

/**
 * Returns whether the associated thread annotation for the given thread id is selected or not in the editor.
 * @param threadId The id of the thread to check if the associated annotation is selected or not.
 * @returns true if the associated annotation for the thread is selected, false otherwise.
 */
export function useIsThreadActive(threadId: string): boolean {
  const isActive = useContext(IsActiveThreadContext);
  if (isActive === null) {
    throw new Error(
      "useIsThreadActive must be used within LiveblocksPlugin. For more information: https://liveblocks.io/docs/api-reference/liveblocks-react-lexical#useIsThreadActive"
    );
  }

  return isActive(threadId);
}

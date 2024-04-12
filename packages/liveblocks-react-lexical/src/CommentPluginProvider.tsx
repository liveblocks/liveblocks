import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { createDOMRange, createRectsFromDOMRange } from "@lexical/selection";
import { registerNestedElementResolver } from "@lexical/utils";
import type {
  BaseSelection,
  LexicalCommand,
  LexicalNode,
  NodeKey,
  NodeMutation,
} from "lexical";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
} from "lexical";
import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  $createThreadMarkNode,
  $isThreadMarkNode,
  ThreadMarkNode,
} from "./ThreadMarkNode";
import {
  $getThreadMarkIds,
} from "./utils";

export const INSERT_THREAD_COMMAND: LexicalCommand<void> = createCommand(
  "INSERT_THREAD_COMMAND"
);

type SelectionInfo = {
  anchor: {
    node: LexicalNode;
    offset: number;
  };
  focus: {
    node: LexicalNode;
    offset: number;
  };
};

const LastActiveSelectionContext = createContext<SelectionInfo | null>(
  null
);

const ActiveThreadsContext = createContext<string[]>([]);

type ThreadToNodesMap = {
  current: Map<string, Set<NodeKey>>;
}

const ThreadToNodeKeysRefContext = createContext<ThreadToNodesMap>({
  current: new Map(),
});

export function CommentPluginProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [editor] = useLexicalComposerContext();

  const threadToNodeKeysRef = useRef<Map<string, Set<NodeKey>>>(new Map()); // A map from thread id to a set of (mark) node keys that are associated with the thread

  const [lastActiveSelection, setLastActiveSelection] = useState<
    SelectionInfo | null
  >(null); // The last active selection that was used to attach a thread

  const [activeThreads, setActiveThreads] = useState<string[]>([]); // The threads that are currently active (or selected) in the editor

  useEffect(() => {
    if (!editor.hasNodes([ThreadMarkNode])) {
      throw new Error(
        "CommentPluginProvider: ThreadMarkNode not registered on editor"
      );
    }
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

    function onStateRead() {
      const selection = $getSelection();
      const threadIds = $getThreadIds(selection);
      setActiveThreads(threadIds);
    }

    return editor.registerUpdateListener(({ editorState: state }) => {
      state.read(onStateRead);
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
   * Register a command that can be used to insert a comment at the current selection.
   */
  useEffect(() => {
    return editor.registerCommand(
      INSERT_THREAD_COMMAND,
      (type?: string) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        // If we got an empty selection (just a caret), try and expand it
        if (selection?.getTextContent().trim() === "") {
          if (type === "expansion") {
            // Do NOT try to expand again if this came from an expansion
            return false;
          }
          // Update selection to find nearest word
          editor.update(() => {
            selection.modify("move", true, "word"); // move to the beginning of the previous word
            selection.modify("extend", false, "word"); // extend back to the whole word
          }, {
            tag: "expansion", // Tag the update so we can find it in handlers
            onUpdate: () => {
              // After expansion, run the insert comment command again (the original one did NOT complete)
              editor.dispatchCommand<LexicalCommand<"expansion">>(INSERT_THREAD_COMMAND, "expansion");
            }
          });
          return false;
        }
        const nativeSelection = window.getSelection();
        if (nativeSelection !== null) {
          nativeSelection.removeAllRanges();
        }

        const activeSelection = {
          anchor: {
            node: selection.anchor.getNode() as LexicalNode,
            offset: selection.anchor.offset,
          },
          focus: {
            node: selection.focus.getNode() as LexicalNode,
            offset: selection.focus.offset,
          },
        };

        setLastActiveSelection(activeSelection);

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, setLastActiveSelection]);

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
    function onStateRead() {
      setLastActiveSelection(null);
    }
    return editor.registerUpdateListener(({ editorState: state, tags }) => {
      // Ignore selection expansion updates (from insert comments on a caret) and collab updates
      if (tags.has("collaboration") || tags.has("expansion")) {
        return;
      }
      state.read(onStateRead);
    });
  }, [editor, setLastActiveSelection]);

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
    <LastActiveSelectionContext.Provider value={lastActiveSelection}>
      <ThreadToNodeKeysRefContext.Provider value={threadToNodeKeysRef}>
        <ActiveThreadsContext.Provider value={activeThreads}>
          {children}
        </ActiveThreadsContext.Provider>
      </ThreadToNodeKeysRefContext.Provider>
    </LastActiveSelectionContext.Provider>
  );
}

export function useLastActiveSelection(): SelectionInfo | null {
  const lastActiveSelection = useContext(LastActiveSelectionContext);
  if (lastActiveSelection === undefined) {
    throw new Error(
      "useLastActiveSelection has to be used within <LiveblocksPlugin>"
    );
  }
  return lastActiveSelection;
}
export function useThreadToNodeKeysMap(): ThreadToNodesMap {
  const threadToNodesMap = useContext(ThreadToNodeKeysRefContext);

  if (!threadToNodesMap) {
    throw new Error(
      "useThreadToNodeKeysMap has to be used within <LiveblocksPlugin>"
    );
  }

  return threadToNodesMap;
}
export function useActiveThreads(): string[] {
  const activeThreads = useContext(ActiveThreadsContext);

  if (!activeThreads) {
    throw new Error(
      "useActiveThreads has to be used within <LiveblocksPlugin>"
    );
  }

  return activeThreads;
}

export function LastActiveSelection() {
  const [editor] = useLexicalComposerContext();
  const selection = useLastActiveSelection();
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (selection === null) return;

    const container = containerRef.current;
    if (container === null) return;

    // // Remove all existing children of the container
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const range = createDOMRange(
      editor,
      selection.anchor.node,
      selection.anchor.offset,
      selection.focus.node,
      selection.focus.offset
    );

    if (range === null) return;
    const rects = createRectsFromDOMRange(editor, range);

    for (const rect of rects) {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.top = `${rect.top - container.getBoundingClientRect().top}px`;
      div.style.left = `${rect.left - container.getBoundingClientRect().left
        }px`;
      div.style.width = `${rect.width}px`;
      div.style.height = `${rect.height}px`;
      div.style.backgroundColor = "rgb(255, 212, 0)";
      div.style.opacity = "0.5";
      div.style.pointerEvents = "none";
      container.appendChild(div);
    }
  }, [editor, selection]);

  if (selection === null) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        height: "100%",
        width: "100%",
        top: 0,
        left: 0,
        pointerEvents: "none",
      }}
    />
  );
}

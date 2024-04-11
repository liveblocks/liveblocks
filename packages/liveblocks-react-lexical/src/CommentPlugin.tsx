import {
  $createThreadMarkNode,
  ThreadMarkNode,
  $isThreadMarkNode,
} from "./ThreadMarkNode";
import {
  $getThreadMarkIds,
  $unwrapThreadMarkNode,
  $wrapSelectionInThreadMarkNode,
} from "./utils";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { createDOMRange, createRectsFromDOMRange } from "@lexical/selection";
import { registerNestedElementResolver } from "@lexical/utils";
import type { BaseMetadata, ThreadData } from "@liveblocks/client";
import { useRoomContextBundle } from "@liveblocks/react";
import type { ComposerSubmitComment } from "@liveblocks/react-comments";
import { Composer, Thread } from "@liveblocks/react-comments";
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
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

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

const LastActiveSelectionContext = createContext<SelectionInfo | undefined>(
  undefined
);

const ActiveThreadsContext = createContext<string[]>([]);

const ThreadToNodeKeysRefContext = createContext<{
  current: Map<string, Set<NodeKey>>;
}>({
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
    SelectionInfo | undefined
  >(); // The last active selection that was used to attach a thread

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
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        const nativeSelection = window.getSelection();
        if (nativeSelection !== null) {
          nativeSelection.removeAllRanges();
        }

        setLastActiveSelection({
          anchor: {
            node: selection.anchor.getNode() as LexicalNode,
            offset: selection.anchor.offset,
          },
          focus: {
            node: selection.focus.getNode() as LexicalNode,
            offset: selection.focus.offset,
          },
        });

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
      setLastActiveSelection(undefined);
    }

    return editor.registerUpdateListener(({ editorState: state, tags }) => {
      if (tags.has("collaboration")) return;
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

export type ThreadMetadata = {
  resolved?: boolean;
};

export function LexicalThreadComposer<
  TThreadMetadata extends BaseMetadata = ThreadMetadata,
>({ metadata }: { metadata?: TThreadMetadata }) {
  const lastActiveSelection = useContext(LastActiveSelectionContext);
  const { useCreateThread } = useRoomContextBundle();
  const createThread = useCreateThread();
  const [editor] = useLexicalComposerContext();

  if (lastActiveSelection === undefined) return null;

  function handleComposerSubmit(comment: ComposerSubmitComment) {
    const thread = createThread({
      body: comment.body,
      metadata: metadata ?? {},
    });
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const isBackward = selection.isBackward();
      // Wrap content in a MarkNode
      $wrapSelectionInThreadMarkNode(selection, isBackward, thread.id);
    });
  }

  return (
    <Composer
      onComposerSubmit={(content, event) => {
        event.preventDefault();
        handleComposerSubmit(content);
      }}
      autoFocus
      className="border-b border-[rgba(55,53,47,0.09)] dark:border-[rgba(255,255,255,0.094)]"
    />
  );
}

export function LexicalThread({ thread }: { thread: ThreadData }) {
  const [editor] = useLexicalComposerContext();
  const divRef = useRef<HTMLDivElement>(null);
  const threadToNodeKeysRef = useContext(ThreadToNodeKeysRefContext);
  const activeThreads = useContext(ActiveThreadsContext);

  const isActive = activeThreads.includes(thread.id);

  const handleThreadClick = useCallback(() => {
    const threadToNodes = threadToNodeKeysRef.current;
    const keys = threadToNodes.get(thread.id);
    if (keys === undefined) return;
    if (keys.size === 0) return;

    editor.update(() => {
      // Get the first key associated with the thread
      const [key] = keys;
      // Get the node associated with the key
      const node = $getNodeByKey(key);

      if (!$isThreadMarkNode(node)) return;
      node.selectStart();
    });
  }, [editor, threadToNodeKeysRef, thread.id]);

  function handleThreadDelete() {
    editor.update(() => {
      const threadToNodes = threadToNodeKeysRef.current;
      const keys = threadToNodes.get(thread.id);
      if (keys === undefined) return;

      for (const key of keys) {
        const node = $getNodeByKey(key);
        if (!$isThreadMarkNode(node)) continue;
        node.deleteID(thread.id);

        if (node.getIDs().length === 0) {
          $unwrapThreadMarkNode(node);
        }
      }
    });
  }

  useEffect(() => {
    const element = divRef.current;
    if (element === null) return;

    const composer = element.querySelector(".lb-composer-editor");
    if (composer === null) return;

    function handleComposerClick() {
      const threadToNodes = threadToNodeKeysRef.current;
      const keys = threadToNodes.get(thread.id);
      if (keys === undefined) return;
      if (keys.size === 0) return;

      editor.update(
        () => {
          // Get the first key associated with the thread
          const [key] = keys;
          // Get the node associated with the key
          const node = $getNodeByKey(key);

          if (!$isThreadMarkNode(node)) return;
          node.selectStart();
        },
        {
          onUpdate: () => {
            const element = divRef.current;
            if (element === null) return;

            const composer = element.querySelector(".lb-composer-editor");
            if (composer === null) return;

            if (composer instanceof HTMLElement) {
              composer.focus();
            }
          },
        }
      );
    }

    composer.addEventListener("click", handleComposerClick);
    return () => {
      composer.removeEventListener("click", handleComposerClick);
    };
  }, [editor, thread.id, threadToNodeKeysRef]);

  useEffect(() => {
    if (!isActive) return;

    const element = divRef.current;
    if (element === null) return;

    element.scrollIntoView({
      behavior: "smooth",
    });
  }, [isActive]);

  return (
    <Thread
      ref={divRef}
      key={thread.id}
      thread={thread}
      onClick={handleThreadClick}
      onThreadDelete={handleThreadDelete}
      data-state={isActive ? "active" : undefined}
      className="border-b border-[rgba(55,53,47,0.09)] dark:border-[rgba(255,255,255,0.094)]"
      showComposer={true}
    />
  );
}

export function LastActiveSelection() {
  const [editor] = useLexicalComposerContext();
  const selection = useContext(LastActiveSelectionContext);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (selection === undefined) return;

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
      div.style.left = `${
        rect.left - container.getBoundingClientRect().left
      }px`;
      div.style.width = `${rect.width}px`;
      div.style.height = `${rect.height}px`;
      div.style.backgroundColor = "rgb(255, 212, 0)";
      div.style.opacity = "0.5";
      div.style.pointerEvents = "none";
      container.appendChild(div);
    }
  }, [editor, selection]);

  if (selection === undefined) return null;

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

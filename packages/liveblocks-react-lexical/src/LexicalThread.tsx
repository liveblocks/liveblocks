import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { BaseMetadata } from "@liveblocks/core";
import { Thread, type ThreadProps } from "@liveblocks/react-comments";
import { $getNodeByKey } from "lexical";
import type { MouseEvent } from "react";
import React, { useCallback, useEffect, useRef } from "react";

import { useActiveThreads, useThreadToNodeKeysMap } from "./CommentPluginProvider";
import { $isThreadMarkNode } from "./ThreadMarkNode";
import type { ThreadMetadata } from "./types";
import { $unwrapThreadMarkNode } from "./utils";

export function LexicalThread<
  TThreadMetadata extends BaseMetadata = ThreadMetadata,
>({ thread, ...props }: ThreadProps<TThreadMetadata>) {
  const { onClick, onThreadDelete } = props;
  const [editor] = useLexicalComposerContext();
  const divRef = useRef<HTMLDivElement>(null);
  const threadToNodeKeysRef = useThreadToNodeKeysMap();
  const activeThreads = useActiveThreads();

  const isActive = activeThreads.includes(thread.id);

  const handleThreadClick = useCallback(
    (event: MouseEvent<HTMLDivElement, globalThis.MouseEvent>) => {
      onClick?.(event);

      if (event.isDefaultPrevented()) return;

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
    },
    [editor, threadToNodeKeysRef, thread.id, onClick]
  );

  function handleThreadDelete() {
    onThreadDelete?.(thread);

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
      {...props}
    />
  );
}

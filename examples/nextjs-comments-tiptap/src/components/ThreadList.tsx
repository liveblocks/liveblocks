"use client";

import { useCreateThread, useThreads } from "@/liveblocks.config";
import { Composer, Thread } from "@liveblocks/react-comments";
import { ThreadData } from "@liveblocks/client";
import styles from "./ThreadList.module.css";
import { FormEvent, useCallback, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import { ComposerSubmitComment } from "@liveblocks/react-comments/dist/primitives/index";

type Props = {
  editor: Editor;
};

export function ThreadList({ editor }: Props) {
  const { threads } = useThreads();

  return (
    <aside aria-label="Comments" className={styles.threadList}>
      {editor?.storage.commentHighlight.showComposer ? (
        <ThreadComposer editor={editor} />
      ) : null}
      {threads.sort(sort as any).map((thread) => (
        <Thread key={thread.id} thread={thread} />
      ))}
    </aside>
  );
}

function ThreadComposer({ editor }: Props) {
  const composer = useRef<HTMLFormElement>(null);
  const createThread = useCreateThread();

  // Submit a new thread and update the comment highlight to show a completed highlight
  const handleComposerSubmit = useCallback(
    ({ body }: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const highlightId = editor?.storage.commentHighlight.currentHighlightId;

      if (!highlightId) {
        console.log("NONE");
        return;
      }

      const thread = createThread({
        body,
        metadata: { resolved: false, highlightId },
      });

      editor.commands.setCommentHighlight({
        highlightId,
        color: "yellow",
        state: "complete",
      });

      editor.storage.commentHighlight.currentHighlightId = null;
      editor.storage.commentHighlight.showComposer = false;
      editor.storage.commentHighlight.previousHighlightSelection = null;

      console.log("NEW THREAD", thread);
    },
    []
  );

  // If clicking outside the composer
  useEffect(() => {
    if (!composer.current) {
      return;
    }

    const element = composer.current;

    function handleFocusOut() {
      const selection =
        editor?.storage.commentHighlight.previousHighlightSelection;

      if (!selection) {
        return;
      }

      const { from, to } = selection;
      editor.commands.setTextSelection({ from, to });
      editor.commands.unsetCommentHighlight();
      editor.storage.commentHighlight.currentHighlightId = null;
      editor.storage.commentHighlight.showComposer = false;
      console.log("REMOVE");
    }

    element.addEventListener("focusout", handleFocusOut);

    return () => {
      element.removeEventListener("focusout", handleFocusOut);
    };
  }, [editor, composer.current]);

  return (
    <Composer
      ref={composer}
      onComposerSubmit={handleComposerSubmit}
      autoFocus={true}
    />
  );
}

function sort(a: ThreadData, b: ThreadData) {
  if (a.createdAt > b.createdAt) {
    return -1;
  }

  if (a.createdAt < b.createdAt) {
    return 1;
  }

  return 0;
}

// export const ThreadList = memo(ThreadListComponent);

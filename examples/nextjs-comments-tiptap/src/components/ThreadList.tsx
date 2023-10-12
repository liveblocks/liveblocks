"use client";

import {
  ThreadMetadata,
  useCreateThread,
  useThreads,
} from "@/liveblocks.config";
import { Composer, Thread } from "@liveblocks/react-comments";
import { ThreadData } from "@liveblocks/client";
import styles from "./ThreadList.module.css";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { ComposerSubmitComment } from "@liveblocks/react-comments/dist/primitives/index";
import { removeCommentHighlight } from "@/utils";

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
        <CustomThread key={thread.id} thread={thread} editor={editor} />
      ))}
    </aside>
  );
}

function CustomThread({
  editor,
  thread,
}: Props & { thread: ThreadData<ThreadMetadata> }) {
  const [active, setActive] = useState(false);

  const handleThreadDelete = useCallback(
    (thread: ThreadData<ThreadMetadata>) => {
      removeCommentHighlight(editor, thread.metadata.highlightId);
    },
    [editor, thread]
  );

  return (
    <div
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
    >
      <Thread
        className={styles.thread}
        thread={thread}
        onThreadDelete={handleThreadDelete}
        data-active={active}
      />
    </div>
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
        return;
      }

      createThread({
        body,
        metadata: { resolved: false, highlightId },
      });

      editor.commands.setCommentHighlight({
        highlightId,
        state: "complete",
      });

      editor.storage.commentHighlight.currentHighlightId = null;
      editor.storage.commentHighlight.showComposer = false;
      editor.storage.commentHighlight.previousHighlightSelection = null;
    },
    []
  );

  // If clicking outside the composer, hide it and remove highlight
  useEffect(() => {
    if (!composer.current) {
      return;
    }

    const element = composer.current;

    function handleFocusOut() {
      removeCommentHighlight(
        editor,
        editor.storage.commentHighlight.currentHighlightId
      );
      editor.storage.commentHighlight.currentHighlightId = null;
      editor.storage.commentHighlight.showComposer = false;
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

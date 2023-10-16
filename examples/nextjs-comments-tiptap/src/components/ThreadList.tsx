"use client";

import {
  CustomThreadData,
  useCreateThread,
  useThreads,
} from "@/liveblocks.config";
import { Composer, Thread } from "@liveblocks/react-comments";
import styles from "./ThreadList.module.css";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { ComposerSubmitComment } from "@liveblocks/react-comments/dist/primitives/index";
import {
  getCommentHighlightContent,
  removeCommentHighlight,
  useHighlightEvent,
  useHighlightEventListener,
} from "@/comment-utils";

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
      {threads.sort(sortThreads).map((thread) => (
        <CustomThread key={thread.id} thread={thread} editor={editor} />
      ))}
    </aside>
  );
}

function CustomThread({
  editor,
  thread,
}: Props & { thread: CustomThreadData }) {
  const highlightEvent = useHighlightEvent();
  const [active, setActive] = useState(false);

  useHighlightEventListener((highlightId) => {
    setActive(highlightId === thread.metadata.highlightId);
  });

  const handlePointerEnter = useCallback(() => {
    setActive(true);
  }, [highlightEvent, thread]);

  const handlePointerLeave = useCallback(() => {
    setActive(false);
  }, [highlightEvent]);

  const handleThreadDelete = useCallback(
    (thread: CustomThreadData) => {
      removeCommentHighlight(editor, thread.metadata.highlightId);
    },
    [editor, thread]
  );

  const quoteHtml = getCommentHighlightContent(thread.metadata.highlightId);

  return (
    <div
      className="hide-collaboration-cursor"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div className={styles.thread} data-active={active}>
        {quoteHtml ? (
          <div
            className={styles.threadQuote}
            dangerouslySetInnerHTML={{
              __html: getCommentHighlightContent(
                thread.metadata.highlightId
              ) as string,
            }}
          />
        ) : null}
        <Thread
          thread={thread}
          onThreadDelete={handleThreadDelete}
          indentCommentContent={false}
        />
      </div>
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
    [editor]
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
      className={styles.composer}
      onComposerSubmit={handleComposerSubmit}
      autoFocus={true}
    />
  );
}

function sortThreads(a: CustomThreadData, b: CustomThreadData) {
  if (a.createdAt > b.createdAt) {
    return -1;
  }

  if (a.createdAt < b.createdAt) {
    return 1;
  }

  return 0;
}

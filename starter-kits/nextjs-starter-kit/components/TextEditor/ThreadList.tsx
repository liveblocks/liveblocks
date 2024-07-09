"use client";

import { ThreadData } from "@liveblocks/client";
import { useCreateThread, useThreads } from "@liveblocks/react/suspense";
import { Composer, ComposerSubmitComment, Thread } from "@liveblocks/react-ui";
import { Editor } from "@tiptap/react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { CommentIcon } from "@/icons";
import {
  getCommentHighlightContent,
  removeCommentHighlight,
  useHighlightEventListener,
} from "./comment-utils";
import styles from "./ThreadList.module.css";

type Props = {
  editor: Editor;
};

export function ThreadList({ editor }: Props) {
  const { threads } = useThreads();
  const showComposer = editor?.storage.commentHighlight.showComposer;

  return (
    <>
      {showComposer ? <ThreadComposer editor={editor} /> : null}
      <aside aria-label="Comments" className={styles.threadList}>
        {threads.length ? (
          threads
            .sort(sortThreads)
            .map((thread) => (
              <CustomThread key={thread.id} thread={thread} editor={editor} />
            ))
        ) : (
          <NoComments />
        )}
      </aside>
    </>
  );
}

function NoComments() {
  return (
    <div className={styles.noComments}>
      <div className={styles.noCommentsHeader}>No comments yet</div>
      <p>
        <span className={styles.noCommentsButton}>
          <CommentIcon />
        </span>
        Create a comment by selecting text and pressing the comment button.
      </p>
    </div>
  );
}

function CustomThread({ editor, thread }: Props & { thread: ThreadData }) {
  const [active, setActive] = useState(false);

  useHighlightEventListener((highlightId) => {
    setActive(highlightId === thread.metadata.highlightId);
  });

  const handleThreadDelete = useCallback(
    (thread: ThreadData) => {
      removeCommentHighlight(editor, thread.metadata.highlightId);
    },
    [editor]
  );

  const quoteHtml = getCommentHighlightContent(thread.metadata.highlightId);

  return (
    <div className="hide-collaboration-cursor">
      <div
        className={styles.thread}
        data-active={active}
        data-highlight-id={thread.metadata.highlightId}
      >
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
        metadata: { highlightId },
      });

      editor.commands.setCommentHighlight({
        highlightId,
        state: "complete",
      });

      editor.storage.commentHighlight.currentHighlightId = null;
      editor.storage.commentHighlight.showComposer = false;
      editor.storage.commentHighlight.previousHighlightSelection = null;

      // On mobile, after next render, scroll new thread into view
      setTimeout(() => {
        const newThreadElement = document.querySelector(
          `[data-threads="mobile"] [data-highlight-id="${highlightId}"]`
        );
        newThreadElement?.scrollIntoView();
      });
    },
    [editor, createThread]
  );

  // If clicking outside the composer, hide it and remove highlight
  useEffect(() => {
    if (!composer.current) {
      return;
    }

    const element = composer.current;

    function closeComposer(event: FocusEvent) {
      // Don't close when new focus target a child of .lb-portal (e.g. emoji picker)
      if (
        event.relatedTarget instanceof HTMLElement &&
        event.relatedTarget.closest(".lb-portal")
      ) {
        return;
      }

      removeCommentHighlight(
        editor,
        editor.storage.commentHighlight.currentHighlightId
      );
      editor.storage.commentHighlight.currentHighlightId = null;
      editor.storage.commentHighlight.showComposer = false;
    }

    element.addEventListener("focusout", closeComposer);

    return () => {
      element.removeEventListener("focusout", closeComposer);
    };
  }, [editor, composer]);

  return (
    <Composer
      ref={composer}
      className={styles.composer}
      onComposerSubmit={handleComposerSubmit}
      onClick={(e) => {
        // Don't send up a click event from emoji popout and close the composer
        e.stopPropagation();
      }}
      autoFocus={true}
    />
  );
}

function sortThreads(a: ThreadData, b: ThreadData) {
  if (a.resolved) {
    return 1;
  }

  if (b.resolved) {
    return -1;
  }

  if (a.createdAt > b.createdAt) {
    return -1;
  }

  if (a.createdAt < b.createdAt) {
    return 1;
  }

  return 0;
}

export function useMediaQuery(query: string): boolean {
  const getMatches = (query: string): boolean => {
    // Prevents SSR issues
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  function handleChange() {
    setMatches(getMatches(query));
  }

  useEffect(() => {
    const matchMedia = window.matchMedia(query);

    // Triggered at the first client-side load and if query changes
    handleChange();

    // Listen matchMedia
    if (matchMedia.addListener) {
      matchMedia.addListener(handleChange);
    } else {
      matchMedia.addEventListener("change", handleChange);
    }

    return () => {
      if (matchMedia.removeListener) {
        matchMedia.removeListener(handleChange);
      } else {
        matchMedia.removeEventListener("change", handleChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return matches;
}

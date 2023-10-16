"use client";

import {
  CustomThreadData,
  useCreateThread,
  useThreads,
} from "@/liveblocks.config";
import { Composer, Thread } from "@liveblocks/react-comments";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Editor } from "@tiptap/react";
import { ComposerSubmitComment } from "@liveblocks/react-comments";
import * as Popover from "@radix-ui/react-popover";
import {
  getCommentHighlightContent,
  removeCommentHighlight,
  useHighlightEvent,
  useHighlightEventListener,
} from "@/comment-utils";
import { CommentIcon, MenuIcon } from "@/icons";
import { Button } from "@/components/Button";
import styles from "./ThreadList.module.css";

type Props = {
  editor: Editor;
};

export function ThreadList({ editor }: Props) {
  const { threads } = useThreads();
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const [showMobileMenu, setShowMobileMenu] = useState(isDesktop);
  const showComposer = editor?.storage.commentHighlight.showComposer;

  const Wrapper = ({ children }: { children: ReactNode }) =>
    isDesktop ? (
      <>{children}</>
    ) : (
      <Popover.Root open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <Popover.Trigger>
          <Button
            className={styles.threadListPopoverTrigger}
            variant="secondary"
            aria-label="Toggle comments"
          >
            <MenuIcon />
          </Button>
        </Popover.Trigger>
        <Popover.Content className={styles.threadListPopover}>
          {children}
        </Popover.Content>
      </Popover.Root>
    );

  return (
    <>
      {showComposer ? <ThreadComposer editor={editor} /> : null}
      <Wrapper>
        <aside
          aria-label="Comments"
          className={styles.threadList}
          data-mobile-menu={showMobileMenu || undefined}
        >
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
      </Wrapper>
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

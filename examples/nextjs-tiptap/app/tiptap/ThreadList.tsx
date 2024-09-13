import { useCreateThread, useThreads } from "@liveblocks/react/suspense";
import { Composer, Thread } from "@liveblocks/react-ui";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { ComposerSubmitComment } from "@liveblocks/react-ui";
import { ThreadData } from "@liveblocks/client";
import CommentIcon from "./icons/comment-icon";
import { threadId } from "worker_threads";
import { SelectionBookmark } from "@tiptap/pm/state";

type Props = {
  editor: Editor;
};

export function getCommentHighlightContent(commentId: string) {
  const elem = document.querySelector(
    `span[data-lb-comment-id="${commentId}"]`
  );

  if (!elem) {
    return null;
  }

  return elem.innerHTML;
}

export function ThreadList({ editor }: Props) {
  const { threads } = useThreads();
  const showComposer = !!editor.storage.liveblocksExtension.pendingCommentSelection;

  return (
    <>
      {showComposer ? <ThreadComposer editor={editor} /> : null}
      <aside aria-label="Comments" >
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
    <div >
      <div >No comments yet</div>
      <p>
        <span >
          <CommentIcon />
        </span>
        Create a comment by selecting text and pressing the comment button.
      </p>
    </div>
  );
}

function CustomThread({ editor, thread }: Props & { thread: ThreadData }) {
  const [active, setActive] = useState(false);

  /*useHighlightEventListener((highlightId) => {
    setActive(highlightId === thread.metadata.highlightId);
  });*/

  const handleThreadDelete = useCallback(
    (thread: ThreadData) => {
      // no op for now
      // removeCommentHighlight(editor, thread.metadata.highlightId);
    },
    [editor]
  );

  const quoteHtml = getCommentHighlightContent(thread.id);

  return (
    <div className="hide-collaboration-cursor">
      <div
        data-active={active}
        data-highlight-id={thread.metadata.highlightId}
      >
        {quoteHtml ? (
          <div
            dangerouslySetInnerHTML={{
              __html: getCommentHighlightContent(
                thread.id
              ) as string,
            }}
          />
        ) : null}
        <Thread
          autoFocus={true}
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

      const thread = createThread({
        body,
      });
      editor.commands.addComment(thread.id);

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
    }

    element.addEventListener("focusout", closeComposer);

    return () => {
      element.removeEventListener("focusout", closeComposer);
    };
  }, [editor, composer]);

  return (
    <Composer
      ref={composer}
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

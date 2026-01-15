import type { BaseMetadata } from "@liveblocks/client";
import { useEffect } from "react";

import type { ThreadsAsyncResult } from "./types";

function handleScrollToCommentOnLoad(
  shouldScrollOnLoad: boolean,
  state: ThreadsAsyncResult<BaseMetadata, BaseMetadata>
) {
  if (shouldScrollOnLoad === false) return;

  if (!state.threads) return;

  const isWindowDefined = typeof window !== "undefined";
  if (!isWindowDefined) return;

  const hash = window.location.hash;
  const commentId = hash.slice(1);

  // If the hash is not a comment ID, we do not scroll to it
  if (!commentId.startsWith("cm_")) return;

  // If a comment with the ID does not exist in the DOM, we do not scroll to it
  const comment = document.getElementById(commentId);
  if (comment === null) return;

  const comments = state.threads.flatMap((thread) => thread.comments);
  const isCommentInThreads = comments.some(
    (comment) => comment.id === commentId
  );

  // If the comment is not in the threads for this hook, we do not scroll to it
  if (!isCommentInThreads) return;

  comment.scrollIntoView();
}

/**
 * Scroll to the comment with the ID in the hash of the URL based on whether
 * the query is loading and whether the hook should scroll to the comment on load.
 */
export function useScrollToCommentOnLoadEffect(
  shouldScrollOnLoad: boolean,
  state: ThreadsAsyncResult<BaseMetadata, BaseMetadata>
) {
  useEffect(
    () => {
      handleScrollToCommentOnLoad(shouldScrollOnLoad, state);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- We only want to run this effect once
    [state.isLoading]
  );
}

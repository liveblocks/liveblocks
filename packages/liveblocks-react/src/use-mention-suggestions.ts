import { stableStringify } from "@liveblocks/core";
import { useEffect, useRef, useState } from "react";

import {
  useMentionSuggestionsCache,
  useResolveMentionSuggestions,
} from "./room";

const MENTION_SUGGESTIONS_DEBOUNCE = 500;

/**
 * @private For internal use only. Do not rely on this hook.
 *
 * Simplistic debounced search, we don't need to worry too much about deduping
 * and race conditions as there can only be one search at a time.
 */
export function useMentionSuggestions(roomId: string, search?: string) {
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>();
  const lastInvokedAt = useRef<number>();

  const resolveMentionSuggestions = useResolveMentionSuggestions();
  const mentionSuggestionsCache = useMentionSuggestionsCache();

  useEffect(() => {
    if (search === undefined || !resolveMentionSuggestions) {
      return;
    }

    const resolveMentionSuggestionsArgs = { text: search, roomId };
    const mentionSuggestionsCacheKey = stableStringify(
      resolveMentionSuggestionsArgs
    );
    let debounceTimeout: number | undefined;
    let isCanceled = false;

    const getMentionSuggestions = async () => {
      try {
        lastInvokedAt.current = performance.now();
        const mentionSuggestions = await resolveMentionSuggestions(
          resolveMentionSuggestionsArgs
        );

        if (!isCanceled) {
          setMentionSuggestions(mentionSuggestions);
          mentionSuggestionsCache.set(
            mentionSuggestionsCacheKey,
            mentionSuggestions
          );
        }
      } catch (error) {
        console.error((error as Error)?.message);
      }
    };

    if (mentionSuggestionsCache.has(mentionSuggestionsCacheKey)) {
      // If there are already cached mention suggestions, use them immediately.
      setMentionSuggestions(
        mentionSuggestionsCache.get(mentionSuggestionsCacheKey)
      );
    } else if (
      !lastInvokedAt.current ||
      Math.abs(performance.now() - lastInvokedAt.current) >
        MENTION_SUGGESTIONS_DEBOUNCE
    ) {
      // If on the debounce's leading edge (either because it's the first invokation or enough
      // time has passed since the last debounce), get mention suggestions immediately.
      void getMentionSuggestions();
    } else {
      // Otherwise, wait for the debounce delay.
      debounceTimeout = window.setTimeout(() => {
        void getMentionSuggestions();
      }, MENTION_SUGGESTIONS_DEBOUNCE);
    }

    return () => {
      isCanceled = true;
      window.clearTimeout(debounceTimeout);
    };
  }, [search, roomId, resolveMentionSuggestions, mentionSuggestionsCache]);

  return mentionSuggestions;
}

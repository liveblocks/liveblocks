import type { MentionData } from "@liveblocks/core";
import { stableStringify } from "@liveblocks/core";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  useMentionSuggestionsCache,
  useResolveMentionSuggestions,
} from "./room";

const MENTION_SUGGESTIONS_DEBOUNCE = 500;

/**
 * Normalize mention suggestions as `MentionData[]`.
 *
 * Mention suggestions were previously typed as `string[]`, a list of user IDs,
 * but to support multiple mention kinds (user, group, etc), they're now
 * typed as `MentionData[]`.
 */
function normalizeMentionSuggestions<T extends string[] | MentionData[]>(
  suggestions: T
): MentionData[] {
  return suggestions.map(
    (suggestion): MentionData =>
      typeof suggestion === "string"
        ? { kind: "user" as const, id: suggestion }
        : suggestion
  );
}

type ExcludedKinds = Partial<Record<MentionData["kind"], true>>;

interface UseMentionSuggestionsOptions<
  K extends ExcludedKinds | undefined = undefined,
> {
  /**
   * Which mention kinds to exclude from the suggestions. Defaults to none.
   */
  excludedKinds?: K;
}

type NarrowedMentionData<
  K extends Partial<Record<MentionData["kind"], true>> | undefined,
> =
  K extends Partial<Record<MentionData["kind"], true>>
    ? Exclude<
        MentionData,
        | (K extends { user: true }
            ? Extract<MentionData, { kind: "user" }>
            : never)
        | (K extends { group: true }
            ? Extract<MentionData, { kind: "group" }>
            : never)
        | (K extends { copilot: true }
            ? Extract<MentionData, { kind: "copilot" }>
            : never)
      >
    : MentionData;

/**
 * @private For internal use only. Do not rely on this hook.
 *
 * Simplistic debounced search, we don't need to worry too much about deduping
 * and race conditions as there can only be one search at a time.
 */
export function useMentionSuggestions<
  K extends ExcludedKinds | undefined = undefined,
>(
  roomId: string,
  search?: string | undefined,
  options?: UseMentionSuggestionsOptions<K>
): NarrowedMentionData<K>[] | undefined {
  const excludeUserMentions = options?.excludedKinds?.user ?? false;
  const excludeGroupMentions = options?.excludedKinds?.group ?? false;
  const excludeCopilotMentions = options?.excludedKinds?.copilot ?? false;
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionData[]>();
  // Filtering happens per hook rather than in the cache to still allow
  // sharing cached suggestions between different filter options (e.g. Comments and Text Editor)
  const filteredMentionSuggestions = useMemo(() => {
    return mentionSuggestions?.filter(
      (mention): mention is NarrowedMentionData<K> => {
        return (
          (!excludeUserMentions && mention.kind === "user") ||
          (!excludeGroupMentions && mention.kind === "group") ||
          (!excludeCopilotMentions && mention.kind === "copilot")
        );
      }
    );
  }, [
    mentionSuggestions,
    excludeUserMentions,
    excludeGroupMentions,
    excludeCopilotMentions,
  ]);
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
        const rawMentionSuggestions = await resolveMentionSuggestions(
          resolveMentionSuggestionsArgs
        );

        if (!isCanceled) {
          const normalizedSuggestions = normalizeMentionSuggestions(
            rawMentionSuggestions
          );
          setMentionSuggestions(normalizedSuggestions);
          mentionSuggestionsCache.set(
            mentionSuggestionsCacheKey,
            normalizedSuggestions
          );
        }
      } catch (error) {
        console.error((error as Error)?.message);
      }
    };

    if (mentionSuggestionsCache.has(mentionSuggestionsCacheKey)) {
      // If there are already cached mention suggestions, use them immediately.
      const cachedSuggestions = mentionSuggestionsCache.get(
        mentionSuggestionsCacheKey
      );
      setMentionSuggestions(cachedSuggestions);
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

  return filteredMentionSuggestions;
}

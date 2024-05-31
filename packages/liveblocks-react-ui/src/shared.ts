import type { BaseUserMeta, Client } from "@liveblocks/core";
import { kInternal, raise, stringify } from "@liveblocks/core";
import {
  useClient,
  useLiveblocksContextBundleOrNull__,
  useRoom,
  useRoomContextBundleOrNull__,
} from "@liveblocks/react";
import React from "react";

type OpaqueClient = Client<BaseUserMeta>;

const MENTION_SUGGESTIONS_DEBOUNCE = 500;

const _cachesByClient = new WeakMap<OpaqueClient, Map<string, string[]>>();

function getMentionSuggestionsCacheForClient(client: OpaqueClient) {
  let cache = _cachesByClient.get(client);
  if (!cache) {
    cache = new Map();
    _cachesByClient.set(client, cache);
  }
  return cache;
}

/** @internal */
// Simplistic debounced search, we don't need to worry too much about
// deduping and race conditions as there can only be one search at a time.
export function useMentionSuggestions(search?: string) {
  const client = useClient();
  const mentionSuggestionsCache = getMentionSuggestionsCacheForClient(client);

  const room = useRoom();
  const [mentionSuggestions, setMentionSuggestions] =
    React.useState<string[]>();
  const lastInvokedAt = React.useRef<number>();

  React.useEffect(() => {
    const resolveMentionSuggestions =
      client[kInternal].resolveMentionSuggestions;

    if (search === undefined || !resolveMentionSuggestions) {
      return;
    }

    const resolveMentionSuggestionsArgs = { text: search, roomId: room.id };
    const mentionSuggestionsCacheKey = stringify(resolveMentionSuggestionsArgs);
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
  }, [room.id, search]);

  return mentionSuggestions;
}

export function useCurrentUserId(): string | null {
  const roomContextBundle = useRoomContextBundleOrNull__();
  const liveblocksContextBundle = useLiveblocksContextBundleOrNull__();

  if (roomContextBundle !== null) {
    return roomContextBundle[kInternal].useCurrentUserIdFromRoom();
  } else if (liveblocksContextBundle !== null) {
    return liveblocksContextBundle[kInternal].useCurrentUserIdFromClient();
  } else {
    raise(
      "LiveblocksProvider or RoomProvider are missing from the React tree."
    );
  }
}

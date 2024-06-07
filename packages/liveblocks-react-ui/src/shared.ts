import type { OpaqueClient } from "@liveblocks/core";
import { kInternal, raise, stringify } from "@liveblocks/core";
import {
  ClientContext,
  RoomContext,
  useClient,
  useRoom,
  useSelf,
} from "@liveblocks/react";
import React, { useContext, useSyncExternalStore } from "react";

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

/**
 * @private For internal use only. Do not rely on this hook.
 *
 * Simplistic debounced search, we don't need to worry too much about deduping
 * and race conditions as there can only be one search at a time.
 */
export function useMentionSuggestions(search?: string) {
  const client = useClient();

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

    const mentionSuggestionsCache = getMentionSuggestionsCacheForClient(client);
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
  }, [client, room.id, search]);

  return mentionSuggestions;
}

function useCurrentUserIdFromRoom() {
  return useSelf((user) => (typeof user.id === "string" ? user.id : null));
}

function useCurrentUserIdFromClient_withClient(client: OpaqueClient) {
  const currentUserIdStore = client[kInternal].currentUserIdStore;
  return useSyncExternalStore(
    currentUserIdStore.subscribe,
    currentUserIdStore.get,
    currentUserIdStore.get
  );
}

export function useCurrentUserId(): string | null {
  const client = useContext(ClientContext);
  const room = useContext(RoomContext);

  // NOTE: These hooks are called conditionally, but in a way that will not
  // take different code paths between re-renders, so we can ignore the
  // rules-of-hooks lint warning here.
  /* eslint-disable react-hooks/rules-of-hooks */
  if (room !== null) {
    return useCurrentUserIdFromRoom();
  } else if (client !== null) {
    return useCurrentUserIdFromClient_withClient(client);
  } else {
    raise(
      "LiveblocksProvider or RoomProvider are missing from the React tree."
    );
  }
  /* eslint-enable react-hooks/rules-of-hooks */
}

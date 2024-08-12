import type { OpaqueClient } from "@liveblocks/core";
import { kInternal, raise, stringify } from "@liveblocks/core";
import {
  ClientContext,
  RoomContext,
  useClient,
  useRoom,
  useSelf,
} from "@liveblocks/react";
import React, { useContext } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

const MENTION_SUGGESTIONS_DEBOUNCE = 500;

interface MentionSuggestionsState {
  pendingInvocation: Promise<string[]> | null;
  lastSearch: string;
  debounceTimeout: number | null;
  lastInvokedAt: number;
}

const _mentionSuggestionsCachesByClient = new WeakMap<
  OpaqueClient,
  Map<string, string[]>
>();
const _mentionSuggestionsStatesByClient = new WeakMap<
  OpaqueClient,
  MentionSuggestionsState
>();

function getMentionSuggestionsCacheForClient(client: OpaqueClient) {
  let cache = _mentionSuggestionsCachesByClient.get(client);
  if (!cache) {
    cache = new Map();
    _mentionSuggestionsCachesByClient.set(client, cache);
  }
  return cache;
}

function getMentionSuggestionsStateForClient(client: OpaqueClient) {
  let state = _mentionSuggestionsStatesByClient.get(client);
  if (!state) {
    state = {
      pendingInvocation: null,
      lastSearch: "",
      debounceTimeout: null,
      lastInvokedAt: 0,
    };
    _mentionSuggestionsStatesByClient.set(client, state);
  }
  return state;
}

/**
 * @private For internal use only. Do not rely on this hook.
 */
export function useMentionSuggestions(search?: string) {
  const client = useClient();

  const room = useRoom();
  const [mentionSuggestions, setMentionSuggestions] =
    React.useState<string[]>();

  React.useEffect(() => {
    const resolveMentionSuggestions =
      client[kInternal].resolveMentionSuggestions;

    if (!resolveMentionSuggestions) {
      return;
    }

    const searchText = search ?? "";
    const resolveMentionSuggestionsArgs = {
      text: searchText,
      roomId: room.id,
    };
    const mentionSuggestionsCacheKey = stringify(resolveMentionSuggestionsArgs);
    const mentionSuggestionsCache = getMentionSuggestionsCacheForClient(client);
    const mentionSuggestionsState = getMentionSuggestionsStateForClient(client);

    let isCanceled = false;

    if (mentionSuggestionsCache.has(mentionSuggestionsCacheKey)) {
      // If there are already cached mention suggestions, use them immediately.
      setMentionSuggestions(
        mentionSuggestionsCache.get(mentionSuggestionsCacheKey)
      );
      return;
    }

    // If another invocation is already pending, wait for it to resolve and use its result.
    if (
      mentionSuggestionsState.pendingInvocation &&
      mentionSuggestionsState.lastSearch === searchText
    ) {
      mentionSuggestionsState.pendingInvocation.then(setMentionSuggestions);
      return;
    }

    const getMentionSuggestions = async () => {
      try {
        mentionSuggestionsState.lastInvokedAt = performance.now();
        const suggestions = await resolveMentionSuggestions(
          resolveMentionSuggestionsArgs
        );

        mentionSuggestionsCache.set(mentionSuggestionsCacheKey, suggestions);

        if (!isCanceled) {
          setMentionSuggestions(suggestions);
        }

        return suggestions;
      } catch (error) {
        console.error((error as Error)?.message);
        return [];
      } finally {
        mentionSuggestionsState.pendingInvocation = null;
      }
    };

    const invokeResolveMentionSuggestions = () => {
      mentionSuggestionsState.pendingInvocation = getMentionSuggestions();
      mentionSuggestionsState.lastSearch = searchText;
    };

    const now = performance.now();
    const timeSinceLastInvocation = now - mentionSuggestionsState.lastInvokedAt;

    if (timeSinceLastInvocation > MENTION_SUGGESTIONS_DEBOUNCE) {
      // If on the debounce's leading edge (either because it's the first invocation or enough
      // time has passed since the last debounce), get mention suggestions immediately.
      invokeResolveMentionSuggestions();
    } else {
      // Otherwise, wait for the debounce delay.
      if (mentionSuggestionsState.debounceTimeout !== null) {
        clearTimeout(mentionSuggestionsState.debounceTimeout);
      }

      mentionSuggestionsState.debounceTimeout = window.setTimeout(
        invokeResolveMentionSuggestions,
        MENTION_SUGGESTIONS_DEBOUNCE
      );
    }

    return () => {
      isCanceled = true;

      if (mentionSuggestionsState.debounceTimeout !== null) {
        clearTimeout(mentionSuggestionsState.debounceTimeout);
      }
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

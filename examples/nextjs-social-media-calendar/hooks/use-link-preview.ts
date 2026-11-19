"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getLinkPreview,
  type LinkPreviewMetadata,
} from "@/actions/link-preview";

type LinkPreviewResult = {
  metadata: LinkPreviewMetadata | undefined;
  error: string | undefined;
};

type CacheEntry = { result?: LinkPreviewResult };

// One fetch per URL for the lifetime of the page: the same link is shown by
// its calendar card, its list row, and the composer, and the page it points
// to doesn't change while it's open.
const cache = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function load(url: string) {
  if (cache.has(url)) {
    return;
  }
  const entry: CacheEntry = {};
  cache.set(url, entry);
  getLinkPreview(url)
    .then(
      (response): LinkPreviewResult => ({
        metadata: response.data,
        error: response.error,
      }),
      (): LinkPreviewResult => ({
        metadata: undefined,
        error: "Can't fetch page",
      })
    )
    .then((result) => {
      entry.result = result;
      for (const listener of listeners) {
        listener();
      }
    });
}

/**
 * The Open Graph title, description and image of a page, fetched once on the
 * server by the `getLinkPreview` action and shared by every component showing
 * that link. `isLoading` is true until the page has been fetched (or failed).
 */
export function useLinkPreview(url: string): LinkPreviewResult & {
  isLoading: boolean;
} {
  useEffect(() => {
    load(url);
  }, [url]);

  const result = useSyncExternalStore(
    subscribe,
    () => cache.get(url)?.result,
    () => undefined
  );

  return {
    metadata: result?.metadata,
    error: result?.error,
    isLoading: result === undefined,
  };
}

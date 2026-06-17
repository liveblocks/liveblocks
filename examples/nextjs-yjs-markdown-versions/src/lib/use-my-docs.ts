"use client";

import useSWRInfinite from "swr/infinite";
import type { SWRInfiniteResponse } from "swr/infinite";

import { listMyDocsPage } from "@/app/docs/actions";
import type { DocsPage } from "./docs-pagination";

type Key = readonly ["my-docs", string | null];

const SWR_KEY = "my-docs" as const;

function getKey(pageIndex: number, previousPageData: DocsPage | null): Key | null {
  // Reached the end of the cursor chain.
  if (previousPageData && !previousPageData.nextCursor) return null;
  if (pageIndex === 0 || !previousPageData) {
    return [SWR_KEY, null];
  }
  return [SWR_KEY, previousPageData.nextCursor];
}

async function fetcher([, cursor]: Key): Promise<DocsPage> {
  return await listMyDocsPage({ cursor });
}

/**
 * Shared SWR hook for the signed-in user's documents. The dashboard and the
 * editor sidebar both call this hook with the same getKey/fetcher so they
 * share a single SWR cache and benefit from a unified `mutate()`.
 */
export function useMyDocs(opts?: {
  fallbackData?: DocsPage[];
}): SWRInfiniteResponse<DocsPage> {
  return useSWRInfinite<DocsPage>(getKey, fetcher, {
    fallbackData: opts?.fallbackData,
    // Revalidate the first page on focus/reconnect but not every page — for
    // an example app the first page is the freshest data we care about.
    revalidateFirstPage: true,
    revalidateAll: false,
    parallel: false,
  });
}

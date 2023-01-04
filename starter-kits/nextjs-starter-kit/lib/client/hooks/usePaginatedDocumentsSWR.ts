import { SWRConfiguration } from "swr";
import useSWRInfinite, { SWRInfiniteKeyLoader } from "swr/infinite";
import { GetDocumentsProps, GetDocumentsResponse } from "../../../types";
import { getDocuments, getNextDocuments } from "../documents";
import { useState } from "react";

/**
 * Takes a documentsOptions object and returns a list of paginatable rooms
 *
 * const { data, error, isLoadingMore, ... } = usePaginatedDocumentsSWR({
 *   userId: "charlie.layne@example.com",
 * }, { refreshInterval: 10000 });
 *
 * @param documentsOptions
 * @param swrOptions
 */
export function usePaginatedDocumentsSWR(
  documentsOptions: GetDocumentsProps | null,
  swrOptions: SWRConfiguration = {}
) {
  const [atEnd, setAtEnd] = useState(false);

  const getKey: SWRInfiniteKeyLoader = (pageIndex, previousPageData) => {
    // `null` has been passed, not ready to fetch yet
    if (documentsOptions === null) {
      return null;
    }

    // `nextPage` is not set, no more pages to retrieve
    if (previousPageData && !previousPageData.nextPage) {
      setAtEnd(true);
      return null;
    }

    // Current page is first page, get initial documents
    if (pageIndex === 0) {
      return [getDocuments, documentsOptions];
    }

    // Current page is a later page, get next documents from `nextPage`
    return [getNextDocuments, { nextPage: previousPageData.nextPage }];
  };

  const fetcher = async <T extends (...args: any) => any>(
    func: T,
    ...args: Parameters<T>[]
  ) => {
    const { data, error } = await func(...args);

    if (error) {
      console.error(error.message);
      throw error;
    }

    return data;
  };

  const result = useSWRInfinite<GetDocumentsResponse>(
    getKey,
    fetcher,
    swrOptions
  );
  const { data, size, isValidating, error } = result;

  // More info, as used in useSWR docs: https://swr.vercel.app/examples/infinite-loading
  const isLoadingInitialData = !data && !error;
  const isLoadingMore =
    isLoadingInitialData ||
    (size > 0 && data && typeof data[size - 1] === "undefined");
  const isEmpty = data?.[0]?.documents.length === 0;
  const isReachingEnd =
    isEmpty ||
    (data &&
      data[data.length - 1]?.documents.length <
        (documentsOptions?.limit || 10)) ||
    atEnd;
  const isRefreshing = isValidating && data && data.length === size;

  return {
    isLoadingInitialData,
    isLoadingMore,
    isEmpty,
    isReachingEnd,
    isRefreshing,
    ...result,
  };
}

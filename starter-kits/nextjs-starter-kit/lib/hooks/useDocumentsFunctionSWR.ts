import useSWR, { SWRConfiguration } from "swr";

/**
 * Custom `useSWR` hook that takes server actions from `/lib/actions`
 *
 * @example
 * const { data, error, mutate } = useDocumentsFunctionSWR([
 *   getDocumentUsers, { documentId }
 * ],{ refreshInterval: 0 });
 *
 * @param documentFunctionAndArguments
 * @param swrOptions
 */
export function useDocumentsFunctionSWR<T extends (...args: any) => any>(
  documentFunctionAndArguments: [T | null, Parameters<T> | Parameters<T>[0]],
  swrOptions: SWRConfiguration = {}
) {
  const fetcher = async ([func, ...args]: [T, Parameters<T>[]]) => {
    const { data, error } = await func(...args);

    if (error) {
      console.error(error.message);
      throw error;
    }

    return data;
  };

  return useSWR<Awaited<ReturnType<T>>["data"]>(
    [...documentFunctionAndArguments],
    fetcher,
    swrOptions
  );
}

import useSWR, { SWRConfiguration } from "swr";

// Custom `useSWR` hook that works with /lib/client/documents functions
export function useDocumentsFunctionSWR<T extends (...args: any) => any>(
  documentFunctionAndArguments: [T | null, Parameters<T> | Parameters<T>[0]],
  swrOptions: SWRConfiguration = {}
) {
  const fetcher = async (func: T, ...args: Parameters<T>[]) => {
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

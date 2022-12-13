import { ENDPOINT_BASE_URL } from "../../../liveblocks.config";
import { ErrorData, FetchApiResult } from "../../../types";

/**
 * Fetch API Endpoint
 *
 * Similar to using normal fetch for a custom API endpoint within
 * /pages/api, with error checking
 * Uses Liveblocks API
 *
 * @param url - The part of the URL to attach to the host
 * @param fetchOptions - Fetch options to be used
 */
export async function fetchApiEndpoint<T = unknown>(
  url: string,
  fetchOptions?: RequestInit
): Promise<FetchApiResult<T>> {
  try {
    const response = await fetch(`${ENDPOINT_BASE_URL}${url}`, fetchOptions);
    const body = await response.json();

    if (!response.ok) {
      if (body.error?.code && body.error?.message && body.error?.suggestion) {
        console.error(body.error);
        return { error: body.error };
      }

      const error = {
        code: 400,
        message: `Error when calling ${url}: ${
          body?.error ?? response.statusText
        }`,
        suggestion: "Please try again",
      };
      console.log(error);
      if ("error" in body) {
        console.error(body.error);
      }
      return { error };
    }

    return { data: body };
  } catch (err: any) {
    if (err?.code && err?.message && err?.suggestion) {
      console.error(err);
      return { error: err as ErrorData };
    }

    const error = {
      code: 400,
      message: `Error when calling ${url}`,
      suggestion: "Please try again",
    };
    console.error(error);
    return { error };
  }
}

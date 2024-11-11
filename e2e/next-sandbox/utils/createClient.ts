import type { BaseUserMeta, Client, ClientOptions } from "@liveblocks/client";
import { createClient as realCreateClient } from "@liveblocks/client";
import { nn } from "@liveblocks/core";

export const DEFAULT_AUTH_ENDPOINT = "/api/auth/access-token";
export const DEFAULT_THROTTLE = 16;

/**
 * Like your regular createClient(), but will override the base URL, and use
 * a faster-than-normal throttle.
 */
export function createLiveblocksClient<U extends BaseUserMeta>(
  options?: Partial<ClientOptions<U>>
): Client<U> {
  return realCreateClient(createLiveblocksClientOptions(options));
}

export function createLiveblocksClientOptions<U extends BaseUserMeta>(
  options?: Partial<ClientOptions<U>>
): ClientOptions<U> {
  return {
    ...options,

    authEndpoint:
      options?.authEndpoint || !options?.publicApiKey
        ? DEFAULT_AUTH_ENDPOINT
        : undefined,
    throttle: options?.throttle ?? DEFAULT_THROTTLE,

    // @ts-expect-error - Hidden settings
    enableDebugLogging: true,
    baseUrl: nn(
      process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
      "Please specify NEXT_PUBLIC_LIVEBLOCKS_BASE_URL env var"
    ),
  };
}

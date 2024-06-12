/* eslint-disable */
// @ts-nocheck
import { createClient } from "@liveblocks/client";

export const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 16,
});

declare global {
  interface Liveblocks {
    // Define your custom types here
    // See https://liveblocks.io/docs/api-reference/liveblocks-react#TypeScript
  }
}

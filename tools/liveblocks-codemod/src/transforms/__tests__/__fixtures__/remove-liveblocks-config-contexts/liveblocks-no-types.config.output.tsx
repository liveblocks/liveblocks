/* eslint-disable */
// @ts-nocheck
import { createClient } from "@liveblocks/client";

export const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 16,
});

/* eslint-disable */
// @ts-nocheck
import { Json, LiveObject, createClient } from "@liveblocks/client";

export const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 16,
});

type Presence = {
  selectedShape: string | null;
};

type ThreadMetadata = {
  x: number;
  y: number;
};

type Shape = LiveObject<{
  x: number;
  y: number;
  fill: string;
}>;

export { Shape, Presence };

type UserMeta = {
  id?: string; // Accessible through `user.id`
  info?: Json; // Accessible through `user.info`
};

declare global {
  // For more information, see https://liveblocks.io/docs/api-reference/liveblocks-client#TypeScript
  interface Liveblocks {
    Presence: Presence;
    UserMeta: UserMeta;
    RoomEvent: { type: "message"; message: string };
    ThreadMetadata: ThreadMetadata;
  }
}

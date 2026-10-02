import { LiveList, LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";
import type { Channel } from "@/lib/channels";

export const DEFAULT_CHANNELS = [
  "general",
  "random",
  "engineering",
  "design",
  "marketing",
];

export function createInitialStorage() {
  return {
    channels: new LiveList(
      DEFAULT_CHANNELS.map(
        (name) => new LiveObject<Channel>({ id: nanoid(), name })
      )
    ),
  };
}

import { LiveObject } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    // Storage type
    Storage: {
      person: LiveObject<{
        name: string;
        age: number;
      }>;
    };
  }
}

export {};

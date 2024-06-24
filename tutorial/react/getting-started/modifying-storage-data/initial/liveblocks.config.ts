import { LiveObject } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    Storage: {
      person: LiveObject<{
        name: string;
        age: number;
      }>;
    };
  }
}

export {};

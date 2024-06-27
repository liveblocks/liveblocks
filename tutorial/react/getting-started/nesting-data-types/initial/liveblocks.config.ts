import { LiveList, LiveObject } from "@liveblocks/client";

// Person type

// Global types
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

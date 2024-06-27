import { LiveList, LiveObject } from "@liveblocks/client";

// Person type
type Person = LiveObject<{
  name: string;
  age: number;
}>;

// Global types
declare global {
  interface Liveblocks {
    Storage: {
      people: LiveList<Person>;
    };
  }
}

export {};

import { createClient } from "@liveblocks/client";

export const client = createClient({
  publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY,
  throttle: 16,
});

declare global {
  interface Liveblocks {
    // Presence represents the properties that exist on every user in the Room
    // and that will automatically be kept in sync. Accessible through the
    // `user.presence` property. Must be JSON-serializable.
    Presence: {
      name: string;
      avatar: string;
      // ...
    };
  }
}

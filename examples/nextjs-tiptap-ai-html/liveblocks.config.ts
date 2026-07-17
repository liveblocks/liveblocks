import type { HtmlVersionData } from "./app/types";

declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Each HTML component owns one feed; every generation, manual code
    // edit, or restore appends one message, so the feed doubles as the
    // component's version history.
    FeedMessageData: HtmlVersionData;

    FeedMetadata: {
      kind?: string;
    };
  }
}

export {};

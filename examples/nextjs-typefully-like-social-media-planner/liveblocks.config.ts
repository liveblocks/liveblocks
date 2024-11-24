import { LiveList } from "@liveblocks/client";

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
    Storage: {
      title: string;
      postIds: LiveList<string>;
      publicPreview: boolean;
    };
  }
}

export {};

import { LiveMap, LiveObject } from "@liveblocks/client";

type LiveblocksJson =
  | string
  | number
  | boolean
  | null
  | LiveblocksJson[]
  | { [key: string]: LiveblocksJson };

type LiveblocksJsonObject = { [key: string]: LiveblocksJson };

declare global {
  interface Liveblocks {
    Presence: {
      // tldraw instance presence record used for native collaborator cursors.
      presence?: LiveblocksJsonObject | null;
      cursor?: { x: number; y: number } | null;
      selection?: string[];
      isAgent?: boolean;
      agentStatus?: "thinking" | "editing" | "idle";
    };
    Storage: {
      records: LiveMap<string, LiveblocksJsonObject>;
      story: LiveObject<{
        title: string;
      }>;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar?: string;
        isAgent?: boolean;
      };
    };
  }
}

export {};

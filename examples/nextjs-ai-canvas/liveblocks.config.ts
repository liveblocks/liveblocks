import { LiveMap } from "@liveblocks/client";

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
      cursor: { x: number; y: number } | null;
      selection: string[];
      isAgent?: boolean;
      agentStatus?: "thinking" | "editing" | "idle";
    };
    Storage: {
      records: LiveMap<string, LiveblocksJsonObject>;
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

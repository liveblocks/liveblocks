import { LiveList, LiveObject } from "@liveblocks/client";
import type { MarketingRow } from "./src/data/defaultTableData";

declare global {
  interface Liveblocks {
    Presence: {
      focusedCell: { rowId: string; field: string } | null;
      isEditing: boolean;
    };
    Storage: {
      rowData: LiveList<LiveObject<MarketingRow>>;
    };
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        color: string;
        avatar: string;
      }; // Accessible through `user.info`
    };
    ThreadMetadata: {
      rowId: string;
      field: string;
    };
  }
}


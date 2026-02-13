import { LiveList, LiveObject } from "@liveblocks/client";
import type { MarketingRow } from "./src/app/ag-grid/defaultTableData";

declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: {
        name?: string;
        color?: string;
        avatar?: string;
      };
    };
    Presence: {
      focusedCell?: { rowId: string; field: string } | null;
      isEditing?: boolean;
    };
    Storage: {
      rowData?: LiveList<LiveObject<MarketingRow>>;
    };
    ThreadMetadata: {
      // Table cells
      cellId?: string;

      // `ag-grid` cells
      rowId?: string;
      field?: string;

      // Canvas pins
      x?: number;
      y?: number;
    };
  }
}

export {};

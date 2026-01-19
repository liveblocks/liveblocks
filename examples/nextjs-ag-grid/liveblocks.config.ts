import { LiveList, LiveObject } from "@liveblocks/client";

type Row = {
  id: string;
  make: string;
  model: string;
  price: number;
  electric: boolean;
};

declare global {
  interface Liveblocks {
    Presence: {
      focusedCell: { rowId: string; field: string } | null;
      isEditing: boolean;
    };
    Storage: {
      rowData: LiveList<LiveObject<Row>>;
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
  }
}


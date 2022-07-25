import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

export type Presence = {
  selectedCell: string | null;
};

export type Column = {
  id: string;
  width: number;
};

export type Row = {
  id: string;
  height: number;
};

export type CellData = {
  value: string;
};

export type Storage = {
  spreadsheet: LiveObject<{
    cells: LiveMap<string, LiveObject<CellData>>;
    rows: LiveList<LiveObject<Row>>;
    columns: LiveList<LiveObject<Column>>;
  }>;
};

export type UserInfo = {
  name: string;
  color: string;
  url: string;
};

export type UserMeta = {
  id: string;
  info: UserInfo;
};

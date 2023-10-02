import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

export type Presence = {
  selectedCell: string | null;
};

export type Column = {
  id: string;
  width: number;
};

export type Row = {
  height: number;
  id: string;
};

export type Cell = {
  value: string;
};

export type CellAddress = {
  columnId: string;
  rowId: string;
};

export type Storage = {
  spreadsheet: LiveObject<{
    cells: LiveMap<string, LiveObject<Cell>>;
    columns: LiveList<LiveObject<Column>>;
    rows: LiveList<LiveObject<Row>>;
  }>;
};

export type UserInfo = {
  color: string;
  name: string;
  avatar: string;
};

export type UserMeta = {
  id: string;
  info: UserInfo;
};

export type FixedArray<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : RecursiveFixedArray<T, N, []>
  : never;

type RecursiveFixedArray<
  T,
  N extends number,
  R extends unknown[]
> = R["length"] extends N ? R : RecursiveFixedArray<T, N, [T, ...R]>;

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

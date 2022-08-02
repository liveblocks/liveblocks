import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

export interface Presence {
  selectedCell: string | null;
}

export interface Column {
  id: string;
  width: number;
}

export interface Row {
  height: number;
  id: string;
}

export interface CellData {
  value: string;
}

export interface CellAddress {
  columnId: string;
  rowId: string;
}

export interface Storage {
  spreadsheet: LiveObject<{
    cells: LiveMap<string, LiveObject<CellData>>;
    columns: LiveList<LiveObject<Column>>;
    rows: LiveList<LiveObject<Row>>;
  }>;
}

export interface UserInfo {
  color: string;
  name: string;
  url: string;
}

export interface UserMeta {
  id: string;
  info: UserInfo;
}

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

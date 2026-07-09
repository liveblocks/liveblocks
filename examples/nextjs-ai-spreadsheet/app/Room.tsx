"use client";

import { ReactNode } from "react";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { nanoid } from "nanoid";
import {
  cellKey,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  type CellData,
  type CellFormat,
} from "@/liveblocks.config";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { Loading } from "./Loading";

export function Room({ children }: { children: ReactNode }) {
  const roomId = useExampleRoomId();

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ selectedCells: null, promptingFeedId: null }}
      initialStorage={createInitialStorage}
    >
      <ClientSideSuspense fallback={<Loading />}>{children}</ClientSideSuspense>
    </RoomProvider>
  );
}

// Builds an initial example table
function createInitialStorage() {
  const rowIds = Array.from({ length: DEFAULT_ROWS }, () => nanoid());
  const colIds = Array.from({ length: DEFAULT_COLS }, () => nanoid());

  const cellEntries: [string, LiveObject<CellData>][] = [];
  const seed = (row: number, col: number, value: string, format?: CellFormat) =>
    cellEntries.push([
      cellKey(rowIds[row], colIds[col]),
      new LiveObject<CellData>(format ? { value, format } : { value }),
    ]);

  seed(0, 0, "Team Budget — Q1", { bold: true });

  const headerFormat: CellFormat = { bold: true, background: "#dbeafe" };
  seed(2, 0, "Category", headerFormat);
  seed(2, 1, "Planned", { ...headerFormat, align: "right" });
  seed(2, 2, "Actual", { ...headerFormat, align: "right" });
  seed(2, 3, "Variance", { ...headerFormat, align: "right" });

  const rows: [string, number, number][] = [
    ["Marketing", 12000, 10450],
    ["Engineering", 45000, 47200],
    ["Design", 18000, 16800],
    ["Operations", 9000, 8700],
  ];
  rows.forEach(([name, planned, actual], index) => {
    const r = 3 + index;
    const variance = actual - planned;
    seed(r, 0, name);
    seed(r, 1, String(planned), { numberFormat: "currency", align: "right" });
    seed(r, 2, String(actual), { numberFormat: "currency", align: "right" });
    seed(r, 3, String(variance), {
      numberFormat: "currency",
      align: "right",
      color: variance < 0 ? "#ef4444" : "#22c55e",
    });
  });

  return {
    rowIds: new LiveList(rowIds),
    colIds: new LiveList(colIds),
    cells: new LiveMap<string, LiveObject<CellData>>(cellEntries),
    colWidths: new LiveMap<string, number>([[colIds[0], 180]]),
    rowHeights: new LiveMap<string, number>(),
  };
}

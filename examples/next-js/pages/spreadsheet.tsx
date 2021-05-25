import {
  RoomProvider,
  useOthers,
  useUpdateMyPresence,
} from "@liveblocks/react";
import React, { useCallback, useMemo } from "react";

const COLORS = [
  "#E57373",
  "#9575CD",
  "#4FC3F7",
  "#81C784",
  "#FFF176",
  "#FF8A65",
  "#F06292",
  "#7986CB",
];

type Presence = {
  selectedCell: string | null;
};

export default function Room() {
  return (
    <RoomProvider
      id="spreadsheet"
      defaultPresence={() => ({
        selectedCell: null,
      })}
    >
      <SpreadsheetDemo />
    </RoomProvider>
  );
}

export function SpreadsheetDemo() {
  const others = useOthers<Presence>();

  const cellsPresence = useMemo(() => {
    const map = new Map<string, string>();
    for (const { connectionId, presence } of others.toArray()) {
      if (presence && presence.selectedCell) {
        map.set(presence.selectedCell, COLORS[connectionId % COLORS.length]);
      }
    }
    return map;
  }, [others]);

  const updatePresence = useUpdateMyPresence<Presence>();

  const onFocus = useCallback(
    (id: string) => {
      updatePresence({ selectedCell: id });
    },
    [updatePresence]
  );

  return (
    <div className="bg-gray-200 min-h-screen">
      <div className="flex">
        <Cell id="A1" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
        <Cell id="B1" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
        <Cell id="C1" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
      </div>
      <div className="flex">
        <Cell id="A2" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
        <Cell id="B2" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
        <Cell id="C2" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
      </div>
      <div className="flex">
        <Cell id="A3" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
        <Cell id="B3" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
        <Cell id="C3" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
      </div>
      <div className="flex">
        <Cell id="A4" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
        <Cell id="B4" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
        <Cell id="C4" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
      </div>
      <div className="flex">
        <Cell id="A5" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
        <Cell id="B5" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
        <Cell id="C5" onFocus={onFocus} cellsPresence={cellsPresence}></Cell>
      </div>
    </div>
  );
}

type CellProps = {
  id: string;
  onFocus: (id: string) => void;
  cellsPresence: Map<string, string>;
};

function Cell({ onFocus, id, cellsPresence }: CellProps) {
  const color = cellsPresence.get(id);

  const CSSColor = color ? color : "transparent";

  return (
    <input
      className="px-2 text-sm bg-white border"
      onFocus={() => onFocus(id)}
      style={{
        width: 280,
        height: 32,
        margin: 0.5,
        borderColor: CSSColor,
        outline: `1px solid ${CSSColor}`,
      }}
    />
  );
}

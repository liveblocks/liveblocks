"use client";

import { useEffect, useRef } from "react";
import {
  HotColumn,
  HotTable,
  type HotTableRef,
} from "@handsontable/react-wrapper";
import { registerAllModules } from "handsontable/registry";
import { CommentCell } from "./CommentCell";

registerAllModules();

type RowData = {
  id: string;
  name: string;
  time: string;
  room: string;
  duration: string;
};

const COLUMN_FIELDS: Exclude<keyof RowData, "id">[] = [
  "name",
  "time",
  "room",
  "duration",
];

const ROW_DATA: RowData[] = [
  {
    id: "1",
    name: "Kickoff & roadmap",
    time: "9:00 AM",
    room: "Main",
    duration: "1 hr",
  },
  {
    id: "2",
    name: "Design review",
    time: "10:30 AM",
    room: "Studio A",
    duration: "45 min",
  },
  {
    id: "3",
    name: "Eng standup",
    time: "11:00 AM",
    room: "Zoom",
    duration: "15 min",
  },
  {
    id: "4",
    name: "Customer call",
    time: "2:00 PM",
    room: "Conference B",
    duration: "1 hr",
  },
  {
    id: "5",
    name: "Retrospective",
    time: "4:00 PM",
    room: "Main",
    duration: "1 hr",
  },
];

export function Table() {
  const hotRef = useRef<HotTableRef>(null);

  return (
    <HotTable
      ref={hotRef}
      data={ROW_DATA}
      colHeaders={["Name", "Time", "Room", "Duration"]}
      rowHeaders={false}
      height={279}
      width={720}
      licenseKey="non-commercial-and-evaluation"
      columnSorting={{
        indicator: true,
        headerAction: true,
      }}
      manualColumnMove={true}
      autoWrapRow={true}
      autoWrapCol={true}
      autoRowSize={false}
      autoColumnSize={false}
      stretchH="all"
      minRowHeights={50}
    >
      {COLUMN_FIELDS.map((field) => (
        <HotColumn
          // Use the Custom comment cell renderer
          renderer={CommentCell}
          key={field}
          data={field}
          readOnly
        />
      ))}
    </HotTable>
  );
}

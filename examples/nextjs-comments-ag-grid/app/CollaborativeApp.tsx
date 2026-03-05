"use client";

import { useState, useMemo } from "react";
import { AllCommunityModule } from "ag-grid-community";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { CellThreadProvider } from "./CellThreadContext";
import { CommentCell } from "./CommentCell";

const modules = [AllCommunityModule];

type RowData = {
  id: string;
  name: string;
  time: string;
  room: string;
  duration: string;
};

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

export function CollaborativeApp() {
  // Table data
  const [rowData, setRowData] = useState<RowData[]>(ROW_DATA);

  // Defining the columns
  const [colDefs, setColDefs] = useState<{ field: keyof RowData }[]>([
    { field: "name" },
    { field: "time" },
    { field: "room" },
    { field: "duration" },
  ]);

  // Importing our CommentCell component to allow adding comments to cells
  const defaultColDef = useMemo(
    () => ({
      cellRenderer: CommentCell,
    }),
    []
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AgGridProvider modules={modules}>
        <CellThreadProvider>
          <div
            style={{
              height: "272px",
              width: 720,
            }}
          >
            <AgGridReact
              rowData={rowData}
              columnDefs={colDefs}
              defaultColDef={defaultColDef}
              getRowId={(params) => params.data.id}
            />
          </div>
        </CellThreadProvider>
      </AgGridProvider>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { AllCommunityModule } from "ag-grid-community";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { CellThreadProvider } from "./CellThreadContext";
import { CommentCell } from "./CommentCell";

const modules = [AllCommunityModule];

type RowData = { id: string; name: string; price: number };

export function CollaborativeApp() {
  const [rowData] = useState<RowData[]>([
    { id: "1", name: "Laptop", price: 1000 },
    { id: "2", name: "Phone", price: 500 },
    { id: "3", name: "Tablet", price: 300 },
  ]);

  const [colDefs] = useState<{ field: keyof RowData }[]>([
    { field: "name" },
    { field: "price" },
  ]);

  const defaultColDef = useMemo(
    () => ({
      cellRenderer: CommentCell,
    }),
    []
  );

  return (
    <AgGridProvider modules={modules}>
      <CellThreadProvider>
        <div style={{ height: 500 }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
          />
        </div>
      </CellThreadProvider>
    </AgGridProvider>
  );
}

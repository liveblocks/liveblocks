"use client";

import {
  ClientSideSuspense,
  useMutation,
  useStorage,
  useOthers,
  useSelf,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  themeAlpine,
  CellEditRequestEvent,
  CellEditingStartedEvent,
  CellFocusedEvent,
} from "ag-grid-community";
import { AgGridReact, CustomCellRendererProps } from "ag-grid-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { shallow } from "zustand/shallow";

ModuleRegistry.registerModules([AllCommunityModule]);

export function Grid() {
  return (
    <ClientSideSuspense fallback={<div>Loading...</div>}>
      <MainGrid />
    </ClientSideSuspense>
  );
}

function MainGrid() {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const rowData = useStorage((root) => root.rowData);
  const updateMyPresence = useUpdateMyPresence();

  const defaultColDef = useMemo(
    () => ({
      editable: true,
    }),
    []
  );

  const [colDefs] = useState<ColDef[]>([
    { field: "make", cellRenderer: AvatarCell },
    { field: "model", cellRenderer: AvatarCell },
    { field: "price", cellRenderer: AvatarCell },
    { field: "electric" },
  ]);

  const handleCellEditRequest = useMutation(
    ({ storage }, event: CellEditRequestEvent) => {
      const {
        newValue,
        rowIndex,
        colDef: { field },
      } = event;

      if (rowIndex === null || field === undefined) {
        return;
      }

      const rowData = storage.get("rowData");
      const row = rowData.get(rowIndex);

      if (!row) {
        return;
      }

      row.set(field as any, newValue);
    },
    [rowData]
  );

  const handleCellEditingStarted = useMutation(
    ({ setMyPresence }, event: CellEditingStartedEvent) => {
      const rowId = event.data.id;
      const field = event.colDef.field;

      if (event.data.id === undefined || field === undefined) {
        return;
      }

      setMyPresence({ focusedCell: { rowId, field }, isEditing: true });
    },
    []
  );

  const handleCellEditingStopped = useMutation(({ setMyPresence }) => {
    setMyPresence({ isEditing: false });
  }, []);

  const handleCellFocused = useMutation(({ setMyPresence }, event: CellFocusedEvent) => {
    const rowIndex = event.rowIndex;
    const field = (event.column as any)?.colId;

    if (rowIndex === null || field === undefined) {
      return;
    }

    const rowNode = event.api.getDisplayedRowAtIndex(rowIndex);
    const rowId = rowNode?.id;

    if (!rowId) {
      return;
    }

    setMyPresence({ focusedCell: { rowId, field } });
  }, []);

  // Clear focus presence when clicking outside the grid
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      if (
        gridContainerRef.current &&
        !gridContainerRef.current.contains(event.target as Node)
      ) {
        updateMyPresence({ focusedCell: null });
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  return (
    <div ref={gridContainerRef} style={{ height: 500, width: "100%" }}>
      <AgGridReact
        readOnlyEdit={true} /* Lets Liveblocks handle state */
        defaultColDef={defaultColDef}
        getRowId={(params) => params.data.id}
        theme={themeAlpine}
        rowData={rowData as any}
        columnDefs={colDefs}
        onCellEditRequest={handleCellEditRequest}
        onCellEditingStarted={handleCellEditingStarted}
        onCellEditingStopped={handleCellEditingStopped}
        onCellFocused={handleCellFocused}
      />
    </div>
  );
}

function AvatarCell(params: CustomCellRendererProps) {
  const rowId = params?.data?.id;
  const field = params?.colDef?.field;

  const selfFocused = useSelf(
    (me) =>
      me.presence.focusedCell?.rowId === rowId &&
      me.presence.focusedCell?.field === field
  );

  const othersFocused = useOthers(
    (others) =>
      others.filter(
        (other) =>
          other.presence.focusedCell?.rowId === rowId &&
          other.presence.focusedCell?.field === field
      ),
    shallow
  );

  const mostRecentFocused = othersFocused?.[othersFocused.length - 1];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, paddingRight: 24 }}>
      {mostRecentFocused ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: `2px solid ${mostRecentFocused.info.color}`,
            background: "transparent"
          }}
        />
      ) : null}
      <div style={{ paddingRight: 24 }}>
        {params.value}
      </div>
      {/* {othersEditing.map(({ connectionId, presence, info }) => (
        <img key={connectionId} src={info.avatar} width={24} height={24} style={{ position: "absolute", right: 8, borderRadius: "50%", }} />
      ))} */}
      {/* {mostRecentFocused ?
        (
          <img src={mostRecentFocused?.info.avatar} width={24} height={24} style={{ position: "absolute", right: 8, borderRadius: "50%", }} />
        ) : null
      } */}
    </div>
  );
}

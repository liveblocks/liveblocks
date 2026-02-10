"use client";

import { ThreadData } from "@liveblocks/client";
import { Composer, Thread } from "@liveblocks/react-ui";
import * as Popover from "@radix-ui/react-popover";
import {
  ClientSideSuspense,
  useMutation,
  useStorage,
  useOthers,
  useSelf,
  useUpdateMyPresence,
  useThreads,
} from "@liveblocks/react/suspense";
import { useUser } from "@liveblocks/react";
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

  const { threads } = useThreads();

  const defaultColDef = useMemo<ColDef>(
    () => ({
      editable: true,
      cellRenderer: (params: CustomCellRendererProps) => (
        <AvatarCell {...params} threads={threads} />
      ),
    }),
    [threads]
  );

  const colDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "campaign",
        flex: 1,
        minWidth: 160,
      },
      {
        field: "channel",
        width: 120,
      },
      { field: "region", width: 120 },
      {
        field: "spend",
        width: 110,
        type: "numericColumn",
        valueFormatter: (p) =>
          p.value != null
            ? `$${Number(p.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "",
      },
      {
        field: "impressions",
        width: 120,
        type: "numericColumn",
        valueFormatter: (p) =>
          p.value != null ? Number(p.value).toLocaleString() : "",
      },
      {
        field: "clicks",
        width: 100,
        type: "numericColumn",
        valueFormatter: (p) =>
          p.value != null ? Number(p.value).toLocaleString() : "",
      },
      {
        field: "conversions",
        width: 115,
        type: "numericColumn",
        valueFormatter: (p) =>
          p.value != null ? Number(p.value).toLocaleString() : "",
      },
      {
        field: "revenue",
        width: 120,
        type: "numericColumn",
        valueFormatter: (p) =>
          p.value != null
            ? `$${Number(p.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "",
      },
      {
        field: "cpc",
        width: 90,
        type: "numericColumn",
        valueFormatter: (p) =>
          p.value != null ? `$${Number(p.value).toFixed(2)}` : "",
      },
      {
        field: "ctr",
        width: 85,
        type: "numericColumn",
        valueFormatter: (p) =>
          p.value != null ? `${Number(p.value).toFixed(2)}%` : "",
      },
      {
        field: "conversionRate",
        width: 115,
        headerName: "Conv. %",
        type: "numericColumn",
        valueFormatter: (p) =>
          p.value != null ? `${Number(p.value).toFixed(2)}%` : "",
      },
      {
        field: "roi",
        width: 90,
        type: "numericColumn",
        valueFormatter: (p) =>
          p.value != null ? `${Number(p.value).toFixed(1)}%` : "",
      },
      {
        field: "leads",
        width: 90,
        type: "numericColumn",
        valueFormatter: (p) =>
          p.value != null ? Number(p.value).toLocaleString() : "",
      },
      {
        field: "pipelineValue",
        width: 125,
        headerName: "Pipeline",
        type: "numericColumn",
        valueFormatter: (p) =>
          p.value != null
            ? `$${Number(p.value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            : "",
      },
    ],
    [threads]
  );

  const numericFields = useMemo(
    () =>
      new Set([
        "spend",
        "impressions",
        "clicks",
        "conversions",
        "revenue",
        "cpc",
        "ctr",
        "conversionRate",
        "roi",
        "leads",
        "pipelineValue",
      ]),
    []
  );

  const handleCellEditRequest = useMutation(
    ({ storage }, event: CellEditRequestEvent) => {
      const {
        newValue,
        node: { id: rowId },
        colDef: { field },
      } = event;

      if (rowId === undefined || field === undefined) {
        return;
      }

      const rowData = storage.get("rowData");
      const row = rowData.find((row) => row.get("id") === rowId);

      if (!row) {
        return;
      }

      let value: string | number = newValue;
      if (numericFields.has(field as string) && typeof newValue === "string") {
        const parsed = parseFloat(String(newValue).replace(/[$,%\s]/g, ""));
        value = Number.isNaN(parsed) ? 0 : parsed;
      }

      row.set(field as any, value);
    },
    [rowData, numericFields]
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

  const handleCellFocused = useMutation(
    ({ setMyPresence }, event: CellFocusedEvent) => {
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
    },
    []
  );

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

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, []);

  return (
    <div ref={gridContainerRef} className="h-[640px] w-full">
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

function AvatarCell(
  params: CustomCellRendererProps & { threads: ThreadData[] }
) {
  const rowId = params?.data?.id;
  const field = params?.colDef?.field;

  const formatter = params.column?.getColDef().valueFormatter;
  const displayValue =
    typeof formatter === "function" && params.column
      ? formatter(params as Parameters<NonNullable<typeof formatter>>[0])
      : params.value;

  const [composerOpen, setComposerOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);

  const thisThread = params.threads.find(
    (thread) =>
      thread.metadata.rowId === rowId && thread.metadata.field === field
  );

  const { user } = useUser(thisThread?.comments[0]?.userId || "");

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

  const SHOW_COMMENTS = false;

  return (
    <div className="group flex items-center justify-between gap-1">
      {mostRecentFocused ? (
        <div
          className="absolute inset-0 bg-transparent"
          style={{ border: `2px solid ${mostRecentFocused.info.color}` }}
        >
          <div
            className="absolute bottom-full left-0 text-xs px-1 py-px -ml-0.5 rounded-t-sm text-white"
            style={{ backgroundColor: mostRecentFocused.info.color }}
          >
            {mostRecentFocused.info.name}
          </div>
        </div>
      ) : null}
      {selfFocused ? (
        <div
          className="absolute inset-0 bg-transparent -z-10 group"
          style={{ border: `2px solid var(--ag-range-selection-border-color)` }}
        />
      ) : null}
      <div className="pr-6">{displayValue}</div>

      {SHOW_COMMENTS ? (
        thisThread ? (
          <Popover.Root open={threadOpen} onOpenChange={setThreadOpen}>
            <Popover.Trigger asChild>
              <button className="w-6 h-6 rounded-full overflow-hidden p-0 border-none bg-transparent cursor-pointer">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="bg-gray-200 dark:bg-gray-800 rounded-full w-6 h-6 flex items-center justify-center">
                    💬
                  </span>
                )}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content sideOffset={8}>
                <Thread
                  thread={thisThread}
                  className="shadow-lg border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden w-[300px] max-h-[500px]"
                />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        ) : (
          <Popover.Root open={composerOpen} onOpenChange={setComposerOpen}>
            <Popover.Trigger asChild>
              <button className="justify-center items-center group-hover:flex opacity-0 invisible group-hover:opacity-100 group-hover:visible rounded-full bg-gray-200 dark:bg-gray-800 w-6 h-6">
                +
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content sideOffset={8}>
                <Composer
                  className="shadow-lg border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden w-[300px]"
                  onSubmit={() => setComposerOpen(false)}
                  metadata={{ rowId, field }}
                  // autoFocus
                />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )
      ) : null}

      {/* {othersEditing.map(({ connectionId, presence, info }) => (
        <img key={connectionId} src={info.avatar} width={24} height={24} className="absolute right-2 rounded-full" />
      ))} */}
      {/* {mostRecentFocused ?
        (
          <img src={mostRecentFocused?.info.avatar} width={24} height={24} className="absolute right-2 rounded-full" />
        ) : null
      } */}
    </div>
  );
}

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
  useCreateThread,
  useUpdateMyPresence,
  useThreads,
} from "@liveblocks/react/suspense";
import {
  useUser,
} from "@liveblocks/react";
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

  const { threads } = useThreads();

  const colDefs = useMemo<ColDef[]>(() =>[
    { field: "make", cellRenderer: (params: CustomCellRendererProps) => <AvatarCell {...params} threads={threads} /> },
    { field: "model", cellRenderer: (params: CustomCellRendererProps) => <AvatarCell {...params} threads={threads} /> },
    { field: "price", cellRenderer: (params: CustomCellRendererProps) => <AvatarCell {...params} threads={threads} /> },
    { field: "electric" },
  ], [threads]);

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
    <div ref={gridContainerRef} className="h-[500px] w-full">
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

function AvatarCell(params: CustomCellRendererProps & { threads: ThreadData[] }) {
  const rowId = params?.data?.id;
  const field = params?.colDef?.field;

  const createThread = useCreateThread();
  const [composerOpen, setComposerOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  
  
  const thisThread = params.threads.find(
    (thread) =>
       thread.metadata.rowId === rowId &&
       thread.metadata.field === field);

  const { user }  = useUser(thisThread?.comments[0]?.userId || "");
  
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
    <div className="group flex items-center justify-between gap-1 relative">
      {mostRecentFocused ? (
        <div
          className="absolute inset-0 bg-transparent"
          style={{ border: `2px solid ${mostRecentFocused.info.color}` }}
        />
      ) : null}
      <div className="pr-6">
        {params.value}
      </div>

      {thisThread ? (
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
                <span className="bg-gray-200 dark:bg-gray-800 rounded-full w-6 h-6 flex items-center justify-center">💬</span>
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
            <button className="justify-center items-center group-hover:flex opacity-0 invisible group-hover:opacity-100 group-hover:visible rounded-full bg-gray-200 dark:bg-gray-800 w-6 h-6">+</button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content sideOffset={8}>
              <Composer 
                className="shadow-lg border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden w-[300px]" 
                onSubmit={() => setComposerOpen(false)} 
                metadata={{ rowId, field }}
                autoFocus 
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
      
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

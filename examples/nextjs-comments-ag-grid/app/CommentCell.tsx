"use client";

import { FloatingComposer, FloatingThread } from "@liveblocks/react-ui";
import { CustomCellRendererProps } from "ag-grid-react";
import { useCellThread } from "./CellThreadContext";

export function CommentCell(params: CustomCellRendererProps) {
  const { threads, openCell, setOpenCell } = useCellThread();

  const rowId = params.data?.id;
  const columnId = params.colDef?.field;

  if (!rowId || !columnId) {
    return null;
  }

  // Check if there's already a thread for this cell
  const thread = threads.find(
    ({ metadata }) =>
      metadata.rowId === rowId && metadata.columnId === columnId
  );

  // When a thread is created, open it by default
  const defaultOpen =
    openCell !== null &&
    openCell.rowId === rowId &&
    openCell.columnId === columnId;

  const metadata = { rowId, columnId };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      {/* Cell contents */}
      {params.value}

      {/* Show thread if it exists, otherwise show thread composer */}
      {!thread ? (
        <FloatingComposer
          metadata={metadata}
          onComposerSubmit={() => setOpenCell(metadata)}
          style={{ zIndex: 10 }}
        >
          <button>+</button>
        </FloatingComposer>
      ) : (
        <FloatingThread
          thread={thread}
          defaultOpen={defaultOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen && defaultOpen) {
              setOpenCell(null);
            }
          }}
          onComposerSubmit={() => setOpenCell(metadata)}
          style={{ zIndex: 10 }}
          autoFocus
        >
          <button>💬</button>
        </FloatingThread>
      )}
    </div>
  );
}

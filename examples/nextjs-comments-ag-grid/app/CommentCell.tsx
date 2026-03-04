"use client";

import {
  Comment,
  FloatingComposer,
  FloatingThread,
} from "@liveblocks/react-ui";
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
    ({ metadata }) => metadata.rowId === rowId && metadata.columnId === columnId
  );

  // When a thread is created, open it by default
  const defaultOpen =
    openCell !== null &&
    openCell.rowId === rowId &&
    openCell.columnId === columnId;

  const metadata = { rowId, columnId };

  return (
    <div
      className="comment-cell"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      {/* Cell contents */}
      {params.value}

      {/* Show thread if it exists, otherwise show thread composer (plus on hover) */}
      {!thread ? (
        <div className="comment-cell-trigger">
          <FloatingComposer
            metadata={metadata}
            onComposerSubmit={() => setOpenCell(metadata)}
            style={{ zIndex: 10 }}
          >
            <button>
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.992 16.342a2 2 0 01.094 1.167l-1.065 3.29a1 1 0 001.236 1.168l3.413-.998a2 2 0 011.099.092 10 10 0 10-4.777-4.719M8 12h8M12 8v8" />
              </svg>
            </button>
          </FloatingComposer>
        </div>
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
          <Comment.Avatar
            style={{
              width: 28,
              height: 28,
              borderRadius: "100%",
              cursor: "pointer",
            }}
            userId={thread.comments[0]?.userId}
          />
        </FloatingThread>
      )}
    </div>
  );
}

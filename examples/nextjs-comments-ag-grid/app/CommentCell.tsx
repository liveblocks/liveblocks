"use client";

import {
  CommentPin,
  FloatingComposer,
  FloatingThread,
  Icon,
} from "@liveblocks/react-ui";
import { CustomCellRendererProps } from "ag-grid-react";
import { useCellThread } from "./CellThreadContext";
import { CSSProperties } from "react";

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
        gap: 12,
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
            <CustomCommentPin />
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
          <CustomCommentPin userId={thread.comments[0]?.userId} />
        </FloatingThread>
      )}
    </div>
  );
}

const COMMENT_PIN_SIZE = 24;

// Show a plus icon in the pin if no user ID is passed
function CustomCommentPin({ userId }: { userId?: string }) {
  return (
    <CommentPin
      corner="top-left"
      style={
        {
          "--lb-comment-pin-padding": "3px",
          width: COMMENT_PIN_SIZE,
          height: COMMENT_PIN_SIZE,
          cursor: "pointer",
          marginTop: 3,
        } as CSSProperties
      }
      userId={userId}
    >
      {userId ? null : (
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M12 5v14" />
        </svg>
      )}
    </CommentPin>
  );
}

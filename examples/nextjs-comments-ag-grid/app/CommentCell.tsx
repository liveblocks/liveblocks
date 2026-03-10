"use client";

import {
  CommentPin,
  FloatingComposer,
  FloatingThread,
  Icon,
} from "@liveblocks/react-ui";
import { useSelf } from "@liveblocks/react";
import { CustomCellRendererProps } from "ag-grid-react";
import { useCellThread } from "./CellThreadContext";
import { CSSProperties, useState } from "react";

const COMMENT_PIN_SIZE = 24;

const commentPinStyle = {
  "--lb-comment-pin-padding": "3px",
  width: COMMENT_PIN_SIZE,
  height: COMMENT_PIN_SIZE,
  cursor: "pointer",
  marginTop: 3,
} as CSSProperties;

export function CommentCell(params: CustomCellRendererProps) {
  const { threads, openCell, setOpenCell } = useCellThread();
  const currentUserId = useSelf((self) => self.id) ?? undefined;
  const [isComposerOpen, setIsComposerOpen] = useState(false);

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
        <div
          className="comment-cell-trigger"
          data-open={isComposerOpen || undefined}
        >
          <FloatingComposer
            metadata={metadata}
            onComposerSubmit={() => setOpenCell(metadata)}
            onOpenChange={setIsComposerOpen}
            style={{ zIndex: 10 }}
          >
            <CommentPin
              corner="top-left"
              style={commentPinStyle}
              userId={currentUserId}
            >
              {!isComposerOpen ? (
                <Icon.Plus style={{ width: 14, height: 14 }} />
              ) : null}
            </CommentPin>
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
          <CommentPin
            corner="top-left"
            style={commentPinStyle}
            userId={thread.comments[0]?.userId}
          />
        </FloatingThread>
      )}
    </div>
  );
}

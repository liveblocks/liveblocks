"use client";

import {
  CommentPin,
  FloatingComposer,
  FloatingThread,
  Icon,
} from "@liveblocks/react-ui";
import type { HotRendererProps } from "@handsontable/react-wrapper";
import { useSelf } from "@liveblocks/react";
import { CSSProperties, useState } from "react";
import { useCellThread } from "./CellThreadContext";

// Wrapper around the comment pin cell
export function CommentCell({
  instance,
  row,
  col,
  prop,
  value,
}: HotRendererProps) {
  const columnId = String(prop);
  const rowId = String(instance.getDataAtRowProp(row, "id") ?? "");

  if (!rowId || !columnId) {
    return null;
  }

  return (
    <CommentCellBody
      // `key` prevents an issue with duplicate pins displayed in the UI
      key={`${row}-${col}-${rowId}-${columnId}`}
      rowId={rowId}
      columnId={columnId}
      value={value}
    />
  );
}

const COMMENT_PIN_SIZE = 24;

const commentPinStyle = {
  "--lb-comment-pin-padding": "3px",
  width: COMMENT_PIN_SIZE,
  height: COMMENT_PIN_SIZE,
  cursor: "pointer",
  marginTop: 3,
  boxSizing: "border-box",
} as CSSProperties;

// Displays comment pins alongside cell contents
function CommentCellBody({
  rowId,
  columnId,
  value,
}: {
  rowId: string;
  columnId: string;
  value: unknown;
}) {
  const { threads, openCell, setOpenCell } = useCellThread();
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Get the current user's ID, set when authenticating Liveblocks
  const currentUserId = useSelf((self) => self.id) ?? undefined;

  // Each cell has a thread, find the thread for this cell
  // Metadata is set when creating a thread
  const thread = threads.find(
    ({ metadata }) => metadata.rowId === rowId && metadata.columnId === columnId
  );

  // When the thread matches the open cell, open it by default
  const defaultOpen =
    openCell !== null &&
    openCell.rowId === rowId &&
    openCell.columnId === columnId;

  // Metadata for this thread
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
      <span className="comment-cell-value">{String(value ?? "")}</span>

      {!thread ? (
        // If there's no thread, show a thread composer on hover
        <div
          className="comment-cell-trigger"
          data-open={isComposerOpen || undefined}
        >
          <FloatingComposer
            className="ht-theme-main"
            // Set { rowId, columnId } metadata on new threads when created
            metadata={metadata}
            onComposerSubmit={() => setOpenCell(metadata)}
            onOpenChange={setIsComposerOpen}
            style={{ zIndex: 10 }}
          >
            <CommentPin
              corner="top-left"
              style={commentPinStyle}
              // Resolves the image from the current user's ID
              userId={currentUserId}
            >
              {!isComposerOpen ? (
                <Icon.Plus style={{ width: 14, height: 14 }} />
              ) : null}
            </CommentPin>
          </FloatingComposer>
        </div>
      ) : (
        // If a thread has been created already, show it with an avatar pin
        <FloatingThread
          className="ht-theme-main"
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
            // Resolves the image from the writer of thefirst comment in the thread
            userId={thread.comments[0]?.userId}
          />
        </FloatingThread>
      )}
    </div>
  );
}

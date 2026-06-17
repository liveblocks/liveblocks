"use client";

import { CSSProperties, useLayoutEffect } from "react";
import type { HotRendererProps } from "@handsontable/react-wrapper";
import { shallow } from "@liveblocks/client";
import { useStorage } from "@liveblocks/react/suspense";
import {
  CommentPin,
  FloatingComposer,
  FloatingThread,
  Icon,
} from "@liveblocks/react-ui";
import { cellKey } from "@/liveblocks.config";
import { formatDisplayValue, valueStyleFromFormat } from "@/lib/format";
import { useOrder } from "./OrderContext";
import { useCellThread } from "./CellThreadContext";
import { useCellSelectors, useCurrentUserId } from "./CellPresenceContext";

// A single Handsontable cell, rendered as a React component. It combines:
//  - the value + per-cell formatting (from Storage)
//  - other users' (and the AI's) live selection borders (from presence)
//  - a comment pin / composer / thread anchored to the cell
export function Cell(props: HotRendererProps) {
  const { row, col, value, TD } = props;
  const { rowIds, colIds } = useOrder();
  const rowId = rowIds[row];
  const colId = colIds[col];

  if (!rowId || !colId) {
    return null;
  }

  return (
    <CellBody
      // Re-mount when the logical cell changes (e.g. after a reorder) to avoid
      // a stale comment popover lingering on the wrong cell.
      key={`${rowId}:${colId}`}
      rowId={rowId}
      colId={colId}
      value={value}
      td={TD}
    />
  );
}

const COMMENT_PIN_SIZE = 22;

const commentPinStyle: CSSProperties = {
  width: COMMENT_PIN_SIZE,
  height: COMMENT_PIN_SIZE,
  cursor: "pointer",
  boxSizing: "border-box",
};

function CellBody({
  rowId,
  colId,
  value,
  td,
}: {
  rowId: string;
  colId: string;
  value: unknown;
  td: HTMLTableCellElement;
}) {
  // `useStorage` exposes Storage in immutable form: a LiveMap reads as a plain
  // object keyed by string, so we index it rather than call `.get()`.
  const format = useStorage(
    (root) => root.cells[cellKey(rowId, colId)]?.format,
    shallow
  );

  // Everyone (human or AI) whose selection is on this cell. Sourced from a
  // single shared presence subscription (see `CellPresenceContext`) so each
  // cell only re-renders when its own selectors change.
  const selectors = useCellSelectors(rowId, colId);

  const currentUserId = useCurrentUserId();
  const { getThread, openCell, setOpenCell } = useCellThread();
  const thread = getThread(rowId, colId);
  const isOpen = openCell?.rowId === rowId && openCell?.colId === colId;

  // Paint cell background + selection borders directly onto the <td>, which
  // Handsontable resets on every render.
  const background = format?.background ?? "";
  const borders = selectors
    .map((s, i) => `inset 0 0 0 ${2 + i * 2}px ${s.color}`)
    .join(", ");
  const namesTitle = selectors.map((s) => s.name).join(", ");

  useLayoutEffect(() => {
    td.style.background = background;
    td.style.boxShadow = borders;
    if (namesTitle) {
      td.title = namesTitle;
    } else {
      td.removeAttribute("title");
    }
  }, [td, background, borders, namesTitle]);

  const display = formatDisplayValue(String(value ?? ""), format?.numberFormat);
  const valueStyle = valueStyleFromFormat(format);
  const metadata = { rowId, colId };

  return (
    <div className="cell">
      <span
        className="cell-value"
        style={{
          fontWeight: valueStyle.fontWeight,
          fontStyle: valueStyle.fontStyle,
          textDecoration: valueStyle.textDecoration,
          color: valueStyle.color,
          textAlign: valueStyle.textAlign,
        }}
      >
        {display}
      </span>

      {thread ? null : isOpen ? (
        // Only the actively-opened empty cell mounts a composer popover, so we
        // don't pay for hundreds of popovers across the visible grid.
        <FloatingComposer
          className="ht-theme-main"
          metadata={metadata}
          open
          onOpenChange={(open) => setOpenCell(open ? metadata : null)}
          onComposerSubmit={() => setOpenCell(metadata)}
          style={{ zIndex: 50 }}
        >
          <CommentPin
            corner="top-left"
            style={commentPinStyle}
            userId={currentUserId}
          />
        </FloatingComposer>
      ) : (
        <button
          type="button"
          className="cell-comment-trigger flex items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-transform hover:scale-110 active:scale-[0.96]"
          style={commentPinStyle}
          onClick={() => setOpenCell(metadata)}
          aria-label="Comment on cell"
        >
          <Icon.Plus style={{ width: 12, height: 12 }} />
        </button>
      )}

      {thread ? (
        <FloatingThread
          className="ht-theme-main"
          thread={thread}
          defaultOpen={isOpen}
          onOpenChange={(open) => {
            if (!open && isOpen) {
              setOpenCell(null);
            }
          }}
          onComposerSubmit={() => setOpenCell(metadata)}
          style={{ zIndex: 50 }}
          autoFocus
        >
          <CommentPin
            corner="top-left"
            style={commentPinStyle}
            userId={thread.comments[0]?.userId}
          />
        </FloatingThread>
      ) : null}
    </div>
  );
}

"use client";

import { memo, useLayoutEffect } from "react";
import type { HotRendererProps } from "@handsontable/react-wrapper";
import { FloatingComposer, FloatingThread } from "@liveblocks/react-ui";
import { formatDisplayValue, valueStyleFromFormat } from "@/lib/format";
import { useOrder } from "./OrderContext";
import { useCellThread } from "./CellThreadContext";
import { useCellSelectors } from "./CellPresenceContext";
import { useCellFormat } from "./CellFormatContext";

// A single Handsontable cell, rendered as a React component. It combines:
//  - the value + per-cell formatting (from Storage)
//  - other users' (and the AI's) live selection borders (from presence)
//  - a "has a comment" triangle marker (top-right), with the thread/composer
//    popover anchored to the cell's top-right corner
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

const CellBody = memo(function CellBody({
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
  // Per-cell formatting, read from a single shared subscription (see
  // `CellFormatContext`) so the hundreds of cells mounted/unmounted during
  // virtualized scrolling don't each open their own `useStorage` subscription.
  const format = useCellFormat(rowId, colId);

  // Everyone (human or AI) whose selection is on this cell. Sourced from a
  // single shared presence subscription (see `CellPresenceContext`) so each
  // cell only re-renders when its own selectors change.
  const selectors = useCellSelectors(rowId, colId);

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

      {thread ? (
        // A commented cell shows the triangle marker (the popover's anchor). The
        // thread opens when the cell is selected (controlled by `openCell`, via
        // the selection effect), and clicking the marker toggles it open/closed
        // — so it can be reopened after closing without changing selection.
        <FloatingThread
          className="ht-theme-main"
          thread={thread}
          open={isOpen}
          onOpenChange={(open) => setOpenCell(open ? metadata : null)}
          onComposerSubmit={() => setOpenCell(metadata)}
          style={{ zIndex: 50 }}
          autoFocus
        >
          <span className="cell-comment-marker" aria-label="Open comment" />
        </FloatingThread>
      ) : isOpen ? (
        // A cell with no thread mounts the composer only while it's the open
        // cell (e.g. via the toolbar "Comment on cell" button), anchored to a
        // minimal invisible element at the top-right corner.
        <FloatingComposer
          className="ht-theme-main"
          metadata={metadata}
          open
          onOpenChange={(open) => setOpenCell(open ? metadata : null)}
          onComposerSubmit={() => setOpenCell(metadata)}
          style={{ zIndex: 50 }}
        >
          <span className="cell-comment-anchor" aria-hidden="true" />
        </FloatingComposer>
      ) : null}
    </div>
  );
});

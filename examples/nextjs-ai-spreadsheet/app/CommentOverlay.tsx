"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { HotTableRef } from "@handsontable/react-wrapper";
import { FloatingComposer, FloatingThread } from "@liveblocks/react-ui";
import { useOrder } from "./OrderContext";
import { useCellThread } from "./CellThreadContext";

type Rect = { top: number; left: number; width: number; height: number };

// Render a comment in a corner of a cell, without a popover
export function CommentOverlay({
  hotRef,
}: {
  hotRef: RefObject<HotTableRef | null>;
}) {
  const { rowIds, colIds } = useOrder();
  const { getThread, openCell, setOpenCell } = useCellThread();
  const [rect, setRect] = useState<Rect | null>(null);

  // Stop popover closing when submitting a comment
  const lastSubmitRef = useRef(0);
  const closeAfterInteractOutside = useCallback(() => {
    if (Date.now() - lastSubmitRef.current < 1000) {
      return;
    }
    setOpenCell(null);
  }, [setOpenCell]);
  const onComposerSubmit = useCallback(() => {
    lastSubmitRef.current = Date.now();
  }, []);

  const visualRow = openCell ? rowIds.indexOf(openCell.rowId) : -1;
  const visualCol = openCell ? colIds.indexOf(openCell.colId) : -1;

  const measure = useCallback(() => {
    const instance = hotRef.current?.hotInstance;
    if (!instance || visualRow < 0 || visualCol < 0) {
      setRect(null);
      return;
    }
    const td = instance.getCell(visualRow, visualCol) as HTMLElement | null;
    if (!td) {
      setRect(null);
      return;
    }
    const r = td.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [hotRef, visualRow, visualCol]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  // Re-measure the anchor whenever the grid scrolls/renders or the window
  // resizes, so the fixed-positioned anchor tracks the cell.
  useEffect(() => {
    const instance = hotRef.current?.hotInstance;
    if (!instance) {
      return;
    }
    const onChange = () => measure();
    instance.addHook("afterScrollVertically", onChange);
    instance.addHook("afterScrollHorizontally", onChange);
    instance.addHook("afterRender", onChange);
    window.addEventListener("resize", onChange);
    return () => {
      // On unmount / Fast Refresh the Handsontable instance may already be
      // destroyed; calling removeHook on it then throws. Guard + try/catch.
      if (!instance.isDestroyed) {
        try {
          instance.removeHook("afterScrollVertically", onChange);
          instance.removeHook("afterScrollHorizontally", onChange);
          instance.removeHook("afterRender", onChange);
        } catch {
          // Instance was destroyed between the check and the calls; ignore.
        }
      }
      window.removeEventListener("resize", onChange);
    };
  }, [hotRef, measure]);

  if (!openCell || !rect) {
    return null;
  }

  const thread = getThread(openCell.rowId, openCell.colId);
  const metadata = { rowId: openCell.rowId, colId: openCell.colId };

  return (
    <div
      // Invisible anchor box sized/positioned over the open cell. Clicks pass
      // through to the grid; the popover content (portaled) stays interactive.
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: "none",
        zIndex: 40,
      }}
    >
      {thread ? (
        <FloatingThread
          className="ht-theme-main"
          thread={thread}
          open
          onOpenChange={(open) => {
            if (!open) {
              closeAfterInteractOutside();
            }
          }}
          onComposerSubmit={onComposerSubmit}
          onResolvedChange={(resolved) => {
            // Resolving hides the thread, so close the overlay immediately.
            if (resolved) {
              setOpenCell(null);
            }
          }}
          style={{ zIndex: 50 }}
          autoFocus
        >
          <div style={{ width: "100%", height: "100%" }} />
        </FloatingThread>
      ) : (
        <FloatingComposer
          className="ht-theme-main"
          metadata={metadata}
          open
          onOpenChange={(open) => {
            if (open) {
              setOpenCell(metadata);
            } else {
              closeAfterInteractOutside();
            }
          }}
          onComposerSubmit={onComposerSubmit}
          style={{ zIndex: 50 }}
        >
          <div style={{ width: "100%", height: "100%" }} />
        </FloatingComposer>
      )}
    </div>
  );
}

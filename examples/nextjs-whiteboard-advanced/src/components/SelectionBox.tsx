import { memo } from "react";
import styles from "./SelectionBox.module.css";
import { Layer, LayerType, Side, XYWH } from "../types";

type SelectionBoxProps = {
  selection: string[];
  layers: ReadonlyMap<string, Layer>;
  bounds: XYWH;
  onResizeHandlePointerDown: (corner: Side, initialBounds: XYWH) => void;
  isAnimated: boolean;
};

const HANDLE_WIDTH = 8;

const SelectionBox = memo(
  ({
    layers,
    bounds,
    onResizeHandlePointerDown,
    selection,
    isAnimated,
  }: SelectionBoxProps) => {
    const isShowingHandles =
      selection.length === 1 &&
      // Resize path is not supported
      layers.get(selection[0])?.type !== LayerType.Path;

    return (
      <>
        <rect
          className={styles.selection}
          style={{
            transition: isAnimated ? "all 120ms linear" : "",
            transform: `translate(${bounds.x}px, ${bounds.y}px)`,
          }}
          x={0}
          y={0}
          width={bounds.width}
          height={bounds.height}
        />
        {isShowingHandles && (
          <>
            <rect
              className={styles.selection_handle}
              x={0}
              y={0}
              style={{
                cursor: "nwse-resize",
                width: `${HANDLE_WIDTH}px`,
                height: `${HANDLE_WIDTH}px`,
                transition: isAnimated ? "all 120ms linear" : "",
                transform: `translate(${bounds.x - HANDLE_WIDTH / 2}px, ${
                  bounds.y - HANDLE_WIDTH / 2
                }px)`,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeHandlePointerDown(Side.Top + Side.Left, bounds);
              }}
            />
            <rect
              className={styles.selection_handle}
              x={0}
              y={0}
              style={{
                cursor: "ns-resize",
                width: `${HANDLE_WIDTH}px`,
                height: `${HANDLE_WIDTH}px`,
                transition: isAnimated ? "transform 120ms linear" : "",
                transform: `translate(${
                  bounds.x + bounds.width / 2 - HANDLE_WIDTH / 2
                }px, ${bounds.y - HANDLE_WIDTH / 2}px)`,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeHandlePointerDown(Side.Top, bounds);
              }}
            />
            <rect
              className={styles.selection_handle}
              x={0}
              y={0}
              style={{
                cursor: "nesw-resize",
                width: `${HANDLE_WIDTH}px`,
                height: `${HANDLE_WIDTH}px`,
                transition: isAnimated ? "transform 120ms linear" : "",
                transform: `translate(${
                  bounds.x - HANDLE_WIDTH / 2 + bounds.width
                }px, ${bounds.y - HANDLE_WIDTH / 2}px)`,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeHandlePointerDown(Side.Top + Side.Right, bounds);
              }}
            />
            <rect
              className={styles.selection_handle}
              x={0}
              y={0}
              style={{
                cursor: "ew-resize",
                width: `${HANDLE_WIDTH}px`,
                height: `${HANDLE_WIDTH}px`,
                transition: isAnimated ? "transform 120ms linear" : "",
                transform: `translate(${
                  bounds.x - HANDLE_WIDTH / 2 + bounds.width
                }px, ${bounds.y + bounds.height / 2 - HANDLE_WIDTH / 2}px)`,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeHandlePointerDown(Side.Right, bounds);
              }}
            />
            <rect
              className={styles.selection_handle}
              x={0}
              y={0}
              style={{
                cursor: "nwse-resize",
                width: `${HANDLE_WIDTH}px`,
                height: `${HANDLE_WIDTH}px`,
                transition: isAnimated ? "transform 120ms linear" : "",
                transform: `translate(${
                  bounds.x - HANDLE_WIDTH / 2 + bounds.width
                }px, ${bounds.y - HANDLE_WIDTH / 2 + bounds.height}px)`,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeHandlePointerDown(Side.Bottom + Side.Right, bounds);
              }}
            />
            <rect
              className={styles.selection_handle}
              x={0}
              y={0}
              style={{
                cursor: "ns-resize",
                width: `${HANDLE_WIDTH}px`,
                height: `${HANDLE_WIDTH}px`,
                transition: isAnimated ? "transform 120ms linear" : "",
                transform: `translate(${
                  bounds.x + bounds.width / 2 - HANDLE_WIDTH / 2
                }px, ${bounds.y - HANDLE_WIDTH / 2 + bounds.height}px)`,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeHandlePointerDown(Side.Bottom, bounds);
              }}
            />
            <rect
              className={styles.selection_handle}
              x={0}
              y={0}
              style={{
                cursor: "nesw-resize",
                width: `${HANDLE_WIDTH}px`,
                height: `${HANDLE_WIDTH}px`,
                transition: isAnimated ? "transform 120ms linear" : "",
                transform: `translate(${bounds.x - HANDLE_WIDTH / 2}px, ${
                  bounds.y - HANDLE_WIDTH / 2 + bounds.height
                }px)`,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeHandlePointerDown(Side.Bottom + Side.Left, bounds);
              }}
            />
            <rect
              className={styles.selection_handle}
              x={0}
              y={0}
              style={{
                cursor: "ew-resize",
                width: `${HANDLE_WIDTH}px`,
                height: `${HANDLE_WIDTH}px`,
                transition: isAnimated ? "transform 120ms linear" : "",
                transform: `translate(${bounds.x - HANDLE_WIDTH / 2}px, ${
                  bounds.y - HANDLE_WIDTH / 2 + bounds.height / 2
                }px)`,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeHandlePointerDown(Side.Left, bounds);
              }}
            />
          </>
        )}
      </>
    );
  }
);

export default SelectionBox;
